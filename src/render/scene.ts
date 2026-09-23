import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import {
  cityPatch,
  foliagePatch,
  cityUniforms,
  grainUniforms,
  groundMaterial,
  openQuarry,
  outdoorUniforms,
  pavingMaterial,
  roomUniforms,
  stonePatch,
  type GrainUniforms,
  type OutdoorUniforms,
  type Quarry,
  type RoomUniforms,
  type ShelterUniforms,
  type StoneName,
} from './materials.ts'
import { glassMaterial, type GlassMaterial } from '../geometry/glass.ts'
import { WashRig } from './washrig.ts'
import { LAYER_CITY, LAYER_GLASS, LAYER_SKYLINE, SunRig, patchForSunlight } from './sunrig.ts'
import { RoofMap } from './roof.ts'
import { FilmPass, type FilmLook } from './film.ts'
import { MeterPass } from './meter.ts'
import { ShaftPass, type ShaftSettings } from './shafts.ts'
import { SUN_DETAIL_LEVEL, type PassParticipant } from './field.ts'
import { Sky } from '../light/sky.ts'
import { EYE_HEIGHT } from '../camera/envelope.ts'
import { CANOPY_HEART, CANOPY_RADIUS, buildCity, defaultCity, type City } from '../plan/city.ts'
import { PAVING_PATCH, pavingUniforms, type PavingUniforms } from '../plan/floor.ts'

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sky: Sky
  sun: SunRig
  /** The glazing as a source: two static maps of what the windows throw. */
  wash: WashRig
  /**
   * Every stone the building is cut from — sandstone, granite, basalt,
   * porphyry, and the vault and wall dressings.
   */
  stones: Quarry
  glass: GlassMaterial
  /** Plaster that draws its own joints where it faces the sky. */
  paving: THREE.MeshStandardMaterial
  /** What the paving pattern is set out against. */
  pavingUniforms: PavingUniforms
  /** Colour and strength of the light the room lights itself with. */
  room: RoomUniforms
  /** Depth of the block-to-block variation in the stone. */
  grain: GrainUniforms
  /** How much of the sky the envelope is lit by. */
  outdoor: OutdoorUniforms
  /** The plaza the church stands in, at the foot of the podium. */
  ground: THREE.Mesh
  /** The Eixample around it, which is where the height comes from. */
  city: City
  figure: THREE.Mesh
  /** Stand-in for interreflection: warm from below, cool from above. */
  bounce: THREE.HemisphereLight
  /** What a camera held here would be exposed at — see render/meter.ts. */
  meter: MeterPass
  /** Unit vector toward the sun, in model space. */
  sunDirection: THREE.Vector3
  /**
   * Instanced fields, which have to choose a level of detail before each
   * pass. The sun looks at the model from somewhere the eye is not, so a
   * bucketing made for the camera would drop the very columns whose shadows
   * fall into view.
   */
  passes: PassParticipant[]
  /** Re-light for a new sun position. */
  setSun(direction: THREE.Vector3): void
  /**
   * Tell the rig the geometry changed, what it now occupies, and how high the
   * highest thing that roofs a room stands.
   */
  setModelBounds(box: THREE.Box3, ceiling: number): void
  /** Drop the plaza to the foot of the podium. */
  setGroundLevel(y: number): void
  /** Force the sun passes to re-run on the next frame. */
  invalidateSun(): void
  render(): void
  resize(width: number, height: number): void
  setExposure(value: number): void
  /** Strength and scale of the ambient occlusion term. */
  setOcclusion(options: { intensity: number; radius: number }): void
  /** Whether the second, camera-following shadow map is in use. */
  setSunNear(on: boolean): void
  /** How much lit air there is between the eye and the stone. */
  setShafts(options: ShaftSettings): void
  /**
   * The spill off things brighter than white.
   *
   * `threshold` is in multiples of white on the screen, at whatever the eye
   * is currently open to — so a value above 1 means "brighter than the
   * film's white point", ordinary sunlit stone is left alone, and only the
   * glazing and the sun spill.
   */
  setBloom(options: { strength: number; radius: number; threshold: number }): void
  /** The film the frame is finally seen through — see render/film.ts. */
  setLook(look: FilmLook): void
  /**
   * Device pixels per CSS pixel. Followed by a `resize`, because every
   * buffer in the chain is sized from it. The frame loop moves this to keep
   * the frame rate up — see `pace` in main.ts.
   */
  setPixelRatio(ratio: number): void
  readonly pixelRatio: number
  dispose(): void
}

