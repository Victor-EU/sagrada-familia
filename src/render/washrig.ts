import * as THREE from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { transmittanceMaterial } from '../geometry/glass.ts'
import { LAYER_GLASS, LAYER_SKYLINE } from './sunrig.ts'

/**
 * The light off the glass, as light rather than as fill.
 *
 * The sun rig answers "did the sun reach this point, and through what", and
 * the sun is a disc half a degree across. A window is a hundred square metres
 * of sky. Photograph the nave at any hour and almost none of what you are
 * looking at is in direct sun: the green wash lying ten metres across an
 * aisle soffit, the orange that runs the whole height of a column shaft, the
 * lit flank of every splayed reveal — all of it is skylight that came through
 * coloured glass, and until now the model had no term for it at all. It had a
 * *fill*: a number per surface orientation, with no shadows, no falloff and
 * no pattern, which is why the room came out evenly lit and the big soft
 * patches in the photographs never appeared.
 *
 * So the glazing gets a rig of its own. It is the sun rig's two passes —
 * occlusion depth, and glass transmittance — run along the two horizontal
 * directions the nave is glazed on, and then read the same way:
 *
 *  - **it is shadowed**, so a column stands in its own band of shade and
 *    throws that band across the floor and onto the next column, which is
 *    most of what gives the nave depth;
 *  - **it carries the window's pattern**, because the transmittance map is
 *    the window — so the light landing on the far wall is lancet-shaped and
 *    lancet-coloured rather than a uniform tint;
 *  - **it is soft**, because the source is a hemisphere of sky and not a
 *    disc. A wide tap kernel stands in for that: cheap, and wrong only in
 *    that the penumbra does not grow with distance.
 *
 * Two directions and not more. The nave is a long room glazed on its two long
 * sides, and light arriving along its axis has ninety metres of colonnade to
 * get through; the apse and the fronts are handled by the same two maps badly
 * and by nothing else at all, which is the right trade for one pass.
 *
 * Nothing here moves. The building is static and so is the direction, so the
 * four renders happen once per rebuild and never again — this is the cheapest
 * light in the project at runtime and the most expensive to have left out.
 */

/**
 * How wide the source is, in metres at the model.
 *
 * A window is metres across and the blur that says so has to be stated in
 * metres: expressed in texels it would change every time the fit did.
 */
const SOFT_METRES = 1.1

/** Which way the light travels. +x is the Passion wall's light heading in. */
const HEADING = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)] as const

/**
 * How wide the floor is as a source, in metres at the model.
 *
 * Much softer than a window. A window is a few metres across and ten or
 * twenty away; the pavement is the whole plan of the building and a soffit
 * forty-five metres up sees nearly all of it at once, so what a branch casts
 * on the vault above it is a broad darkening and not a shadow with an edge.
 */
const LOFT_METRES = 4.5

/**
 * Floors, and the plaza they stand on.
 *
 * The one pass in this rig that looks *up* has to be told to ignore them.
 * It is asking how much of the pavement each soffit can see, and a camera
 * under the building looking up meets the pavement before it meets anything
 * else — so left in, the floor shadows the entire building from its own
 * light and the map comes back uniformly black. Matched by name, the way
 * roof.ts excludes the porches, and for the same kind of reason: this is a
 * question about what stands *between* two things, and the source is not in
 * between itself.
 */
const UNDERFOOT = /^(pavement|base-|presbytery|plaza)/

export interface WashUniforms extends Record<string, THREE.IUniform> {
  uWashMatrixA: { value: THREE.Matrix4 }
  uWashMatrixB: { value: THREE.Matrix4 }
  uWashDepthA: { value: THREE.Texture | null }
  uWashDepthB: { value: THREE.Texture | null }
  uWashTintA: { value: THREE.Texture | null }
  uWashTintB: { value: THREE.Texture | null }
  uWashDirA: { value: THREE.Vector3 }
  uWashDirB: { value: THREE.Vector3 }
  uWashSoft: { value: number }
  uWashBias: { value: number }
  uWashGain: { value: number }
  uWashBlur: { value: number }
  /** The light from below: world → the up-looking map's clip space. */
  uLoftMatrix: { value: THREE.Matrix4 }
  uLoftDepth: { value: THREE.Texture | null }
  uLoftSoft: { value: number }
  uLoftBias: { value: number }
  uLoftGain: { value: number }
}

