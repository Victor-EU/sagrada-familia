import * as THREE from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'
import type { RoofMap } from './roof.ts'
import type { SunUniforms } from './sunrig.ts'

/**
 * The air.
 *
 * Every photograph of this interior that is worth looking at is a photograph
 * of air. The light does not merely land on the plaster — it stands in the
 * room as a solid, leaning down from the clerestory in the colour the glass
 * gave it. Without that, a renderer puts a coloured patch on a wall and the
 * space between the camera and the wall is nothing at all, which is the
 * single biggest difference between this model and the pictures it is being
 * judged against. The design doc has called it the highest-value beauty lever
 * since phase 0 and it is the last one unbuilt.
 *
 * The whole effect is one integral along the view ray:
 *
 *     L = σ · p(θ) · ∫ visible(x) · tint(x) · E☉ dx
 *
 * and every term on the right already exists. `visible` is the sun rig's
 * occlusion depth map — the one the surfaces already test against, in which
 * a window opening contains no geometry and so passes the sun freely.
 * `tint` is the rig's transmittance map, so a shaft standing in the nave is
 * the colour of the pane it came through **for free**: nothing here knows
 * how many windows there are or what colour any of them is, exactly as
 * nothing in the surface shader does. That reuse is the reason this costs one
 * pass rather than a lighting rewrite.
 *
 * Three honest simplifications, none of them hidden:
 *
 *  - **Single scattering.** Light bends into the ray once and is then assumed
 *    to reach the camera. Multiple scattering in a room this size is a slow
 *    uniform lift, which the ambient term is already standing in for.
 *  - **No extinction.** At the density that looks right, a hundred metres of
 *    air absorbs a couple of per cent. Taking it out keeps the plaster the
 *    white it was tuned to be, and saves carrying transmittance along the
 *    march.
 *  - **Uniform density, indoors.** Real interiors are dustier near the floor
 *    and near an open door, and that is a texture — a thing to be
 *    photo-matched rather than invented. But the medium does stop at the
 *    walls: dust hangs in a room, and at the density that makes the nave
 *    read, ninety metres of lit outdoor air turns the Nativity façade into a
 *    white sheet. Where the room is comes from `roof.ts`.
 *
 * It marches at half resolution for the same reason the occlusion pass does —
 * how much lit air stands along a ray barely changes from one pixel to the
 * next — and is put back with a depth-aware upsample, because the one place
 * it *does* change from one pixel to the next is a silhouette, and a plain
 * bilinear filter there paints a halo of far-away air over a near column.
 */

/** Unrolled ceiling for the march. `uSteps` breaks out of it early. */
const MAX_STEPS = 64

export interface ShaftSettings {
  /** Scattering per metre of air. This is the whole strength of the effect. */
  density: number
  /** Henyey–Greenstein g: 0 is even, positive throws light forward. */
  anisotropy: number
  /** How far down the ray to integrate, metres. */
  range: number
  /** Samples along the ray. */
  steps: number
}