/**
 * Turns one layer off for the passes that follow it, and on again after.
 *
 * The occlusion pass has to re-render the scene to get depth and normals, and
 * it renders whatever the camera can see — which includes the glass. Glass in
 * a depth buffer is an opaque wall: everything behind a window would be
 * occluded by it, and worse, the windows themselves would come back darkened
 * at their frames. They are the brightest thing in the building and the last
 * thing that should be shaded.
 *
 * Left out of the depth pass, the glass reads as infinitely far away, the
 * occlusion there comes out as one, and the windows pass through untouched.
 */
/**
 * The occlusion pass, run at half the frame's resolution.
 *
 * Ambient occlusion is a low-frequency quantity — it is how much sky a point
 * can see, and that does not change from one pixel to the next — so resolving
 * it per pixel spends the budget on detail nobody can find. At full size it
 * cost fourteen milliseconds of a twenty-two millisecond frame, which is the
 * whole budget for an effect that has no edges in it. Halved in each
 * direction it costs a quarter of that, and the denoise pass that follows it
 * would have blurred the difference away regardless.
 *
 * The frame was already known to be fill-bound rather than triangle-bound, so
 * this is the lever that was always going to work.
 */
class HalfResGTAO extends GTAOPass {
  override setSize(width: number, height: number): void {
    super.setSize(Math.max(1, Math.round(width / 2)), Math.max(1, Math.round(height / 2)))
  }
}

/**
 * The scene, drawn into a buffer of our own instead of the composer's.
 *
 * Three's stock render pass draws into whichever of the two ping-pong buffers
 * happens to be the read buffer that frame, and those buffers' depth is
 * scratch — it is cleared and reused by everything downstream, and it cannot
 * be sampled by a pass that is writing to the same buffer without WebGL
 * calling it a feedback loop. The volumetric pass needs the scene's depth,
 * so the scene is given somewhere private to stand and the pass that reads it
 * is the one that puts it into the chain.
 */
class ScenePass extends Pass {
  constructor(
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.Camera,
    private readonly target: THREE.WebGLRenderTarget,
  ) {
    super()
    // It writes nowhere the chain can see, so there is nothing to swap.
    this.needsSwap = false
  }

  override setSize(width: number, height: number): void {
    this.target.setSize(Math.max(1, width), Math.max(1, height))
  }

  override render(renderer: THREE.WebGLRenderer): void {
    renderer.setRenderTarget(this.target)
    renderer.clear(true, true, true)
    renderer.render(this.scene, this.camera)
  }
}

class LayerGate extends Pass {
  constructor(
    private readonly camera: THREE.Camera,
    private readonly layer: number,
    private readonly on: boolean,
  ) {
    super()
    this.needsSwap = false
  }

  render(): void {
    if (this.on) this.camera.layers.enable(this.layer)
    else this.camera.layers.disable(this.layer)
  }
}