interface Side {
  camera: THREE.OrthographicCamera
  depth: THREE.WebGLRenderTarget
  colour: THREE.WebGLRenderTarget
}

export class WashRig {
  readonly uniforms: WashUniforms
  private readonly sides: Side[] = []
  private readonly depthMaterial: THREE.MeshBasicMaterial
  private readonly transmitMaterial: THREE.MeshBasicMaterial
  private readonly bounds = new THREE.Box3(
    new THREE.Vector3(-30, 0, -30),
    new THREE.Vector3(30, 60, 30),
  )
  private readonly centre = new THREE.Vector3()
  /** Top of the room, from `setBounds`; the up-looking pass stops there. */
  private ceiling = 45
  private readonly loftCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly loftTarget: THREE.WebGLRenderTarget
  private valid = false
  /** How many times the four passes have actually run. Dev instrumentation. */
  runs = 0
  private quad: FullScreenQuad | null = null

  constructor(readonly resolution = 1024) {
    for (let i = 0; i < 2; i++) {
      const depthTexture = new THREE.DepthTexture(resolution, resolution)
      depthTexture.type = THREE.UnsignedIntType
      depthTexture.minFilter = THREE.NearestFilter
      depthTexture.magFilter = THREE.NearestFilter
      const depth = new THREE.WebGLRenderTarget(resolution, resolution, {
        depthTexture,
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
      })

      // Its own depth buffer, so a pane on the far wall cannot colour light
      // that a nearer pane already coloured — the same reason the sun rig
      // keeps one.
      const glassDepth = new THREE.DepthTexture(resolution, resolution)
      glassDepth.type = THREE.UnsignedIntType
      glassDepth.minFilter = THREE.NearestFilter
      glassDepth.magFilter = THREE.NearestFilter
      const colour = new THREE.WebGLRenderTarget(resolution, resolution, {
        type: THREE.HalfFloatType,
        // Mipmapped, because this one is read *blurred*, and a blur is what
        // a mip chain is. The window's pattern projected sharp is a gobo: a
        // razor-edged slide of the glazing thrown across the nave, which is
        // what a point source would do and is nothing like a window. The
        // source is a wall of sky metres across, so the pattern it throws is
        // soft at a metre and gone at ten — one `textureLod` away.
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: true,
        depthTexture: glassDepth,
      })
      colour.texture.colorSpace = THREE.NoColorSpace

      this.sides.push({ camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), depth, colour })
    }

