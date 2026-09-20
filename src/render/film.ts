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
}

export const CLASSIC_CHROME: FilmLook = {
  contrast: 1.28,
  saturation: 0.9,
  chrome: 1,
  split: 0.5,
  punch: 1.45,
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
varying vec2 vUv;

const vec3 LUMA = vec3( 0.2126, 0.7152, 0.0722 );

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

  gl_FragColor = sRGB( vec4( clamp( color, 0.0, 1.0 ), texel.a ) );
}
`

export class FilmPass extends Pass {
  readonly look: FilmLook = { ...CLASSIC_CHROME }
  /** Scene radiance to display, before the curve. */
  exposure = 1

  private readonly material: THREE.ShaderMaterial
  private readonly quad: FullScreenQuad

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
