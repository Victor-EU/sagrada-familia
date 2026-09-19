import * as THREE from 'three'
import { transmittanceMaterial } from '../geometry/glass.ts'

/**
 * Sunlight that remembers what it passed through.
 *
 * A shadow map answers one bit: did the sun reach this point. That is enough
 * for a building made of stone and wrong for a building made of glass. What
 * the interior of Sagrada Família actually does is tint the light — a shaft
 * arrives green because it came through green glass, and the plaster it lands
 * on is green in that one patch and white six metres away.
 *
 * So the rig renders the sun's view twice:
 *
 *  1. **occlusion** — opaque geometry only, into a depth texture. The window
 *     openings contain no opaque geometry, so the sun passes them freely.
 *  2. **transmittance** — glass only, into an RGB target cleared to white.
 *     Nearest pane wins, so a window on the far wall cannot tint light that
 *     entered through the near one.
 *
 * A receiving surface multiplies the two. One extra render target buys
 * unlimited coloured windows, and nothing in the material needs to know how
 * many there are.
 *
 * Glass lives on its own layer, which is what keeps the two passes honest: the
 * occlusion camera cannot see it and the transmittance camera can see nothing
 * else.
 */
export const LAYER_GLASS = 1

export interface SunUniforms {
  uSunMatrix: { value: THREE.Matrix4 }
  uSunDepth: { value: THREE.Texture | null }
  uSunTransmit: { value: THREE.Texture | null }
  uSunGlassDepth: { value: THREE.Texture | null }
  uSunDirView: { value: THREE.Vector3 }
  uSunDirWorld: { value: THREE.Vector3 }
  uSunRadiance: { value: THREE.Color }
  uSunTexel: { value: THREE.Vector2 }
  uSunOffset: { value: number }
}

export class SunRig {
  readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  readonly uniforms: SunUniforms
  private readonly depthTarget: THREE.WebGLRenderTarget
  private readonly colorTarget: THREE.WebGLRenderTarget
  private readonly depthMaterial: THREE.MeshBasicMaterial
  private readonly transmitMaterial: THREE.MeshBasicMaterial
  private readonly bounds = new THREE.Box3(
    new THREE.Vector3(-20, 0, -20),
    new THREE.Vector3(20, 40, 20),
  )
  private readonly centre = new THREE.Vector3()
  private radius = 30

  /** Depth-bias distance in metres, scaled by slope at the receiver. */
  offset = 0.06

