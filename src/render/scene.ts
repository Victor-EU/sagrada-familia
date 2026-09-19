import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { groundMaterial, pavingMaterial, plasterMaterial } from './materials.ts'
import { glassMaterial, type GlassMaterial } from '../geometry/glass.ts'
import { LAYER_GLASS, SunRig, patchForSunlight } from './sunrig.ts'
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
  /** One material for everything structural — the point of a plaster maquette. */
  plaster: THREE.MeshStandardMaterial
  glass: GlassMaterial
  /** Plaster that draws its own joints where it faces the sky. */
  paving: THREE.MeshStandardMaterial
  /** What the paving pattern is set out against. */
  pavingUniforms: PavingUniforms
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
  /** Tell the rig the geometry changed, and what it now occupies. */
  setModelBounds(box: THREE.Box3): void
  /** Drop the plaza to the foot of the podium. */
  setGroundLevel(y: number): void
  /** Force the sun passes to re-run on the next frame. */
  invalidateSun(): void
  render(): void
  resize(width: number, height: number): void
  setExposure(value: number): void
  /** Strength and scale of the ambient occlusion term. */
  setOcclusion(options: { intensity: number; radius: number }): void
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

  const sky = new Sky(renderer)
  const sun = new SunRig(2048)

  // Every opaque surface is the same plaster, and every one of them receives
  // the coloured sun the same way.
  const plaster = plasterMaterial()
  const ground = new THREE.Mesh(new THREE.CircleGeometry(320, 128), groundMaterial())
  patchForSunlight(plaster, sun.uniforms)
  patchForSunlight(ground.material as THREE.MeshStandardMaterial, sun.uniforms)

  // The pavement is the same plaster with one extra job: it knows where it is
  // standing, so it can draw the building's own grid on itself.
  const paving = pavingMaterial()
  const pavingU = pavingUniforms()
  patchForSunlight(paving, sun.uniforms, { ...PAVING_PATCH, uniforms: pavingU })

  const glass = glassMaterial()

  // An environment probe lights an interior as if the walls were not there,
  // and what it pours in is sky, so unlit plaster goes blue. Real bounce
  // comes off warm plaster and a warm floor. Until phase 2 brings occlusion
  // this hemisphere is the stand-in, and it is doing an honest job: warm from
  // below, cool from above, which is the shape interreflection actually has.
  const bounce = new THREE.HemisphereLight(0xe8e4de, 0xffd4a0, 0.42)
  scene.add(bounce)

  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  // 1.65 m scale reference. Nothing about a cathedral reads correctly without
  // a body in the frame.
  const figure = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, EYE_HEIGHT - 0.44, 6, 20),
    plaster,
  )
  figure.position.set(2.6, EYE_HEIGHT / 2, 2.2)
  scene.add(figure)

  const sunDirection = new THREE.Vector3(0, 1, 0).normalize()
  const passes: PassParticipant[] = []
  const drawingBuffer = new THREE.Vector2()
  let dirty = true

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
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
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
  composer.addPass(new OutputPass())

  return {
    renderer,
    scene,
    camera,
    sky,
    sun,
    plaster,
    glass,
    paving,
    pavingUniforms: pavingU,
    ground,
    figure,
    bounce,
    sunDirection,
    passes,
    setSun,
    setModelBounds(box) {
      sun.setBounds(box)
      dirty = true
    },
    invalidateSun() {
      dirty = true
    },
    render() {
      // The building does not move, so the two sun passes only run when the
      // sun or the geometry has actually changed. Everything else is a plain
      // forward render.
      if (dirty) {
        for (const participant of passes) participant.prepareForSun(SUN_DETAIL_LEVEL)
        const radiance = sun.uniforms.uSunRadiance.value
        sun.render(renderer, scene, camera, sunDirection, radiance)
        dirty = false
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
    dispose() {
      sky.dispose()
      sun.dispose()
      composer.dispose()
      renderer.dispose()
    },
  }
}