export const defaultShafts: ShaftSettings = {
  // Measured, and then measured against the wrong thing.
  //
  // This used to be 0.02, chosen because at that density the interior frames
  // gained two to seven per cent of frame brightness and the exterior ones
  // gained none — a number that proved the medium was staying indoors, and
  // said nothing at all about whether the room still had any depth in it.
  // It did not. Ninety metres of nave at 0.02/m is an optical depth near two
  // by the apse, so the far half of the building was delivered behind a warm
  // veil: the columns at the crossing were the same value as the columns in
  // front of them, and a view down the nave — the one view this building is
  // famous for — arrived with no recession in it whatsoever.
  //
  // Air you can see is the effect; air you can see *through* is the room.
  // At a third of the old figure the shafts are still there in every frame
  // that has one, and the nave goes back to being ninety metres long.
  density: 0.0055,
  // Forward-scattering, but not so much that the effect disappears when the
  // sun is off to one side. Half is about right for dust: at g = 0.72 the
  // lobe is narrow enough that only a frame looking into the sun gets
  // anything, and most of these frames are looking across it.
  //
  // A third, because half is a twenty-to-one swing and the density was
  // chosen on frames looking across the sun. The phase peaks at six times
  // isotropic at g = 0.5 and falls to a third behind, so a frame that turns
  // to face the sun gets eighteen times the scattering the density was set
  // for: on the December frame across the nave at half past one, the air in
  // the left of the picture came back a featureless slab at 178 of 255,
  // brighter than any stone in the building. At a third the swing is six to
  // one, the same slab reads 147, and the shafts the effect exists for are
  // untouched — every frame looking across the sun measures the same to
  // three decimal places.
  anisotropy: 0.35,
  // A hundred and ten metres is the length of the church plus its apse. No
  // ray inside the building runs further, and capping it keeps a view out
  // through a door from integrating the horizon.
  range: 110,
  /**
   * Forty-eight, up from thirty-two.
   *
   * The march starts each ray at its own offset into the first step so that
   * banding becomes noise, and the offset is worth a whole stride — which
   * over a hundred-metre ray is three and a half metres of nave. The
   * reconstruction filter was widened to average that pattern out; the rest
   * of the answer is to make the stride shorter. Measured as the
   * high-frequency residual over a crop of the December wall frame, which
   * is the worst case in the harness: 2.05 at thirty-two steps, 1.94 here,
   * 1.88 at sixty-four. Two thirds of the remaining gain for half the cost,
   * and the pass does not register in the frame time at half resolution.
   */
  steps: 48,
}

const COMMON = /* glsl */ `
precision highp float;
varying vec2 vUv;

// A raw ShaderMaterial gets none of three's common chunk, so anything this
// shader wants from it, it declares.
uniform sampler2D uDepth;
uniform mat4 uProjectionInverse;
uniform mat4 uCameraWorld;
uniform vec3 uCameraPos;
uniform float uNear;
uniform float uFar;
uniform float uRange;

/** Ray from the eye through this pixel, in world space, and how far it runs. */
struct ViewRay {
  vec3 direction;
  float distance;
};

ViewRay rayThrough( const in vec2 uv ) {
  // The far-plane point for this pixel. Taking it through the inverse
  // projection rather than building a frustum by hand is what makes the ray
  // agree with the lens shift, which is an off-centre frustum and not a
  // rotation — a hand-rolled ray would put every shaft a few degrees off
  // exactly when the vertical correction is doing the most work.
  vec4 far = uProjectionInverse * vec4( uv * 2.0 - 1.0, 1.0, 1.0 );
  vec3 viewDir = far.xyz / far.w;

  float raw = texture2D( uDepth, uv ).x;
  float span;
  if ( raw >= 1.0 ) {
    // Nothing in the way. The air still goes on, and cutting it off at the
    // silhouette would draw a hard edge around every tower.
    span = uRange;
  } else {
    float ndc = raw * 2.0 - 1.0;
    float viewZ = ( 2.0 * uNear * uFar ) / ( uFar + uNear - ndc * ( uFar - uNear ) );
    span = min( length( viewDir * ( viewZ / max( -viewDir.z, 1e-6 ) ) ), uRange );
  }

  ViewRay ray;
  ray.direction = normalize( ( uCameraWorld * vec4( viewDir, 0.0 ) ).xyz );
  ray.distance = span;
  return ray;
}
`