  constructor(resolution = 2048) {
    const depthTexture = new THREE.DepthTexture(resolution, resolution)
    depthTexture.type = THREE.UnsignedIntType
    depthTexture.minFilter = THREE.NearestFilter
    depthTexture.magFilter = THREE.NearestFilter

    this.depthTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      depthTexture,
      // The colour attachment is never read; the depth texture is the payload.
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
    })

    // The glass pass keeps its own depth, and the receiver checks it. Without
    // that check a surface picks up the colour of any pane sharing its texel,
    // including panes behind it — which paints the sunlit outside of a wall
    // with the colour of the window on the far side of the building.
    const glassDepth = new THREE.DepthTexture(resolution, resolution)
    glassDepth.type = THREE.UnsignedIntType
    glassDepth.minFilter = THREE.NearestFilter
    glassDepth.magFilter = THREE.NearestFilter

    this.colorTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthTexture: glassDepth,
    })
    this.colorTarget.texture.colorSpace = THREE.NoColorSpace

    this.depthMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      side: THREE.DoubleSide,
    })
    this.transmitMaterial = transmittanceMaterial()

    this.uniforms = {
      uSunMatrix: { value: new THREE.Matrix4() },
      uSunDepth: { value: depthTexture },
      uSunTransmit: { value: this.colorTarget.texture },
      uSunGlassDepth: { value: glassDepth },
      uSunDirView: { value: new THREE.Vector3(0, 1, 0) },
      uSunDirWorld: { value: new THREE.Vector3(0, 1, 0) },
      uSunRadiance: { value: new THREE.Color(0, 0, 0) },
      uSunTexel: { value: new THREE.Vector2(1 / resolution, 1 / resolution) },
      uSunOffset: { value: this.offset },
    }
  }

  /**
   * Aim the rig at what is actually built.
   *
   * Fitting to the model rather than to the scene keeps the ground plane — a
   * 120 m disc that nothing casts onto usefully — from stealing the whole
   * depth map's resolution.
   */
  setBounds(box: THREE.Box3): void {
    this.bounds.copy(box)
  }

  /**
   * The frustum has to cover the model *and* the floor its shadow lands on,
   * so the model's corners are projected down the sun direction onto the
   * ground and folded into the fit.
   *
   * The projection is capped at three diagonals. Past that the sun is so low
   * that a single orthographic map cannot hold both ends of the shadow at a
   * useful resolution, and cascades are a phase 2 problem.
   */
  private fitTo(sunDirection: THREE.Vector3): void {
    const points: THREE.Vector3[] = []
    const { min, max } = this.bounds
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) points.push(new THREE.Vector3(x, y, z))
      }
    }

    const diagonal = this.bounds.getSize(new THREE.Vector3()).length()
    const altitude = Math.max(sunDirection.y, 0.08)
    for (const corner of points.slice()) {
      const drop = Math.min(corner.y / altitude, 3 * diagonal)
      points.push(
        new THREE.Vector3(
          corner.x - sunDirection.x * drop,
          0,
          corner.z - sunDirection.z * drop,
        ),
      )
    }

    const sphere = new THREE.Sphere().setFromPoints(points)
    this.centre.copy(sphere.center)
    this.radius = Math.max(sphere.radius, 1) * 1.02
  }

  /**
   * Run both passes. Cheap enough to call on any change, far too expensive to
   * call every frame for a building that does not move.
   */
  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    view: THREE.Camera,
    sunDirection: THREE.Vector3,
    radiance: THREE.Color,
  ): void {
    this.fitTo(sunDirection)
    const r = this.radius
    this.camera.left = -r
    this.camera.right = r
    this.camera.top = r
    this.camera.bottom = -r
    this.camera.near = 0.1
    this.camera.far = 4 * r
    this.camera.position.copy(this.centre).addScaledVector(sunDirection, 2 * r)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(this.centre)
    this.camera.updateMatrixWorld(true)
    this.camera.updateProjectionMatrix()

    const previousTarget = renderer.getRenderTarget()
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    scene.background = null

    this.camera.layers.set(0)
    scene.overrideMaterial = this.depthMaterial
    renderer.setRenderTarget(this.depthTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.render(scene, this.camera)

    // White means "nothing in the way" — an opening with no glass in it, and
    // the whole world outside the model. Panes multiply that down.
    this.camera.layers.set(LAYER_GLASS)
    scene.overrideMaterial = this.transmitMaterial
    renderer.setRenderTarget(this.colorTarget)
    renderer.setClearColor(0xffffff, 1)
    renderer.render(scene, this.camera)

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)

    this.uniforms.uSunMatrix.value.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    )
    this.uniforms.uSunDirWorld.value.copy(sunDirection)
    this.uniforms.uSunDirView.value
      .copy(sunDirection)
      .transformDirection(view.matrixWorldInverse)
    this.uniforms.uSunRadiance.value.copy(radiance)
    this.uniforms.uSunOffset.value = this.offset
  }

  /**
   * View-space sun direction changes every time the camera moves, so it is
   * refreshed per frame while everything else in the rig stays put.
   */
  syncView(view: THREE.Camera): void {
    this.uniforms.uSunDirView.value
      .copy(this.uniforms.uSunDirWorld.value)
      .transformDirection(view.matrixWorldInverse)
  }

  /** Debug handles for the in-browser checks. */
  get targets(): { depth: THREE.WebGLRenderTarget; color: THREE.WebGLRenderTarget } {
    return { depth: this.depthTarget, color: this.colorTarget }
  }

  dispose(): void {
    this.depthTarget.dispose()
    this.colorTarget.dispose()
    this.depthMaterial.dispose()
    this.transmitMaterial.dispose()
  }
}

