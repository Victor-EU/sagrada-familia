import * as THREE from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * The last thing that happens to a frame: it becomes a photograph.
 *
 * Everything upstream of this pass is radiance — the sun, the sky, the glass,
 * the lit air — and radiance is not what anyone has ever seen of this
 * building. What they have seen is a photograph of it, and a photograph has a
 * film in it, and the film has an opinion. The stock ACES curve had one too,
 * and it was the wrong one: ACES was designed for cinema projection and
 * pushes every bright warm thing toward orange and every sky toward an
 * electric cyan, which is how the plaza frame came back as a maquette under
 * a swimming-pool sky. Measured on that frame the zenith sat at 72 %
 * saturation and 77 % value; a clear Barcelona sky photographed at midday
 * sits deeper than that and quieter.
 *
 * The look is Fujifilm's Classic Chrome, as near as a hand-built grade can
 * get: muted, deep colour, hard shadows, soft highlights. It is the film
 * simulation most of the reference photographs of this building were taken
 * with, and it suits sandstone under a Mediterranean sky better than any of
 * the alternatives, because what the stone needs is to be *less* yellow than
 * its albedo says and the sky needs to be *deeper* than its radiance says.
 * Three things do it, in this order:
 *
 *  1. **AgX**, not ACES, as the base curve. AgX keeps hue where it was as a
 *     colour brightens instead of skewing it, and rolls the top off more
 *     gently, which is where the soft highlights come from. Its mid-grey
 *     lands within a hundredth of where ACES put it, so nothing upstream had
 *     to be re-exposed.
 *  2. **A contrast S around mid-grey**, in AgX's own encoded space, steeper
 *     on the shadow side than the highlight side. That asymmetry is the whole
 *     character of the stock — Fujifilm describes it as hard shadows with
 *     highlights that keep their gradation — and it is what puts the
 *     modelling back into a tower's shaded flank.
 *  3. **A channel mix** in display-linear space, which is where the colour of
 *     a film lives. Red borrows from green, so oranges and honey stone go
 *     tan rather than gold; blue borrows from green and gives up a tenth of
 *     itself, so a sky goes deeper and a shade toward teal rather than
 *     brighter and toward violet. Every row sums to one, so grey is grey.
 *
 * Then the sRGB transfer, and the frame is done. The pass replaces three's
 * OutputPass rather than sitting behind it: one pass, one read of the
 * buffer, and the look's parameters are uniforms rather than a rebuild.
 */

export interface FilmLook {
  /**
   * Steepness of the curve through mid-grey, on the shadow side. 1 is the
   * bare AgX sigmoid, which is flatter than any film; the highlight side
   * gets half of whatever is added here.
   */
  contrast: number
  /** Colourfulness before the channel mix. 1 leaves it as it arrives. */
  saturation: number
  /** How far toward the Classic Chrome channel mix. 0 is a neutral output. */
  chrome: number
  /** Cool cast in the shadows, and a matching warmth in the highlights. */
  split: number
  /**
   * Colourfulness inside the AgX encoding, before the outset. AgX greys a
   * saturated colour on its way through — a clear sky came out of it at 41 %
   * saturation from a palette at 90 % — and this is where Blender's own looks
   * put it back; the punchy look uses 1.4.
   */
  punch: number
  /**
   * The silver.
   *
   * A photograph is not a smooth field of colour and a render is: every
   * gradient in a frame from this app is mathematically clean, and the eye
   * reads a clean gradient as *computed*. Film has grain, and grain is not a
   * defect in this context — it is most of what says the image was captured
   * rather than generated. Held small, and strongest in the midtones, which
   * is where the emulsion actually is: a blown highlight has no unexposed
   * silver left to be lumpy and a black has none exposed.
   */
  grain: number
  /**
   * Fall-off at the corners.
   *
   * Every lens has it and every photograph of this building shows it,
   * strongest on the wide ones that are used for it. It is also doing a job
   * here beyond truth: a plaza frame is bright sky in three corners, and a
   * quarter-stop off those corners is what stops the building competing with
   * its own background.
   */
  vignette: number
  /**
   * Halation: the red bleed round anything very bright.
   *
   * Light that gets through the emulsion, reflects off the back of the film
   * base and comes back up through it — red first, because the anti-halation
   * backing is worst at the long end. What it looks like is a warm fringe on
   * every hard edge between stone and sky, and it is the single most
   * photographic thing on a frame of a pale tower against a blue sky. The
   * bloom already spills the highlights; this is what gives the spill the
   * colour it has on film rather than the white one it has in a renderer.
   */
  halation: number
}