const MARCH_FRAGMENT = /* glsl */ `
${COMMON}

uniform mat4 uSunMatrix;
uniform sampler2D uSunDepth;
uniform sampler2D uSunTransmit;
uniform sampler2D uSunGlassDepth;
uniform vec3 uSunRadiance;
uniform vec3 uSunDirWorld;

uniform float uDensity;
uniform float uAnisotropy;
uniform float uSteps;

uniform mat4 uRoofMatrix;
uniform sampler2D uRoofHeight;
uniform float uRoofFade;

/**
 * How much of a room this point is in — 1 well under a roof, 0 in the open.
 *
 * The fade is not a softening for its own sake: without it the boundary is a
 * visible seam in the sky exactly along the roofline, which is the last place
 * a seam can be allowed.
 */
float indoors( const in vec3 p ) {
  vec4 clip = uRoofMatrix * vec4( p, 1.0 );
  vec2 uv = clip.xy * 0.5 + 0.5;
  if ( uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0 ) return 0.0;
  return smoothstep( 0.0, uRoofFade, texture2D( uRoofHeight, uv ).r - p.y );
}

/**
 * Sunlight arriving at a point in mid-air, already tinted by whatever it came
 * through. The same two maps the surfaces read, asked the same question.
 */
vec3 airborneSunlight( const in vec3 p ) {
  vec4 clip = uSunMatrix * vec4( p, 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  bool outside = coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0;
  // Air the sun's camera never saw is air outside the building, which is lit.
  if ( outside ) return vec3( 1.0 );

  if ( coord.z > texture2D( uSunDepth, coord.xy ).x ) return vec3( 0.0 );

  // Only glass standing between this point and the sun may colour it — the
  // same test the surfaces make, and for the same reason: without it a shaft
  // in the nave picks up the colour of a window on the far side of the apse.
  float pane = texture2D( uSunGlassDepth, coord.xy ).x;
  return pane < coord.z ? texture2D( uSunTransmit, coord.xy ).rgb : vec3( 1.0 );
}

/**
 * Henyey–Greenstein. One lobe, one parameter, and it is the right shape.
 *
 * Normalised so that an isotropic medium returns exactly one, rather than
 * the physical 1/4pi. The textbook form is correct and unusable as a dial:
 * at g = 0.72 a ray looking square across the sun evaluates to 0.02, so a
 * density that reads well standing in the nave is a number fifty times
 * smaller than it looks and bears no relation to the metre it is quoted per.
 * Normalised, the density parameter means scatter per metre of air with the
 * sun to one side, which is a quantity that can be reasoned about.
 */
float phase( const in float cosTheta, const in float g ) {
  float gg = g * g;
  float d = 1.0 + gg - 2.0 * g * cosTheta;
  return ( 1.0 - gg ) / max( d * sqrt( d ), 1e-4 );
}

/**
 * Interleaved gradient noise.
 *
 * A fixed number of samples along a ray produces banding, and the way to
 * spend it better is to start each ray at a different point in its first
 * step. This is a *screen-space static* dither on purpose: there is no
 * temporal accumulation here, and a per-frame random offset would turn
 * banding into crawling noise, which is worse in a still frame and far worse
 * in a slow pan.
 */
float dither( const in vec2 pixel ) {
  return fract( 52.9829189 * fract( dot( pixel, vec2( 0.06711056, 0.00583715 ) ) ) );
}

void main() {
  ViewRay ray = rayThrough( vUv );
  if ( ray.distance <= 0.0 ) {
    gl_FragColor = vec4( 0.0, 0.0, 0.0, uRange );
    return;
  }

  float steps = max( uSteps, 1.0 );
  float stride = ray.distance / steps;
  // Half a metre of clearance, so a camera standing with its nose against a
  // column does not integrate the inside of it.
  float t = 0.5 + dither( gl_FragCoord.xy ) * stride;

  vec3 sum = vec3( 0.0 );
  for ( int i = 0; i < ${MAX_STEPS}; i ++ ) {
    if ( float( i ) >= steps || t >= ray.distance ) break;
    vec3 p = uCameraPos + ray.direction * t;
    float air = indoors( p );
    // Outdoors there is nothing to light, and the sun lookup is the
    // expensive part of the step.
    if ( air > 0.0 ) sum += airborneSunlight( p ) * air;
    t += stride;
  }

  vec3 scatter = sum * stride * uDensity *
    phase( dot( ray.direction, uSunDirWorld ), uAnisotropy ) * uSunRadiance;

  // Alpha carries how far this ray ran, which is what the upsample compares
  // against so it can refuse to smear far air over a near edge.
  gl_FragColor = vec4( scatter, ray.distance );
}
`