export { EYE_HEIGHT }

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  // No tone mapping in the renderer: nothing draws to the screen except the
  // film pass at the end of the chain, and the curve is its business.
  renderer.toneMapping = THREE.NoToneMapping

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 4000)
  camera.position.set(6, 3.2, 8)
  // Glass is kept off the default layer so the sun rig can isolate it; the
  // viewer has to be told to look at it.
  camera.layers.enable(LAYER_GLASS)
  // The towers are kept off the default layer so the roof map can ignore
  // them; the viewer, obviously, cannot.
  camera.layers.enable(LAYER_SKYLINE)
  // The Eixample. Only the eye sees it — see LAYER_CITY in sunrig.ts.
  camera.layers.enable(LAYER_CITY)

  const sky = new Sky(renderer)
  // Three thousand, not two.
  //
  // The rig fits one orthographic map to the model and the ground its shadow
  // falls on, so the texel size is set by the largest thing built. Phase 3
  // finished at a 108 m radius and 10.5 cm to the texel; the towers take the
  // fit to 180 m, and at 2048 that is 17.6 cm — every shadow in the building
  // coarsened by two thirds to pay for eighteen objects nobody is standing
  // next to. 3072 puts it back to 11.7 cm on the seven curated suns the
  // interior was tuned against, and never more than a fifth off the old
  // figure on any of the thirteen — the worst is a low June sun, where the
  // ground shadow balloons and 16.3 cm becomes 19.7. Cascades are the real
  // answer and remain a phase 5 problem; this is the one number that buys
  // most of the same thing today.
  const sun = new SunRig(3072)

  // Every opaque surface receives the coloured sun the same way, whatever it
  // is cut from — the patch is about how sunlight arrives, not about albedo.
  const stones = openQuarry()
  const room = roomUniforms()
  const grain = grainUniforms()
  const outdoor = outdoorUniforms()
  const wash = new WashRig()
  // Where the air is indoors — see roof.ts. Only the geometry moves it, so
  // it is re-read on a rebuild and not on a new hour. The stones read it too,
  // to learn which side of the wall they are on.
  const roof = new RoofMap()
  const shelter: ShelterUniforms = {
    uRoofMatrix: { value: roof.matrix },
    uRoofHeight: { value: roof.texture },
  }
  for (const [name, material] of Object.entries(stones)) {
    patchForSunlight(
      material,
      sun.uniforms,
      stonePatch(name as StoneName, grain, room, wash.uniforms, outdoor, shelter),
    )
  }
  // Out past the city rather than stopping short of it. At 320 m the disc's
  // own edge was a hard line across the middle distance in every exterior
  // frame; the grid now reaches 670 m, and the ground has to get past it or
  // the blocks stand on nothing.
  const ground = new THREE.Mesh(new THREE.CircleGeometry(1800, 96), groundMaterial())
  // Named, so the pass that asks how much floor a soffit can see knows to
  // leave it out — see UNDERFOOT in render/washrig.ts. A camera under the
  // building looking up meets the plaza before it meets the building.
  ground.name = 'plaza'
  patchForSunlight(ground.material as THREE.MeshStandardMaterial, sun.uniforms)

  // The pavement is stone with one extra job: it knows where it is standing,
  // so it can draw the building's own grid on itself.
  const paving = pavingMaterial()
  const pavingU = pavingUniforms()
  // The room's own uniforms ride along, so the floor is lit by the same
  // indoor fill as the stone standing on it.
  patchForSunlight(paving, sun.uniforms, {
    ...PAVING_PATCH,
    uniforms: { ...pavingU, ...room },
  })

  const glass = glassMaterial()

  // An environment probe lights an interior as if the walls were not there,
  // and what it pours in is sky, so unlit plaster goes blue. Real bounce
  // comes off warm plaster and a warm floor. Until phase 2 brings occlusion
  // this hemisphere is the stand-in, and it is doing an honest job: warm from
  // below, cool from above, which is the shape interreflection actually has.
  // Warm from below, cool from above, which is the shape interreflection
  // actually has in a room whose floor is polished sandstone. Both ends are
  // warmer than the first pass allowed: the room this stands in is lined with
  // honey-coloured stone on every side, so even the light coming down has
  // bounced off something warm before it arrives.
  const bounce = new THREE.HemisphereLight(0xf0e3cc, 0xffc98f, 0.42)
  scene.add(bounce)

  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  /**
   * The city, and the one number in it that is not scenery.
   *
   * Its haze colour is taken from the sky's own horizon rather than picked,
   * so distant blocks fade toward exactly what is behind them and the far
   * edge of the grid has no edge. Everything else about it is in plan/city.ts.
   *
   * It takes the sun the way the ground does — the patch is about how
   * sunlight arrives, not about albedo — and `vertexColors` is what carries
   * the hundred different renders and terracotta roofs on one draw call.
   */
  const cityMassing = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.93,
    metalness: 0,
  })
  const cityFill = cityUniforms()
  patchForSunlight(cityMassing, sun.uniforms, cityPatch(cityFill))
  /**
   * The leaves, which are the same material with a hole-punch in it.
   *
   * `alphaTest` rather than transparency: an alpha-tested fragment either
   * exists or does not, so there is no sorting to get wrong between two
   * hundred crossed quads, and the pass that writes depth writes the shape
   * of the leaf. Double-sided because the back of a quad is the same leaves
   * seen from behind, and a tree lit only from one side is a cardboard cut
   * out — which is what the icosahedron was.
   */
  const cityFoliage = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.86,
    metalness: 0,
    side: THREE.DoubleSide,
    alphaTest: 0.5,
  })
  patchForSunlight(cityFoliage, sun.uniforms, foliagePatch(cityFill, CANOPY_HEART, CANOPY_RADIUS))

  /**
   * The pond in Plaça de Gaudí, which is a mirror and was a grey disc.
   *
   * Every photograph taken from that corner has the whole front upside down
   * in the water, and it is half of why that is the view everybody takes. A
   * little metalness is what makes a standard material read the environment
   * probe as a reflection rather than as more ambient — and the probe here
   * is the sky, which is what the water is mostly reflecting anyway.
   */
  const cityWater = new THREE.MeshStandardMaterial({
    color: 0x53687c,
    roughness: 0.05,
    metalness: 0.55,
  })
  patchForSunlight(cityWater, sun.uniforms, cityPatch(cityFill))
  const city = buildCity(
    defaultCity,
    { massing: cityMassing, foliage: cityFoliage, water: cityWater },
    new THREE.Color().setRGB(0.52, 0.66, 0.9).convertSRGBToLinear(),
  )
  city.group.traverse((node) => {
    node.layers.set(LAYER_CITY)
  })
  scene.add(city.group)

  // 1.65 m scale reference. Nothing about a cathedral reads correctly without
  // a body in the frame.
  const figure = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, EYE_HEIGHT - 0.44, 6, 20),
    stones.wall,
  )
  figure.position.set(2.6, EYE_HEIGHT / 2, 2.2)
  scene.add(figure)

  const sunDirection = new THREE.Vector3(0, 1, 0).normalize()
  const passes: PassParticipant[] = []
  const drawingBuffer = new THREE.Vector2()
  let dirty = true
  let roofDirty = true

  function setSun(direction: THREE.Vector3): void {
    sunDirection.copy(direction).normalize()
    const state = sky.update(renderer, sunDirection)
    scene.background = sky.background
    scene.environment = sky.environment
    /**
     * Air, and only over the city.
     *
     * Half a kilometre of Eixample drawn at full contrast to the far edge is
     * a diorama: the grid reads as a painted floor with the horizon sitting
     * on top of it, because in the world there is nothing at 600 m that is
     * as sharp as something at 60 m. Linear fog starting well past the
     * building gives back the one cue that was missing, and starting it at
     * 240 m means the church — 124 m end to end, and never further than
     * about 200 m from any stop on the visit — is never touched by it. The
     * interior cannot reach it at all.
     *
     * The colour is the sky's own horizon, so the far edge of the grid does
     * not end: it arrives at exactly what is behind it, at whatever hour.
     */
    if (!scene.fog) scene.fog = new THREE.Fog(0x000000, 240, 1750)
    ;(scene.fog as THREE.Fog).color.copy(state.hazeColor)
    sun.uniforms.uSunRadiance.value
      .copy(state.sunColor)
      .multiplyScalar(state.sunIntensity)
    glass.uniforms.uSunDirection.value.copy(sunDirection)
    // The one part of the glazing's rig that the hour moves — see
    // WASH_SHADE. No map is rebuilt; only the weight on each of the four.
    wash.setSun(sunDirection)
    dirty = true
  }

  setSun(sunDirection)

  // Ambient occlusion, and it is not a garnish here.
  //
  // Everything structural is one white Lambertian plaster under a nearly
  // uniform sky probe, so a surface's brightness barely depends on which way
  // it faces — and the inside of a twenty-metre funnel comes back exactly as
  // bright as the outside of it. Measured on a frame looking up the nave, the
  // vault is a sixth of the picture and reads as one flat value; the eye has
  // nothing to separate the near canopy from the far. What is missing is the
  // one term a white maquette cannot do without, which is how much sky each
  // point can actually see.
  //
  // It costs a second pass over the geometry for depth and normals. At two
  // million triangles that is affordable, and nothing else available buys as
  // much form per millisecond.
  // The composer's own buffer, given a depth texture, because the volumetric
  // pass needs to know where the stone is and a second geometry pass to find
  // out would cost more than the effect.
  //
  // Both ping-pong buffers are made to share the one depth texture on
  // purpose. The render pass draws into whichever of the two is the read
  // buffer at that moment, and which one that is alternates with the number
  // of swapping passes in the chain — so a depth texture attached to only one
  // of them holds the scene on even frames and last frame's on odd ones.
  const sceneDepth = new THREE.DepthTexture(1, 1)
  sceneDepth.type = THREE.UnsignedIntType
  sceneDepth.minFilter = THREE.NearestFilter
  sceneDepth.magFilter = THREE.NearestFilter
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture: sceneDepth,
  })
  sceneTarget.texture.name = 'Stage.scene'

  const composer = new EffectComposer(renderer)
  composer.addPass(new ScenePass(scene, camera, sceneTarget))
  // The pass that reads that buffer is the one that puts it into the chain.
  const shafts = new ShaftPass(camera, sun.uniforms, roof, sceneTarget)
  composer.addPass(shafts)
  composer.addPass(new LayerGate(camera, LAYER_GLASS, false))
  const occlusion = new HalfResGTAO(scene, camera, 1, 1)
  /** What the panel asked for, and what the distance scaling last applied. */
  let occlusionRadius = 3
  let occlusionApplied = 3
  const modelSphere = new THREE.Sphere(new THREE.Vector3(), 100)
  // Radius is in metres, because the scene is. The default is a quarter of
  // one, which is tuned for a scene the size of a chair and finds nothing at
  // all in a cathedral.
  occlusion.updateGtaoMaterial({
    radius: 3,
    distanceExponent: 1,
    thickness: 1,
    scale: 1,
    samples: 12,
    screenSpaceRadius: false,
  })
  composer.addPass(occlusion)
  composer.addPass(new LayerGate(camera, LAYER_GLASS, true))

  // Metered here: the scene, its air and its occlusion, and nothing the
  // exposure itself goes on to decide — the bloom's threshold is in the
  // film's units, so metering after it would be metering the meter.
  const meter = new MeterPass()
  composer.addPass(meter)

  // Bloom.
  //
  // Not a garnish, and not a filter over the top: it is the one thing every
  // photograph of this interior has that the model had no way to produce. A
  // lit window a hundred times brighter than the stone beside it does not
  // stop at its own frame — it spills, in the air, in the lens, and in the
  // eye — and that spill is what "full of light" actually looks like. Without
  // it a window is a bright rectangle with a hard edge, which is what a
  // window looks like in a rendering and never in a room.
  //
  // The threshold is the whole design. It sits above the tone mapper's white
  // point, so ordinary sunlit stone does not bloom at all and only things
  // that are genuinely brighter than white — the glazing, the sun disc, the
  // shafts — are allowed to spill. That keeps it from becoming the haze that
  // bloom usually is.
  const bloom = new UnrealBloomPass(drawingBuffer.clone(), 0.62, 0.72, 1.05)
  composer.addPass(bloom)
  const film = new FilmPass()
  composer.addPass(film)
  // The bloom threshold is kept in the film's units — multiples of white on
  // the screen — and turned into the buffer's own units by whatever the eye
  // is currently open to. Kept in the buffer's units it was one number for
  // two exposures a stop apart, and outdoors, where the pupil is closed
  // down, sunlit stone that was well under white on screen was still over
  // the buffer's threshold and haloed every tower against the sky.
  let bloomWhite = 1.75
  const holdBloom = (): void => {
    bloom.threshold = bloomWhite / Math.max(film.exposure, 1e-3)
  }

  return {
    renderer,
    scene,
    camera,
    sky,
    sun,
    stones,
    glass,
    paving,
    pavingUniforms: pavingU,
    room,
    grain,
    outdoor,
    ground,
    city,
    figure,
    bounce,
    meter,
    sunDirection,
    passes,
    setSun,
    wash,
    setModelBounds(box, ceiling) {
      box.getBoundingSphere(modelSphere)
      sun.setBounds(box)
      roof.setBounds(box, ceiling)
      box.getCenter(glass.uniforms.uCentre.value)
      // The glazing's own rig does not care where the sun is, only where the
      // glass is — so it runs on a rebuild and on nothing else.
      wash.setBounds(box, ceiling)
      wash.invalidate()
      dirty = true
      roofDirty = true
    },
    invalidateSun() {
      dirty = true
    },
    render() {
      // The building does not move, so the two sun passes only run when the
      // sun or the geometry has actually changed. Everything else is a plain
      // forward render.
      if (dirty || roofDirty) {
        for (const participant of passes) participant.prepareForSun(SUN_DETAIL_LEVEL)
        if (roofDirty) {
          roof.render(renderer, scene)
          roofDirty = false
        }
        if (dirty) {
          const radiance = sun.uniforms.uSunRadiance.value
          sun.render(renderer, scene, camera, sunDirection, radiance)
          dirty = false
        }
      }
      if (wash.stale) {
        for (const participant of passes) participant.prepareForSun(SUN_DETAIL_LEVEL)
        wash.render(renderer, scene)
      }
      // The near shadow map follows the camera, so it is the one sun pass
      // that can be made stale by walking. Re-run under the same coarse level
      // of detail the other two use, and only once the camera has left the
      // middle of it — about every twenty seconds of walking, against every
      // frame of a drag of the hour slider, which the rig already carried.
      if (sun.nearStale(camera.position)) {
        for (const participant of passes) participant.prepareForSun(SUN_DETAIL_LEVEL)
        sun.renderNear(renderer, scene, camera.position)
      }
      // The level-of-detail switch is angular, so it needs to know how many
      // device pixels the frame is tall — not how many CSS ones.
      renderer.getDrawingBufferSize(drawingBuffer)
      for (const participant of passes) participant.prepareForView(camera, drawingBuffer.y)
      sun.syncView(camera)

      /**
       * The occlusion radius follows the camera back.
       *
       * Three metres is the right figure for a person standing in the nave —
       * it is the depth of a flute, the throat of a funnel, the gap between
       * two columns — and it is nothing at all from the far side of the
       * plaza, where three metres is four pixels and the pass may as well be
       * off. The features that want occluding out there are the fifteen
       * metres between two bell towers and the seven-metre cave of a portal.
       *
       * A screen-space pass has one radius for the whole frame, so the
       * honest thing is to scale it with how far back the frame is taken
       * from: near the building it stays where the interior needs it, and
       * from two hundred metres it opens out to something that can see a
       * gap between towers. Capped, because past a point the half-resolution
       * pass is sampling noise.
       */
      const away = Math.max(0, camera.position.distanceTo(modelSphere.center) - modelSphere.radius)
      const want = Math.min(24, occlusionRadius * (1 + away * 0.06))
      if (Math.abs(want - occlusionApplied) > 0.15) {
        occlusionApplied = want
        occlusion.updateGtaoMaterial({ radius: want })
      }
      composer.render()
    },
    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(width, height)
    },
    setExposure(value) {
      film.exposure = value
      holdBloom()
    },
    setLook(look) {
      Object.assign(film.look, look)
    },
    setPixelRatio(ratio) {
      renderer.setPixelRatio(ratio)
    },
    get pixelRatio() {
      return renderer.getPixelRatio()
    },
    setGroundLevel(y) {
      // The plaza sits at the foot of the podium, so the church stands on
      // something rather than being pushed into the ground.
      ground.position.y = y
      // And the city stands on the same plaza, not on nothing.
      city.group.position.y = y
    },
    setOcclusion({ intensity, radius }) {
      occlusion.enabled = intensity > 0
      occlusion.blendIntensity = intensity
      occlusionRadius = radius
      occlusion.updateGtaoMaterial({ radius })
    },
    setSunNear(on) {
      sun.nearEnabled = on
    },
    setBloom({ strength, radius, threshold }) {
      bloom.strength = strength
      bloom.radius = radius
      bloomWhite = threshold
      holdBloom()
    },
    setShafts(options) {
      // Never disabled: this pass is what puts the scene into the chain.
      Object.assign(shafts.settings, options)
    },
    dispose() {
      sky.dispose()
      sun.dispose()
      shafts.dispose()
      bloom.dispose()
      meter.dispose()
      film.dispose()
      roof.dispose()
      sceneTarget.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