const SUN_PARS = /* glsl */ `
uniform mat4 uSunMatrix;
uniform sampler2D uSunDepth;
uniform sampler2D uSunTransmit;
uniform sampler2D uSunGlassDepth;
uniform vec3 uSunDirView;
uniform vec3 uSunDirWorld;
uniform vec3 uSunRadiance;
uniform vec2 uSunTexel;
uniform float uSunOffset;
varying vec3 vSunWorld;

/** Radiance arriving from the sun, already tinted by whatever it came through. */
vec3 sfSunlight( const in vec3 shadingNormal ) {
  float facing = dot( shadingNormal, uSunDirView );
  if ( facing <= 0.0 ) return vec3( 0.0 );

  // Slope-scaled offset along the light direction. The rig is orthographic, so
  // stepping toward the sun in world space is exactly a depth bias, and
  // scaling it by grazing angle is what keeps the twisted columns clean.
  float slope = 1.0 - facing;
  vec3 samplePoint = vSunWorld + uSunDirWorld * ( uSunOffset * ( 1.0 + 6.0 * slope * slope ) );

  vec4 clip = uSunMatrix * vec4( samplePoint, 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  bool outside = coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0;
  if ( outside ) return uSunRadiance * facing;

  float lit = 0.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 tap = coord.xy + vec2( float( i ), float( j ) ) * uSunTexel;
      lit += step( coord.z, texture2D( uSunDepth, tap ).x );
    }
  }
  if ( lit <= 0.0 ) return vec3( 0.0 );

  // Only glass that stands between this point and the sun may colour it.
  float paneDepth = texture2D( uSunGlassDepth, coord.xy ).x;
  vec3 tint = paneDepth < coord.z ? texture2D( uSunTransmit, coord.xy ).rgb : vec3( 1.0 );
  return uSunRadiance * tint * facing * ( lit / 9.0 );
}
`

const SUN_APPLY = /* glsl */ `
{
  vec3 sfSun = sfSunlight( geometryNormal );
  reflectedLight.directDiffuse += sfSun * BRDF_Lambert( material.diffuseColor );
  reflectedLight.directSpecular += sfSun * BRDF_GGX( uSunDirView, geometryViewDir, geometryNormal, material );
}
`

/**
 * Teach a standard material about the rig.
 *
 * The sun is added as its own term rather than by rewriting three's light
 * loop. That trades a little physical exactness — the diffuse lobe is Lambert
 * and the specular is the same GGX three would have used — for not depending
 * on the internal shape of a chunk that changes between releases.
 */
export function patchForSunlight(
  material: THREE.MeshStandardMaterial,
  uniforms: SunUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSunWorld;')
      .replace(
        '#include <project_vertex>',
        [
          '#include <project_vertex>',
          // The instance matrix is applied inside project_vertex to a local
          // copy, so `transformed` is still in the piece's own frame here. A
          // world position that skipped it would put every instanced column's
          // sunlight at the one place the template geometry happens to stand.
          '  vec4 sunLocal = vec4( transformed, 1.0 );',
          '  #ifdef USE_INSTANCING',
          '    sunLocal = instanceMatrix * sunLocal;',
          '  #endif',
          '  vSunWorld = ( modelMatrix * sunLocal ).xyz;',
        ].join('\n'),
      )

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${SUN_PARS}`)
      .replace('#include <lights_fragment_end>', `${SUN_APPLY}\n#include <lights_fragment_end>`)
  }
  material.customProgramCacheKey = () => 'sf-sunlight-3'
  material.needsUpdate = true
}