    // The up-looking map. Depth only: what is overhead is not glass, and the
    // colour of what the floor throws back is a property of the floor rather
    // than of anything this pass can see.
    const loftDepth = new THREE.DepthTexture(resolution, resolution)
    loftDepth.type = THREE.UnsignedIntType
    loftDepth.minFilter = THREE.NearestFilter
    loftDepth.magFilter = THREE.NearestFilter
    this.loftTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      depthTexture: loftDepth,
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
    })

    this.depthMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })
    this.transmitMaterial = transmittanceMaterial()

    this.uniforms = {
      uWashMatrixA: { value: new THREE.Matrix4() },
      uWashMatrixB: { value: new THREE.Matrix4() },
      uWashDepthA: { value: this.sides[0]!.depth.depthTexture },
      uWashDepthB: { value: this.sides[1]!.depth.depthTexture },
      uWashTintA: { value: this.sides[0]!.colour.texture },
      uWashTintB: { value: this.sides[1]!.colour.texture },
      uWashDirA: { value: HEADING[0].clone() },
      uWashDirB: { value: HEADING[1].clone() },
      /** Tap spacing, in texture units. This is the softness of the source. */
      uWashSoft: { value: 3.5 / resolution },
      /** Depth bias in metres, along the light. */
      uWashBias: { value: 0.22 },
      uWashGain: { value: 9 },
      /**
       * Mip level the window is read at.
       *
       * Four, which at this fit is about a metre and a half of blur — a
       * lancet's width. Below that the nave gets a stencilled pattern of
       * individual lights; above it every window in the building averages to
       * one colour and the bay structure that the photographs are full of
       * disappears with it.
       */
      uWashBlur: { value: 4 },

      uLoftMatrix: { value: new THREE.Matrix4() },
      uLoftDepth: { value: loftDepth },
      /** Tap spacing, in texture units — set from LOFT_METRES on render. */
      uLoftSoft: { value: 4.5 / resolution },
      /** Depth bias in metres, straight down toward the source. */
      uLoftBias: { value: 0.3 },
      /**
       * How much light the floor is.
       *
       * It is the largest surface in the building, it is pale polished
       * stone, and every soffit in the place faces it — so this is not a
       * garnish, it is what lights the canopy. The flat term it replaces
       * stood at 8 and then 4; this is the same light with the shadows put
       * back, so it starts near the figure that was standing in for it.
       */
      uLoftGain: { value: 3.4 },
    }
  }

  /**
   * What the rig has to cover, and what it must not.
   *
   * Only the room. Fitted to the whole model the frustum has to hold a
   * hundred and seventy metres of tower to light a nave twenty-six metres
   * high, and the glazing ends up occupying about three per cent of the map —
   * which is how the first build of this came out reading black almost
   * everywhere: not because the pass failed, but because the window was four
   * texels wide and the ray from most receivers landed in the stone beside
   * it. `ceiling` is the top of the room, and everything above it is a tower
   * that lights nothing indoors.
   */
  setBounds(box: THREE.Box3, ceiling: number): void {
    const capped = box.clone()
    capped.max.y = Math.min(capped.max.y, ceiling + 6)
    if (capped.equals(this.bounds) && ceiling === this.ceiling) return
    this.bounds.copy(capped)
    this.ceiling = ceiling
    this.valid = false
  }

  /** Force the next `render` to run, after geometry has changed under it. */
  invalidate(): void {
    this.valid = false
  }

  get stale(): boolean {
    return !this.valid
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    // Per axis, not a bounding sphere. The light runs along x, so what the
    // frustum has to hold is the model's shadow on the y–z plane — and a
    // sphere big enough to contain a long thin building wastes most of the
    // map on the air around its corners.
    this.bounds.getCenter(this.centre)
    const size = this.bounds.getSize(new THREE.Vector3())
    const halfAcross = Math.max(size.z / 2, 1) * 1.02
    const halfUp = Math.max(size.y / 2, 1) * 1.02
    const depth = Math.max(size.x, 1) * 1.02

    const previousTarget = renderer.getRenderTarget()
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    scene.background = null

    // Softness in metres rather than in texels, so the source stays the same
    // size whatever the building's extent does to the fit.
    this.uniforms.uWashSoft.value = SOFT_METRES / (2 * Math.max(halfAcross, halfUp))
    const standoff = depth / 2 + 5
    for (const [i, side] of this.sides.entries()) {
      const heading = HEADING[i]!
      const camera = side.camera
      camera.left = -halfAcross
      camera.right = halfAcross
      camera.top = halfUp
      camera.bottom = -halfUp
      camera.near = 0.1
      camera.far = depth + 10
      // Stand off against the heading and look along it.
      camera.position.copy(this.centre).addScaledVector(heading, -standoff)
      camera.up.set(0, 1, 0)
      camera.lookAt(this.centre)
      camera.updateMatrixWorld(true)
      camera.updateProjectionMatrix()

      camera.layers.set(0)
      camera.layers.enable(LAYER_SKYLINE)
      scene.overrideMaterial = this.depthMaterial
      renderer.setRenderTarget(side.depth)
      renderer.setClearColor(0x000000, 1)
      // Explicit, because the composer leaves `autoClear` off: without this
      // the depth attachment keeps the last frame's, the glass fails its own
      // depth test on every frame after the first, and the map goes black.
      renderer.clear(true, true, true)
      renderer.render(scene, camera)

      camera.layers.set(LAYER_GLASS)
      scene.overrideMaterial = this.transmitMaterial
      renderer.setRenderTarget(side.colour)
      // Black, not white: unlike the sun's, this map is the *source*. Where
      // there is no glass there is no window, and a hole in the wall would
      // otherwise pour unfiltered white light into the room from every
      // direction the map happens to see sky in.
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, true)
      renderer.render(scene, camera)

      const matrix = i === 0 ? this.uniforms.uWashMatrixA : this.uniforms.uWashMatrixB
      matrix.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    }

    this.renderLoft(renderer, scene)

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)
    this.valid = true
    this.runs++
  }

  /**
   * How much of the pavement each point overhead can see.
   *
   * The two side passes answer "which window is this surface looking at",
   * and they cannot answer anything for the canopy: they run along the two
   * horizontal axes because the nave is glazed on its two long sides, and a
   * soffit faces a horizontal source edge-on. Above the clerestory heads
   * there is no opening for them to see through in any case. So the vault
   * took none of it, and was lit by a constant — measured, switching the
   * side passes off changed the canopy by nothing at all, to the byte.
   *
   * What actually lights it is underneath. A hundred metres of pale
   * polished pavement, lit through the glazing, throwing back up; every
   * soffit in the building faces it, and it is the reason the vaults
   * photograph brighter than the columns holding them up. This is that
   * source with its shadows in it — one orthographic pass straight up, so
   * a soffit over open floor is lit and a soffit behind a branch, a boss or
   * a column is not, which is the modelling the photographs are full of and
   * the model had no way to produce.
   *
   * Depth only, and the floors are left out of it: see UNDERFOOT.
   */
  private renderLoft(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const { min, max } = this.bounds
    const margin = 8
    // Below everything, looking straight up. Nothing is clipped by the near
    // plane; the floors are taken out by name instead, which is exact where
    // a plane would have to guess at the height of the pavement.
    const eye = min.y - margin - 10
    const camera = this.loftCamera
    camera.left = min.x - margin
    camera.right = max.x + margin
    camera.bottom = min.z - margin
    camera.top = max.z + margin
    camera.near = 0.1
    camera.far = this.ceiling + margin - eye
    camera.position.set((min.x + max.x) / 2, eye, (min.z + max.z) / 2)
    // `up` along +z, so the map's y axis runs with the world's z and the
    // lookup in the shader is a plain multiply with no axis swap in it.
    camera.up.set(0, 0, 1)
    camera.lookAt((min.x + max.x) / 2, eye + 1, (min.z + max.z) / 2)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()

    const spanX = camera.right - camera.left
    const spanZ = camera.top - camera.bottom
    this.uniforms.uLoftSoft.value = LOFT_METRES / Math.max(spanX, spanZ)

    const hidden: THREE.Object3D[] = []
    scene.traverse((node) => {
      if (node.visible && UNDERFOOT.test(node.name)) {
        node.visible = false
        hidden.push(node)
      }
    })

    camera.layers.set(0)
    camera.layers.enable(LAYER_SKYLINE)
    scene.overrideMaterial = this.depthMaterial
    renderer.setRenderTarget(this.loftTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)

    for (const node of hidden) node.visible = true

    this.uniforms.uLoftMatrix.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    )
  }

  /**
   * Draw one of the four maps over the frame, for looking at.
   *
   * `which` is 0 or 1 for the tint of that side, 2 or 3 for its depth.
   */
  debugShow(renderer: THREE.WebGLRenderer, which: number): void {
    const side = this.sides[which % 2]!
    const texture =
      which < 2 ? side.colour.texture : (side.depth.depthTexture as unknown as THREE.Texture)
    if (!this.quad) {
      this.quad = new FullScreenQuad(
        new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, toneMapped: false }),
      )
    }
    const material = this.quad.material as THREE.MeshBasicMaterial
    material.map = texture
    material.needsUpdate = true
    this.quad.render(renderer)
  }

  dispose(): void {
    for (const side of this.sides) {
      side.depth.dispose()
      side.colour.dispose()
    }
    this.loftTarget.dispose()
    this.depthMaterial.dispose()
    this.transmitMaterial.dispose()
  }
}

