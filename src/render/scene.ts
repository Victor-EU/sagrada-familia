import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import {
  grainUniforms,
  groundMaterial,
  openQuarry,
  pavingMaterial,
  roomUniforms,
  stonePatch,
  type GrainUniforms,
  type Quarry,
  type RoomUniforms,
  type StoneName,
} from './materials.ts'
import { glassMaterial, type GlassMaterial } from '../geometry/glass.ts'
import { LAYER_GLASS, LAYER_SKYLINE, SunRig, patchForSunlight } from './sunrig.ts'
import { RoofMap } from './roof.ts'
import { ShaftPass, type ShaftSettings } from './shafts.ts'
import { SUN_DETAIL_LEVEL, type PassParticipant } from './field.ts'
import { Sky } from '../light/sky.ts'
import { EYE_HEIGHT } from '../camera/envelope.ts'
import { PAVING_PATCH, pavingUniforms, type PavingUniforms } from '../plan/floor.ts'

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sky: Sky
  sun: SunRig
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
  /** The plaza the church stands in, at the foot of the podium. */
  ground: THREE.Mesh
  figure: THREE.Mesh
  /** Stand-in for interreflection: warm from below, cool from above. */
  bounce: THREE.HemisphereLight
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
   * `threshold` is in the scene's own linear units, so a value above 1 means
   * "brighter than the tone mapper's white point" — ordinary sunlit stone is
   * left alone and only the glazing and the sun spill.
   */
  setBloom(options: { strength: number; radius: number; threshold: number }): void
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1

  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 4000)
  camera.position.set(6, 3.2, 8)
  // Glass is kept off the default layer so the sun rig can isolate it; the
  // viewer has to be told to look at it.
  camera.layers.enable(LAYER_GLASS)
  // The towers are kept off the default layer so the roof map can ignore
  // them; the viewer, obviously, cannot.
  camera.layers.enable(LAYER_SKYLINE)

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
  for (const [name, material] of Object.entries(stones)) {
    patchForSunlight(material, sun.uniforms, stonePatch(name as StoneName, grain, room))
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(320, 128), groundMaterial())
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
    sun.uniforms.uSunRadiance.value
      .copy(state.sunColor)
      .multiplyScalar(state.sunIntensity)
    glass.uniforms.uSunDirection.value.copy(sunDirection)
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

  // Where the air is indoors — see roof.ts. Only the geometry moves it, so
  // it is re-read on a rebuild and not on a new hour.
  const roof = new RoofMap()

  const composer = new EffectComposer(renderer)
  composer.addPass(new ScenePass(scene, camera, sceneTarget))
  // The pass that reads that buffer is the one that puts it into the chain.
  const shafts = new ShaftPass(camera, sun.uniforms, roof, sceneTarget)
  composer.addPass(shafts)
  composer.addPass(new LayerGate(camera, LAYER_GLASS, false))
  const occlusion = new HalfResGTAO(scene, camera, 1, 1)
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
  composer.addPass(new OutputPass())

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
    ground,
    figure,
    bounce,
    sunDirection,
    passes,
    setSun,
    setModelBounds(box, ceiling) {
      sun.setBounds(box)
      roof.setBounds(box, ceiling)
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
      renderer.toneMappingExposure = value
    },
    setGroundLevel(y) {
      // The plaza sits at the foot of the podium, so the church stands on
      // something rather than being pushed into the ground.
      ground.position.y = y
    },
    setOcclusion({ intensity, radius }) {
      occlusion.enabled = intensity > 0
      occlusion.blendIntensity = intensity
      occlusion.updateGtaoMaterial({ radius })
    },
    setSunNear(on) {
      sun.nearEnabled = on
    },
    setBloom({ strength, radius, threshold }) {
      bloom.strength = strength
      bloom.radius = radius
      bloom.threshold = threshold
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
      roof.dispose()
      sceneTarget.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
