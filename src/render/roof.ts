import * as THREE from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * Where the air is indoors.
 *
 * Dust hangs in a room. It is what makes a shaft of light visible at all, and
 * the reason you can see one in a cathedral and not in the street outside is
 * not that the street has no air — it is that the street's air is swept and
 * the room's is not. A single medium applied everywhere gets this exactly
 * wrong in both directions at once: at the density that makes the nave read,
 * the Nativity façade from the plaza comes back as a white sheet, ninety
 * metres of lit outdoor air with an optical depth near one. Measured on that
 * frame, it did.
 *
 * So the volumetric pass asks a question before it scatters anything:
 * **is there something between this point and the sky?** That is one
 * orthographic render straight down, and it is worth doing rather than
 * approximating with a box because the answer is the building's stepped
 * section — thirty metres over the aisles, forty-five over the nave, sixty
 * over the crossing, seventy-five over the apse — and no box is that shape.
 * It also comes out right for free at the places a box would be worst: under
 * the terraces, inside the transept arms, in the ambulatory.
 *
 * The map is **closed** on the way out — dilated, then eroded by the same
 * radius — which is the one place it departs from the literal question. A
 * skylight is a hole in a roof and the room under it is still a room; left
 * alone, the funnels, which are precisely where the best shafts are, would be
 * the one part of the nave with no air in it. A plain dilation fixes that and
 * costs more than it is worth: it grows the top edge of every *wall* into an
 * eight-metre roof as well, and the air outside the nave's clerestory wall —
 * which is where you stand on the terraces — fills with haze. Measured on
 * that view, 7.6 % of the frame. A closing fills what is enclosed and puts
 * every edge back where it was, which is exactly the distinction wanted.
 *
 * It is also taken from *just above the highest vault* rather than from above
 * the whole model, and that one line is the difference between the towers
 * being a roof and not. A map that sees them records a hundred and seventy
 * metres of "indoors" over every tower footprint — which, looked up at from
 * the plaza, is most of the frame, and the first version brightened the
 * Nativity front by 2.6 % and the view from the terraces by **16 %** for
 * exactly that reason. Nothing above the vaults roofs a room, so the camera
 * is put where nothing above the vaults is in front of it.
 */

/** Big enough for the stepped section; the roofline is not high-frequency. */
const RESOLUTION = 1024
/** How far a hole in a roof may be and still have a room under it, metres. */
const CLOSE = 4
/**
 * Pieces that stand over open air rather than over a room, by the name the
 * field gives their meshes — see plan/shell.ts, where the porches are built.
 */
const OPEN_AIR = /^porch\b/

const HEIGHT_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uEye;

/** World height of whatever this texel saw, looking straight down. */
float heightAt( const in vec2 uv ) {
  // Orthographic, so depth is linear in distance and nothing has to be
  // un-projected. A texel that saw nothing reads 1.0 and lands on the far
  // plane, which is set below the plaza — so empty sky comes back as a
  // height under the ground, which is what "no roof" should mean.
  return uEye - ( uNear + texture2D( uDepth, uv ).x * ( uFar - uNear ) );
}

void main() {
  // Dilation: the first half of the closing.
  float best = -1e4;
  for ( int j = -2; j <= 2; j ++ ) {
    for ( int i = -2; i <= 2; i ++ ) {
      best = max( best, heightAt( vUv + vec2( float( i ), float( j ) ) * uTexel ) );
    }
  }
  gl_FragColor = vec4( best, 0.0, 0.0, 1.0 );
}
`

const ERODE_FRAGMENT = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uHeight;
uniform vec2 uTexel;

void main() {
  // Erosion by the same radius: the second half. Together they fill anything
  // enclosed and leave every edge where it was.
  float best = 1e4;
  for ( int j = -2; j <= 2; j ++ ) {
    for ( int i = -2; i <= 2; i ++ ) {
      best = min( best, texture2D( uHeight, vUv + vec2( float( i ), float( j ) ) * uTexel ).r );
    }
  }
  gl_FragColor = vec4( best, 0.0, 0.0, 1.0 );
}
`

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

export class RoofMap {
  /** World → this map's clip space, so a shader can look a point up. */
  readonly matrix = new THREE.Matrix4()
  /** Height of the lowest thing standing over each point of the plan. */
  readonly texture: THREE.Texture

  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly depthTarget: THREE.WebGLRenderTarget
  private readonly dilateTarget: THREE.WebGLRenderTarget
  private readonly heightTarget: THREE.WebGLRenderTarget
  private readonly depthMaterial: THREE.MeshBasicMaterial
  private readonly dilateMaterial: THREE.ShaderMaterial
  private readonly erodeMaterial: THREE.ShaderMaterial
  private readonly dilate: FullScreenQuad
  private readonly erode: FullScreenQuad
  private readonly bounds = new THREE.Box3(
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(20, 40, 20),
  )
  private ceiling = 40