const COMPOSE_FRAGMENT = /* glsl */ `
${COMMON}

uniform sampler2D tDiffuse;
uniform sampler2D uScatter;
uniform vec2 uScatterSize;
/** 0 when the march was skipped, so the pass still blits but adds nothing. */
uniform float uMix;

void main() {
  vec4 scene = texture2D( tDiffuse, vUv );

  // Depth-aware upsample. The four half-resolution texels around this pixel
  // are weighted by how much they agree about how far the ray ran — so at a
  // silhouette, where two of them are looking past the edge into air a
  // hundred metres deep, those two are dropped rather than averaged in.
  if ( uMix <= 0.0 ) {
    gl_FragColor = scene;
    return;
  }

  ViewRay here = rayThrough( vUv );
  vec2 texel = 1.0 / uScatterSize;
  vec2 grid = vUv * uScatterSize - 0.5;
  vec2 f = fract( grid );
  vec2 base = ( floor( grid ) + 0.5 ) * texel;

  /**
   * Four by four rather than two by two, and the reason is the dither.
   *
   * The march spends a fixed number of samples per ray and starts each one
   * at its own offset into the first step, so that banding is traded for
   * noise — but the noise is interleaved gradient noise on the pixel grid,
   * which is a *pattern*, and a two-tap reconstruction is narrower than the
   * pattern's own period. What came through was a screen door: a fixed
   * diagonal weave standing over the apse and the crown in every frame with
   * a shaft in it, which reads as computed more loudly than the banding it
   * was put there to hide.
   *
   * Widening the reconstruction past the dither's period averages the
   * pattern out instead of resolving it. It costs twelve more taps of a
   * quarter-resolution buffer and nothing else — and it blurs nothing that
   * matters, because scattered air genuinely has no detail at this scale:
   * what the depth weight protects is the silhouette, and it still does.
   */
  vec3 sum = vec3( 0.0 );
  float weight = 0.0;
  for ( int j = -1; j < 3; j ++ ) {
    for ( int i = -1; i < 3; i ++ ) {
      vec2 offset = vec2( float( i ), float( j ) );
      vec4 tap = texture2D( uScatter, base + offset * texel );
      // A tent over the wider footprint: the two inner taps carry the
      // bilinear weight they always did and the outer ring tails off.
      vec2 d = abs( offset - f );
      float tent = max( 0.0, 1.0 - d.x * 0.5 ) * max( 0.0, 1.0 - d.y * 0.5 );
      // A metre of disagreement is nothing; ten is an edge.
      float agree = 1.0 / ( 1.0 + abs( tap.a - here.distance ) );
      sum += tap.rgb * tent * agree;
      weight += tent * agree;
    }
  }

  gl_FragColor = vec4( scene.rgb + uMix * sum / max( weight, 1e-4 ), scene.a );
}
`

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

/**
 * One pass, two steps, reading a buffer that is nobody else's.
 *
 * The march needs the scene's depth, and a post-processing chain ping-pongs
 * between two buffers whose depth is scratch. The first attempt shared one
 * depth texture between both of the composer's buffers so that whichever one
 * the scene landed in would carry it — and WebGL rejected every frame of it
 * with *feedback loop formed between framebuffer and active texture*, which
 * is exactly right: compositing into a buffer while sampling the depth
 * attached to that same buffer is reading and writing one framebuffer at
 * once, and the spec does not care that the two are different attachments.
 *
 * So the scene gets a target of its own, with its own depth, and this pass
 * reads it and writes somewhere else. The composite is the blit that would
 * otherwise have been wasted on getting the scene into the chain, so the
 * private target costs memory and no time.
 *
 * Sitting immediately behind the scene also puts the shafts *before* the
 * occlusion pass, which then multiplies them by the receiving surface's
 * ambient occlusion. That is not strictly right — air in front of a crevice
 * is not in the crevice — but it is at most a fifth off in the corners of
 * vaults and nowhere else.
 */
export class ShaftPass extends Pass {
  readonly settings: ShaftSettings = { ...defaultShafts }

