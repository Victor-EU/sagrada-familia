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

/**
 * Things that stand above the roofs and roof nothing: the eighteen towers.
 *
 * Every camera in the project sees them — this is not a visibility switch.
 * It exists so that the one render that asks *what is over this point of the
 * plan* can be told that a bell tower is not an answer. Without it the
 * volumetric medium finds a room inside every tower's footprint from its foot
 * to its tip, and the towers come back wrapped in vertical plumes of haze:
 * measured on the view from the terraces, sixteen per cent of the frame's
 * brightness, on a frame whose whole subject is a clean silhouette.
 */
export const LAYER_SKYLINE = 2

/**
 * Scenery: the Eixample the building stands in.
 *
 * Only the eye ever sees this layer. The sun's occlusion pass does not, so a
 * hundred city blocks never enter the orthographic fit — a fit stretched to
 * hold half a kilometre of Barcelona would coarsen every shadow in the nave
 * to pay for buildings nobody is standing next to. The roof map does not, so
 * the volumetric medium never decides the plaza is indoors. And the
 * transmittance pass does not, because none of it is glass.
 *
 * The city is scale and nothing else. See plan/city.ts.
 */
export const LAYER_CITY = 3

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
  /** The second map: the same sun, fitted to where the camera is standing. */
  uSunNearMatrix: { value: THREE.Matrix4 }
  uSunNearDepth: { value: THREE.Texture | null }
  uSunNearTexel: { value: THREE.Vector2 }
  uSunNearOffset: { value: number }
  uSunNearOn: { value: number }
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

  /**
   * The near map, and why there is one.
   *
   * One orthographic map has to cover the model *and* the ground its shadow
   * falls on, so its texel is set by the largest thing built. The eighteen
   * towers took the fit from a 108 m radius to 180 m, and at 3072 that is
   * 11.7 cm to the texel — every shadow in the interior coarsened to pay for
   * objects a hundred and fifty metres away that nobody is standing next to.
   * A branch's shadow on a vault is a 5 cm feature. It was never going to
   * survive.
   *
   * So there is a second map at the same sun, fitted to a sixty-metre box
   * around wherever the camera is standing: 2.9 cm to the texel, four times
   * finer, over the only part of the building anyone is looking at closely.
   * A receiver that falls inside it uses it, one that does not falls back to
   * the wide map, and the two are cross-faded over the last couple of metres
   * so the join is not a line.
   *
   * It follows the camera, which means it re-renders — but only when the
   * camera has left the middle of it, which walking does about every twenty
   * seconds, and the sun pass was already being run on every frame of a drag
   * of the hour slider. Its centre is snapped to its own texel grid in the
   * sun's frame, because a shadow map that slides continuously under a static
   * building makes every edge in the picture crawl.
   */
  nearEnabled = true
  /** Half-width of the near map, metres. */
  readonly nearExtent = 30
  private readonly nearCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly nearTarget: THREE.WebGLRenderTarget
  private readonly nearCentre = new THREE.Vector3()
  private nearValid = false

  constructor(
    private readonly resolution = 2048,
    private readonly nearResolution = 2048,
  ) {
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

    const nearDepth = new THREE.DepthTexture(nearResolution, nearResolution)
    nearDepth.type = THREE.UnsignedIntType
    nearDepth.minFilter = THREE.NearestFilter
    nearDepth.magFilter = THREE.NearestFilter
    this.nearTarget = new THREE.WebGLRenderTarget(nearResolution, nearResolution, {
      depthTexture: nearDepth,
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
    })

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
      uSunNearMatrix: { value: new THREE.Matrix4() },
      uSunNearDepth: { value: nearDepth },
      uSunNearTexel: { value: new THREE.Vector2(1 / nearResolution, 1 / nearResolution) },
      uSunNearOffset: { value: this.offset },
      uSunNearOn: { value: 0 },
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

    // Everything opaque, towers included — they cast the longest shadows in
    // the model and leaving them out would leave them out of their own.
    this.camera.layers.set(0)
    this.camera.layers.enable(LAYER_SKYLINE)
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
    // The sun has moved, so whatever the near map holds is of another hour.
    this.nearValid = false
  }

  /** Whether the near map still covers a camera standing here. */
  nearStale(eye: THREE.Vector3): boolean {
    if (!this.nearEnabled) return this.uniforms.uSunNearOn.value > 0
    if (!this.nearValid) return true
    // Re-fit once the camera has left the middle of the map, not once it has
    // left the map: a shadow falling into the frame from off to one side is
    // cast by something the map still has to contain.
    return eye.distanceTo(this.nearCentre) > this.nearExtent * 0.4
  }

  /**
   * Re-run the occlusion pass into the near map, around this point.
   *
   * Depth only. The glass keeps one map at the wide fit, because a pane's
   * colour is a low-frequency thing — a tint boundary is soft in the world
   * and soft in the photographs — and because doubling the transmittance
   * target would cost seventy-five megabytes to sharpen an edge nobody can
   * see.
   */
  renderNear(renderer: THREE.WebGLRenderer, scene: THREE.Scene, eye: THREE.Vector3): void {
    if (!this.nearEnabled) {
      this.uniforms.uSunNearOn.value = 0
      this.nearValid = false
      return
    }

    const dir = this.uniforms.uSunDirWorld.value
    const e = this.nearExtent
    const r = this.radius
    const texel = (2 * e) / this.nearResolution

    const camera = this.nearCamera
    camera.left = -e
    camera.right = e
    camera.top = e
    camera.bottom = -e
    camera.near = 0.1
    // The same depth range as the wide map, so nothing that casts into this
    // box is behind the near plane or past the far one.
    camera.far = 4 * r
    camera.up.set(0, 1, 0)

    // Two passes at the placement. The first only establishes the sun's own
    // frame; the second puts the centre on a whole number of texels in it,
    // which is what stops every edge in the picture crawling as the map
    // slides along under a building that is not moving.
    camera.position.copy(eye).addScaledVector(dir, 2 * r)
    camera.lookAt(eye)
    camera.updateMatrixWorld(true)

    const local = eye.clone().applyMatrix4(camera.matrixWorldInverse)
    local.x = Math.round(local.x / texel) * texel
    local.y = Math.round(local.y / texel) * texel
    const centre = local.applyMatrix4(camera.matrixWorld)
    camera.position.copy(centre).addScaledVector(dir, 2 * r)
    camera.lookAt(centre)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()

    const previousTarget = renderer.getRenderTarget()
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    scene.background = null

    camera.layers.set(0)
    camera.layers.enable(LAYER_SKYLINE)
    scene.overrideMaterial = this.depthMaterial
    renderer.setRenderTarget(this.nearTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.render(scene, camera)

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)

    this.uniforms.uSunNearMatrix.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    )
    // Acne is a function of how much world a texel covers, so the finer map
    // carries a proportionally smaller bias — keeping the wide map's would
    // detach every shadow in the near field from the thing casting it.
    const wideTexel = (2 * r) / this.resolution
    this.uniforms.uSunNearOffset.value = Math.max(0.004, this.offset * (texel / wideTexel))
    this.uniforms.uSunNearOn.value = 1
    this.nearCentre.copy(eye)
    this.nearValid = true
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
  get targets(): {
    depth: THREE.WebGLRenderTarget
    color: THREE.WebGLRenderTarget
    near: THREE.WebGLRenderTarget
  } {
    return { depth: this.depthTarget, color: this.colorTarget, near: this.nearTarget }
  }

  /** Metres of world to a texel, wide map and near map. */
  get texelSize(): { wide: number; near: number } {
    return {
      wide: (2 * this.radius) / this.resolution,
      near: (2 * this.nearExtent) / this.nearResolution,
    }
  }

  dispose(): void {
    this.depthTarget.dispose()
    this.colorTarget.dispose()
    this.nearTarget.dispose()
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
uniform mat4 uSunNearMatrix;
uniform sampler2D uSunNearDepth;
uniform vec2 uSunNearTexel;
uniform float uSunNearOffset;
uniform float uSunNearOn;
varying vec3 vSunWorld;

/** Nine taps of a shadow map, as the fraction of them the sun reaches. */
float sfLit( const in sampler2D map, const in vec3 coord, const in vec2 texel ) {
  float lit = 0.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 tap = coord.xy + vec2( float( i ), float( j ) ) * texel;
      lit += step( coord.z, texture2D( map, tap ).x );
    }
  }
  return lit / 9.0;
}