  constructor() {
    const depthTexture = new THREE.DepthTexture(RESOLUTION, RESOLUTION)
    depthTexture.type = THREE.UnsignedIntType
    depthTexture.minFilter = THREE.NearestFilter
    depthTexture.magFilter = THREE.NearestFilter

    this.depthTarget = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
      depthTexture,
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
    })

    const heights = (): THREE.WebGLRenderTarget => {
      const target = new THREE.WebGLRenderTarget(RESOLUTION, RESOLUTION, {
        format: THREE.RedFormat,
        type: THREE.HalfFloatType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: false,
        generateMipmaps: false,
      })
      target.texture.colorSpace = THREE.NoColorSpace
      return target
    }
    this.dilateTarget = heights()
    this.heightTarget = heights()
    this.texture = this.heightTarget.texture

    this.depthMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      side: THREE.DoubleSide,
    })

    this.dilateMaterial = new THREE.ShaderMaterial({
      name: 'RoofDilate',
      uniforms: {
        uDepth: { value: depthTexture },
        uTexel: { value: new THREE.Vector2() },
        uNear: { value: 0.1 },
        uFar: { value: 100 },
        uEye: { value: 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: HEIGHT_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    this.dilate = new FullScreenQuad(this.dilateMaterial)

    this.erodeMaterial = new THREE.ShaderMaterial({
      name: 'RoofErode',
      uniforms: {
        uHeight: { value: this.dilateTarget.texture },
        uTexel: { value: new THREE.Vector2() },
      },
      vertexShader: VERTEX,
      fragmentShader: ERODE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    this.erode = new FullScreenQuad(this.erodeMaterial)
  }

  /**
   * @param box     what the model occupies, towers and all.
   * @param ceiling the highest thing that roofs a room — the tallest vault,
   *                not the tallest tower. The map is taken from just above
   *                it, so everything that only stands there is clipped away.
   */
  setBounds(box: THREE.Box3, ceiling: number): void {
    this.bounds.copy(box)
    this.ceiling = ceiling
  }

  /**
   * Re-read the roofline. Cheap, and only wanted when the geometry changes —
   * a roof does not move when the sun does.
   */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const { min, max } = this.bounds
    // A margin, so the plaza immediately outside the walls is in the map and
    // reads as open rather than falling off the edge of it.
    const margin = 8
    const eye = this.ceiling + margin
    const floor = min.y - margin

    this.camera.left = min.x - margin
    this.camera.right = max.x + margin
    this.camera.top = max.z + margin
    this.camera.bottom = min.z - margin
    this.camera.near = 0.1
    this.camera.far = eye - floor
    // Looking straight down. `up` is along −z so that the map's y axis runs
    // with the world's z, which keeps the lookup in the march a plain
    // multiply with no axis swap to get wrong.
    this.camera.position.set(0, eye, 0)
    this.camera.up.set(0, 0, -1)
    this.camera.lookAt(0, floor, 0)
    this.camera.updateMatrixWorld(true)
    this.camera.updateProjectionMatrix()

    const previousTarget = renderer.getRenderTarget()
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()
    scene.background = null

    // Opaque geometry only. Glass is vertical and roofs nothing.
    this.camera.layers.set(0)
    // And a porch roofs nothing either: it is a hood over a door, open on
    // three sides, and the air under it is the plaza's. Recorded as a room,
    // that air filled with lit dust the moment a low sun reached under the
    // hood — a bright dithered block on the Nativity front every evening,
    // and the only thing in the frame that was not stone or sky.
    const hidden: THREE.Object3D[] = []
    scene.traverse((node) => {
      if (node.visible && OPEN_AIR.test(node.name)) {
        node.visible = false
        hidden.push(node)
      }
    })
    scene.overrideMaterial = this.depthMaterial
    renderer.setRenderTarget(this.depthTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.render(scene, this.camera)
    for (const node of hidden) node.visible = true

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground

    const spanX = this.camera.right - this.camera.left
    const spanZ = this.camera.top - this.camera.bottom
    // The kernel reaches two texels each way, so a tap is half the radius.
    const step = new THREE.Vector2(CLOSE / 2 / spanX, CLOSE / 2 / spanZ)
    const u = this.dilateMaterial.uniforms
    u.uTexel!.value.copy(step)
    u.uNear!.value = this.camera.near
    u.uFar!.value = this.camera.far
    u.uEye!.value = eye
    this.erodeMaterial.uniforms.uTexel!.value.copy(step)

    renderer.setRenderTarget(this.dilateTarget)
    this.dilate.render(renderer)
    renderer.setRenderTarget(this.heightTarget)
    this.erode.render(renderer)

    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)

    this.matrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
  }

  dispose(): void {
    this.depthTarget.dispose()
    this.dilateTarget.dispose()
    this.heightTarget.dispose()
    this.depthMaterial.dispose()
    this.dilateMaterial.dispose()
    this.erodeMaterial.dispose()
    this.dilate.dispose()
    this.erode.dispose()
  }
}