  private readonly scatter: THREE.WebGLRenderTarget
  private readonly marchMaterial: THREE.ShaderMaterial
  private readonly composeMaterial: THREE.ShaderMaterial
  private readonly march: FullScreenQuad
  private readonly compose: FullScreenQuad
  private readonly size = new THREE.Vector2(1, 1)

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    sun: SunUniforms,
    roof: RoofMap,
    /** Where the lit scene and its depth are; written by `ScenePass`. */
    private readonly source: THREE.WebGLRenderTarget,
  ) {
    super()
    this.needsSwap = true

    this.scatter = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      generateMipmaps: false,
    })
    this.scatter.texture.colorSpace = THREE.NoColorSpace

    // The rig's uniforms are passed by reference, so a new sun position or a
    // rebuilt model reaches the march without anything having to notice.
    const shared = {
      uDepth: { value: source.depthTexture as THREE.Texture },
      uProjectionInverse: { value: new THREE.Matrix4() },
      uCameraWorld: { value: new THREE.Matrix4() },
      uCameraPos: { value: new THREE.Vector3() },
      uNear: { value: 0.1 },
      uFar: { value: 1000 },
      uRange: { value: defaultShafts.range },
    }

    this.marchMaterial = new THREE.ShaderMaterial({
      name: 'ShaftMarch',
      uniforms: {
        ...shared,
        uSunMatrix: sun.uSunMatrix,
        uSunDepth: sun.uSunDepth,
        uSunTransmit: sun.uSunTransmit,
        uSunGlassDepth: sun.uSunGlassDepth,
        uSunRadiance: sun.uSunRadiance,
        uSunDirWorld: sun.uSunDirWorld,
        uRoofMatrix: { value: roof.matrix },
        uRoofHeight: { value: roof.texture },
        // Three metres. Less and the roofline shows as a seam in the sky;
        // more and the air thins out under the vaults it should be filling.
        uRoofFade: { value: 3 },
        uDensity: { value: defaultShafts.density },
        uAnisotropy: { value: defaultShafts.anisotropy },
        uSteps: { value: defaultShafts.steps },
      },
      vertexShader: VERTEX,
      fragmentShader: MARCH_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })

    this.composeMaterial = new THREE.ShaderMaterial({
      name: 'ShaftCompose',
      uniforms: {
        ...shared,
        tDiffuse: { value: null },
        uScatter: { value: this.scatter.texture },
        uScatterSize: { value: new THREE.Vector2(1, 1) },
        uMix: { value: 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: COMPOSE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })

    this.march = new FullScreenQuad(this.marchMaterial)
    this.compose = new FullScreenQuad(this.composeMaterial)
  }

  override setSize(width: number, height: number): void {
    this.size.set(Math.max(1, width), Math.max(1, height))
    const w = Math.max(1, Math.round(this.size.x / 2))
    const h = Math.max(1, Math.round(this.size.y / 2))
    this.scatter.setSize(w, h)
    this.composeMaterial.uniforms.uScatterSize!.value.set(w, h)
  }

  override render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget): void {
    const m = this.marchMaterial.uniforms
    const c = this.composeMaterial.uniforms

    // `shared` handed both materials the same uniform objects, so writing the
    // camera once here reaches both.
    m.uProjectionInverse!.value.copy(this.camera.projectionMatrixInverse)
    m.uCameraWorld!.value.copy(this.camera.matrixWorld)
    this.camera.getWorldPosition(m.uCameraPos!.value)
    m.uNear!.value = this.camera.near
    m.uFar!.value = this.camera.far
    m.uRange!.value = this.settings.range
    m.uDensity!.value = this.settings.density
    m.uAnisotropy!.value = this.settings.anisotropy
    m.uSteps!.value = Math.min(MAX_STEPS, Math.max(1, Math.round(this.settings.steps)))
    m.uDepth!.value = this.source.depthTexture

    // This pass is load-bearing even with the air switched off: it is what
    // puts the scene into the composer's chain at all. So turning the shafts
    // off skips the march and keeps the blit, rather than skipping the pass.
    const on = this.settings.density > 0
    if (on) {
      // No clear: the quad covers every texel of the target and does not blend.
      renderer.setRenderTarget(this.scatter)
      this.march.render(renderer)
    }

    c.uMix!.value = on ? 1 : 0
    c.tDiffuse!.value = this.source.texture
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer)
    this.compose.render(renderer)
  }

  override dispose(): void {
    this.scatter.dispose()
    this.marchMaterial.dispose()
    this.composeMaterial.dispose()
    this.march.dispose()
    this.compose.dispose()
  }
}
