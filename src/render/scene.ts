import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { groundMaterial, plasterMaterial } from './materials.ts'

export interface Stage {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sun: THREE.DirectionalLight
  ground: THREE.Mesh
  figure: THREE.Mesh
  resize(width: number, height: number): void
  setExposure(value: number): void
  dispose(): void
}

/** Eye height used for walk mode, and the height of the scale figure. */
export const EYE_HEIGHT = 1.65

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1b1b20)

  // Soft studio ambient — a plaster study model on a table, which is exactly
  // the aesthetic the doc argues for. Stands in until the real sky and
  // transmittance model arrive in phase 1.
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.9
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 2000)
  camera.position.set(6, 3.2, 8)

  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6)
  sun.position.set(-7, 11, 5)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 60
  sun.shadow.camera.left = -18
  sun.shadow.camera.right = 18
  sun.shadow.camera.top = 18
  sun.shadow.camera.bottom = -18
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  scene.add(sun)

  // Cool sky against the warm key — the cheap half of making white read as form.
  scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x6d6355, 0.55))

  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 96), groundMaterial())
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  // 1.65 m scale reference. Nothing about a cathedral reads correctly without
  // a body in the frame.
  const figure = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, EYE_HEIGHT - 0.44, 6, 20),
    plasterMaterial(),
  )
  figure.position.set(2.6, EYE_HEIGHT / 2, 2.2)
  figure.castShadow = true
  scene.add(figure)

  return {
    renderer,
    scene,
    camera,
    sun,
    ground,
    figure,
    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    },
    setExposure(value) {
      renderer.toneMappingExposure = value
    },
    dispose() {
      envRT.dispose()
      renderer.dispose()
    },
  }
}