export const CLASSIC_CHROME: FilmLook = {
  contrast: 1.28,
  saturation: 0.9,
  chrome: 1,
  split: 0.5,
  punch: 1.45,
  // Two per cent of the midtone. Under one it is not there; over three it is
  // a stylistic effect rather than a film, and this building does not need
  // one. Measured on the author's own Classic Chrome frames, the standard
  // deviation of a flat patch of sky runs near 1.5 % of its own level.
  grain: 0.02,
  vignette: 0.22,
  halation: 0.35,
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D tDiffuse;
uniform float uExposure;
uniform float uContrast;
uniform float uSaturation;
uniform float uChrome;
uniform float uSplit;
uniform float uPunch;
uniform float uGrain;
uniform float uVignette;
uniform float uHalation;
uniform vec2 uTexel;
uniform float uFrame;
varying vec2 vUv;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

/**
 * The colour of halation.
 *
 * Red first and by a long way: the anti-halation backing on a colour film
 * absorbs blue and green well and red badly, so what comes back up through
 * the emulsion is the long end of the spectrum. On Fujifilm stocks it reads
 * as a warm orange rather than a pure red, which is what this is.
 */
const vec3 HALATION = vec3( 1.0, 0.30, 0.09 );

/** How far the bleed reaches, in pixels. About what a 35 mm frame shows. */
const float HALO_RADIUS = 5.0;

/** White noise on the pixel grid, reseeded each frame. */
float sfGrainHash( vec2 p, float seed ) {
  vec3 q = fract( p.xyx * vec3( 0.1031, 0.1030, 0.0973 ) + seed * 0.0173 );
  q += dot( q, q.yzx + 33.33 );
  return fract( ( q.x + q.y ) * q.z );
}

// Rec. 2020 <> Rec. 709, row-major in the standard and transposed here.
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
  vec3( 1.6605, - 0.1246, - 0.0182 ),
  vec3( - 0.5876, 1.1329, - 0.1006 ),
  vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
  vec3( 0.6274, 0.0691, 0.0164 ),
  vec3( 0.3293, 0.9195, 0.0880 ),
  vec3( 0.0433, 0.0113, 0.8956 )
);

// AgX, after Filament's port of Blender's: the inset, a log encoding over
// sixteen and a half stops, the sigmoid, the outset.
const mat3 AGX_INSET = mat3(
  vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
  vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
  vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
);
const mat3 AGX_OUTSET = mat3(
  vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
  vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
  vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
);
const float AGX_MIN_EV = - 12.47393;
const float AGX_MAX_EV = 4.026069;

vec3 agxSigmoid( vec3 x ) {
  vec3 x2 = x * x;
  vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2
    - 40.14 * x4 * x
    + 31.96 * x4
    - 6.868 * x2 * x
    + 0.4298 * x2
    + 0.1191 * x
    - 0.00232;
}

// An S through the middle of the encoded range: shadows pushed down by one
// power, highlights pushed up by a gentler one. Mid-grey does not move.
vec3 shoulder( vec3 v, float low, float high ) {
  vec3 down = 0.5 * pow( v * 2.0, vec3( low ) );
  vec3 up = 1.0 - 0.5 * pow( ( 1.0 - v ) * 2.0, vec3( high ) );
  return mix( down, up, step( 0.5, v ) );
}

// The stock. GLSL builds a matrix by columns, so each line is what one
// *input* channel contributes to the three outputs: red gives 3 % of itself
// to green and 2 % to blue, green gives 12 % to red and 10 % to blue, blue
// gives 2 % to red and 5 % to green. Every output row sums to one, so a grey
// stays the grey it was.
const mat3 CHROME = mat3(
  vec3( 0.86, 0.03, 0.02 ),
  vec3( 0.12, 0.92, 0.10 ),
  vec3( 0.02, 0.05, 0.88 )
);

vec4 sRGB( vec4 value ) {
  return vec4( mix(
    pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ),
    value.rgb * 12.92,
    vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) )
  ), value.a );
}

