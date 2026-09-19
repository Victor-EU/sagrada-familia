import * as THREE from 'three'
import { groundMaterial, plasterMaterial } from './materials.ts'
import { glassMaterial, type GlassMaterial } from '../geometry/glass.ts'
import { LAYER_GLASS, SunRig, patchForSunlight } from './sunrig.ts'
import { Sky } from '../light/sky.ts'
import { EYE_HEIGHT } from '../camera/envelope.ts'

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sky: Sky
  sun: SunRig
  /** One material for everything structural — the point of a plaster maquette. */
  plaster: THREE.MeshStandardMaterial
  glass: GlassMaterial
  ground: THREE.Mesh
  figure: THREE.Mesh
  /** Stand-in for interreflection: warm from below, cool from above. */
  bounce: THREE.HemisphereLight
  /** Unit vector toward the sun, in model space. */
  sunDirection: THREE.Vector3
  /** Re-light for a new sun position. */
  setSun(direction: THREE.Vector3): void
  /** Tell the rig the geometry changed, and what it now occupies. */
  setModelBounds(box: THREE.Box3): void
  /** Force the sun passes to re-run on the next frame. */
  invalidateSun(): void
  render(): void
  resize(width: number, height: number): void
  setExposure(value: number): void
  dispose(): void
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
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 96), groundMaterial())
  patchForSunlight(plaster, sun.uniforms)
  patchForSunlight(ground.material as THREE.MeshStandardMaterial, sun.uniforms)

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

  return {
    renderer,
    scene,
    camera,
    sky,
    sun,
    plaster,
    glass,
    ground,
    figure,
    bounce,
    sunDirection,
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
        const radiance = sun.uniforms.uSunRadiance.value
        sun.render(renderer, scene, camera, sunDirection, radiance)
        dirty = false
      }
      sun.syncView(camera)
      renderer.render(scene, camera)
    },
    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    },
    setExposure(value) {
      renderer.toneMappingExposure = value
    },
    dispose() {
      sky.dispose()
      sun.dispose()
      renderer.dispose()
    },
  }
}