export const WASH_PARS = /* glsl */ `
uniform mat4 uWashMatrixA;
uniform mat4 uWashMatrixB;
uniform sampler2D uWashDepthA;
uniform sampler2D uWashDepthB;
uniform sampler2D uWashTintA;
uniform sampler2D uWashTintB;
uniform vec3 uWashDirA;
uniform vec3 uWashDirB;
uniform float uWashSoft;
uniform float uWashBias;
uniform float uWashGain;
uniform float uWashBlur;
uniform mat4 uLoftMatrix;
uniform sampler2D uLoftDepth;
uniform float uLoftSoft;
uniform float uLoftBias;
uniform float uLoftGain;

/**
 * Irradiance from one glazed side.
 *
 * Five taps rather than twenty-five. The kernel is standing in for the
 * angular size of a sky, which is a smooth thing, and a cross of five samples
 * two texels apart blurs a 1 m lancet at this fit about as well as a full
 * square does — for a fifth of the fetches, in a shader that is already
 * sampling two shadow maps for the sun.
 */
vec3 sfWashFrom(
  const in sampler2D depthMap,
  const in sampler2D tintMap,
  const in mat4 matrix,
  const in vec3 heading,
  const in vec3 shadingNormal,
  const in vec3 world
) {
  // The light travels along the heading, so a surface lit by it faces back up.
  float facing = dot( shadingNormal, -heading );
  if ( facing <= 0.0 ) return vec3( 0.0 );

  vec4 clip = matrix * vec4( world - heading * uWashBias, 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  if ( coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0 ) {
    return vec3( 0.0 );
  }

  // Only glass in front of this point may be the window it is lit by. Behind
  // it there is a wall, and a wall is not a light.

  vec2 o = vec2( uWashSoft, 0.0 );
  float lit =
    step( coord.z, texture2D( depthMap, coord.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy + o.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy - o.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy + o.yx ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy - o.yx ).x );
  if ( lit <= 0.0 ) return vec3( 0.0 );

  // Black here means no glass on this ray, which is the same statement as
  // no window — so the map needs no companion depth test to say it.
  vec3 tint = textureLod( tintMap, coord.xy, uWashBlur ).rgb;

  return ( lit * 0.2 ) * tint * facing;
}

/** Both glazed sides, in world space. */
vec3 sfWash( const in vec3 shadingNormal, const in vec3 world ) {
  return uWashGain * (
    sfWashFrom( uWashDepthA, uWashTintA, uWashMatrixA, uWashDirA, shadingNormal, world ) +
    sfWashFrom( uWashDepthB, uWashTintB, uWashMatrixB, uWashDirB, shadingNormal, world )
  );
}

/**
 * How much of the floor this point can see — the light from below.
 *
 * Nine taps rather than five, and spread four and a half metres rather than
 * one. The floor is not a window: it is the whole plan of the building seen
 * from a soffit forty-five metres up, so what a branch casts on the vault
 * over it is a broad darkening with no edge anywhere in it. A five-tap
 * cross at the window's spacing gives a hard-edged shadow of a branch,
 * which is what a point source does and is nothing like a floor.
 *
 * Only downward-facing surfaces, which is not a simplification: a floor
 * cannot light anything that is not looking at it, and the cosine is the
 * whole of the term.
 */
float sfLoft( const in vec3 shadingNormal, const in vec3 world ) {
  float facing = max( 0.0, - shadingNormal.y );
  if ( facing <= 0.0 ) return 0.0;

  // Toward the source, which is straight down.
  vec4 clip = uLoftMatrix * vec4( world - vec3( 0.0, uLoftBias, 0.0 ), 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  if ( coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0 ) {
    return 0.0;
  }

  float lit = 0.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 tap = coord.xy + vec2( float( i ), float( j ) ) * uLoftSoft;
      lit += step( coord.z, texture2D( uLoftDepth, tap ).x );
    }
  }

  return uLoftGain * ( lit / 9.0 ) * facing;
}
`