void main() {
  vec4 texel = texture2D( tDiffuse, vUv );
  vec3 color = texel.rgb * uExposure;

  // Halation, and it happens to the *light* rather than to the picture made
  // of it — so it goes in here, upstream of the curve, where a fringe can
  // still be brighter than white and be rolled off like anything else.
  //
  // Only across an edge. Taken as an absolute quantity it would be a warm
  // cast over every bright area in the frame, which is a lift and not a
  // halo; taken as the *excess* of the neighbourhood over this fragment it
  // is nothing in the middle of the sky and everything along the line where
  // a sunlit tower stops and the sky starts. Which is where a photograph has
  // it, and is the one place a render never does.
  if ( uHalation > 0.0 ) {
    float centre = dot( color, LUMA );
    float over = 0.0;
    for ( int i = 0; i < 8; i ++ ) {
      float a = ( float( i ) + 0.5 ) * 0.78539816;
      vec3 near = texture2D(
        tDiffuse, vUv + vec2( cos( a ), sin( a ) ) * uTexel * HALO_RADIUS
      ).rgb * uExposure;
      float lum = dot( near, LUMA );
      // Bright in itself, and brighter than here.
      over += max( 0.0, lum - centre ) * smoothstep( 0.35, 1.2, lum );
    }
    color += HALATION * over * 0.125 * uHalation;
  }

  // The lens loses light at the corners before the film ever sees it, so the
  // corners are *exposed* less rather than darkened afterwards — which is
  // why this is here and not at the end. They roll off through the shoulder
  // like anything else a stop down, instead of being multiplied flat.
  {
    float r = length( ( vUv - 0.5 ) * 2.0 );
    color *= 1.0 - uVignette * smoothstep( 0.35, 1.45, r );
  }

  // AgX.
  color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
  color = AGX_INSET * color;
  color = max( color, 1e-10 );
  color = ( log2( color ) - AGX_MIN_EV ) / ( AGX_MAX_EV - AGX_MIN_EV );
  color = clamp( color, 0.0, 1.0 );
  color = agxSigmoid( color );
  color = clamp( color, 0.0, 1.0 );

  // The look, in the encoded space where a power is a contrast.
  color = shoulder( color, uContrast, 1.0 + ( uContrast - 1.0 ) * 0.5 );
  float encodedLuma = dot( color, LUMA );
  color = encodedLuma + uPunch * ( color - encodedLuma );

  color = AGX_OUTSET * color;
  color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
  color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
  color = clamp( color, 0.0, 1.0 );

  // The stock, in display-linear.
  float luma = dot( color, LUMA );
  color = luma + uSaturation * ( color - luma );
  color = mix( color, CHROME * color, uChrome );

  // Cool where it is dark, warm where it is bright — the one thing a
  // channel mix cannot do, because a mix is the same at every level.
  float shade = pow( 1.0 - luma, 2.0 );
  float glare = luma * luma;
  vec3 tint = vec3( 1.0 )
    + shade * uSplit * vec3( - 0.04, 0.00, 0.05 )
    + glare * uSplit * vec3( 0.02, 0.00, - 0.03 );
  color *= tint;

  // The silver, last, because it is the emulsion and not the scene.
  // Multiplicative, so it cannot lift a black off zero, and weighted to the
  // midtones, because a blown highlight has no unexposed grain left to be
  // lumpy with and a black has none exposed.
  if ( uGrain > 0.0 ) {
    float level = clamp( dot( color, LUMA ), 0.0, 1.0 );
    float where = 4.0 * level * ( 1.0 - level );
    color *= 1.0 + ( sfGrainHash( gl_FragCoord.xy, uFrame ) - 0.5 ) * uGrain * where;
  }

  gl_FragColor = sRGB( vec4( clamp( color, 0.0, 1.0 ), texel.a ) );
}
`

export class FilmPass extends Pass {
  readonly look: FilmLook = { ...CLASSIC_CHROME }
  /** Scene radiance to display, before the curve. */
  exposure = 1

  private readonly material: THREE.ShaderMaterial
  private readonly quad: FullScreenQuad
  private frame = 0

  constructor() {
    super()
    this.material = new THREE.ShaderMaterial({
      name: 'Film',
      uniforms: {
        tDiffuse: { value: null },
        uExposure: { value: 1 },
        uContrast: { value: 1 },
        uSaturation: { value: 1 },
        uChrome: { value: 1 },
        uSplit: { value: 0 },
        uPunch: { value: 1 },
        uGrain: { value: 0 },
        uVignette: { value: 0 },
        uHalation: { value: 0 },
        uTexel: { value: new THREE.Vector2(1 / 1920, 1 / 1080) },
        uFrame: { value: 0 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    this.quad = new FullScreenQuad(this.material)
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    const u = this.material.uniforms
    u.tDiffuse!.value = readBuffer.texture
    u.uExposure!.value = this.exposure
    u.uContrast!.value = this.look.contrast
    u.uSaturation!.value = this.look.saturation
    u.uChrome!.value = this.look.chrome
    u.uSplit!.value = this.look.split
    u.uPunch!.value = this.look.punch
    u.uGrain!.value = this.look.grain
    u.uVignette!.value = this.look.vignette
    u.uHalation!.value = this.look.halation
    // The halo reaches a fixed number of *pixels*, so it has to be told how
    // big one is — and the app changes that on its own while it holds the
    // frame rate, so it is read from the buffer rather than stored.
    const size = readBuffer.texture.image as { width: number; height: number }
    ;(u.uTexel!.value as THREE.Vector2).set(
      1 / Math.max(1, size.width ?? 1),
      1 / Math.max(1, size.height ?? 1),
    )
    // Grain that does not move is a mark on the lens. One frame, one field
    // of silver; the counter wraps well before a float loses the integers.
    this.frame = (this.frame + 1) % 4096
    u.uFrame!.value = this.frame

    if (this.renderToScreen) {
      renderer.setRenderTarget(null)
    } else {
      renderer.setRenderTarget(writeBuffer)
      if (this.clear) renderer.clear()
    }
    this.quad.render(renderer)
  }

  override dispose(): void {
    this.material.dispose()
    this.quad.dispose()
  }
}