/** Radiance arriving from the sun, already tinted by whatever it came through. */
vec3 sfSunlight( const in vec3 shadingNormal ) {
  float facing = dot( shadingNormal, uSunDirView );
  if ( facing <= 0.0 ) return vec3( 0.0 );

  // Slope-scaled offset along the light direction. The rig is orthographic, so
  // stepping toward the sun in world space is exactly a depth bias, and
  // scaling it by grazing angle is what keeps the twisted columns clean.
  // The quadratic covers ordinary slopes. The sixth power is for the plaza
  // under a sun ten degrees up: a texel of the map lands on a plane that
  // shallow as a metre-long footprint, and the plane's own depth changes by
  // more than the bias across that footprint, which came out as stripes of
  // shadow across the whole ground. The high power leaves everything under
  // forty degrees of slope alone.
  float slope = 1.0 - facing;
  float slopeScale = 1.0 + 6.0 * slope * slope + 24.0 * pow( slope, 6.0 );
  float grazing = uSunOffset * slopeScale;

  vec4 clip = uSunMatrix * vec4( vSunWorld + uSunDirWorld * grazing, 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  bool outside = coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0;
  if ( outside ) return uSunRadiance * facing;

  // The near map where there is one. It is four times finer, so it carries a
  // bias of its own — the wide map's would lift every near shadow off the
  // thing casting it — and the two are cross-faded over the last few per cent
  // of its width, because a step from one shadow resolution to another is a
  // line across the floor and reads as a seam in the building.
  float lit = -1.0;
  if ( uSunNearOn > 0.5 ) {
    vec4 nearClip = uSunNearMatrix *
      vec4( vSunWorld + uSunDirWorld * ( uSunNearOffset * slopeScale ), 1.0 );
    vec3 nearCoord = nearClip.xyz / nearClip.w * 0.5 + 0.5;
    float edge = min( min( nearCoord.x, 1.0 - nearCoord.x ), min( nearCoord.y, 1.0 - nearCoord.y ) );
    float blend = nearCoord.z <= 1.0 ? smoothstep( 0.005, 0.045, edge ) : 0.0;
    if ( blend > 0.0 ) {
      float close = sfLit( uSunNearDepth, nearCoord, uSunNearTexel );
      lit = blend >= 1.0 ? close : mix( sfLit( uSunDepth, coord, uSunTexel ), close, blend );
    }
  }
  if ( lit < 0.0 ) lit = sfLit( uSunDepth, coord, uSunTexel );
  if ( lit <= 0.0 ) return vec3( 0.0 );

  // Only glass that stands between this point and the sun may colour it.
  float paneDepth = texture2D( uSunGlassDepth, coord.xy ).x;
  vec3 tint = paneDepth < coord.z ? texture2D( uSunTransmit, coord.xy ).rgb : vec3( 1.0 );
  return uSunRadiance * tint * facing * lit;
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
 * Something a particular surface adds to the patched shader.
 *
 * The sun patch owns `onBeforeCompile`, and a material only has one, so a
 * surface that needs its own shader work — the pavement is the only one so
 * far — hands it over rather than fighting for the slot.
 */
export interface SurfacePatch {
  /** Uniforms merged in alongside the rig's own. */
  uniforms?: Record<string, THREE.IUniform>
  /** Declarations, added to the top of the fragment shader. */
  pars?: string
  /** Statements run where `diffuseColor` is still open to change. */
  colour?: string
  /**
   * Statements run once the probe's irradiance has been read and before it
   * is spent — `iblIrradiance` is live here and the hemisphere's is not.
   */
  indirect?: string
  /** Statements run once `reflectedLight` is complete and before it is summed. */
  light?: string
  /** What makes this patch a different program from the plain one. */
  key?: string
}

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
  extra: SurfacePatch = {},
): void {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, extra.uniforms ?? {})

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
      .replace('#include <common>', `#include <common>\n${SUN_PARS}\n${extra.pars ?? ''}`)
      // `diffuseColor` is live from here until the light loop reads it, so a
      // surface that wants to decide its own albedo per fragment says so
      // here and nothing downstream has to know.
      .replace('#include <color_fragment>', `#include <color_fragment>\n${extra.colour ?? ''}`)
      .replace(
        '#include <lights_fragment_maps>',
        `#include <lights_fragment_maps>\n${extra.indirect ?? ''}`,
      )
      .replace('#include <lights_fragment_end>', `${SUN_APPLY}\n#include <lights_fragment_end>`)
      // Everything that lights this fragment has arrived by here, direct and
      // indirect both, and nothing has yet been added up.
      .replace('#include <aomap_fragment>', `${extra.light ?? ''}\n#include <aomap_fragment>`)
  }
  // Three caches compiled programs by this key, so two materials that patch
  // the same base shader differently have to name themselves differently or
  // the second one silently gets the first one's program.
  const key = `sf-sunlight-4${extra.key ? `-${extra.key}` : ''}`
  material.customProgramCacheKey = () => key
  material.needsUpdate = true
}
