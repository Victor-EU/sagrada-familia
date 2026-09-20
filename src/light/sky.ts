import * as THREE from 'three'

/**
 * The sky, and the light that comes off it.
 *
 * A plaster model lit by a studio probe looks like a plaster model. The
 * interior of Sagrada Família only reads when the ambient is an actual sky —
 * cool and bright overhead, pale at the horizon, warm and low at the ends of
 * the day — because half of what the walls are doing is catching that.
 *
 * The gradient is analytic rather than sampled: a Rayleigh-flavoured vertical
 * falloff plus a forward-scattering halo around the sun. It is not a physical
 * atmosphere model and is not trying to be. It is trying to put believable,
 * directional, colour-graded light into the room, and to do it cheaply enough
 * that dragging the time-of-day slider stays interactive.
 */

const SKY_VERTEX = /* glsl */ `
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uSunDirection;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
uniform vec3 uSunColor;
uniform float uHaloStrength;
uniform float uDiscStrength;
varying vec3 vDirection;

void main() {
  vec3 direction = normalize( vDirection );
  float up = direction.y;
  float cosAngle = dot( direction, uSunDirection );

  // Pale at the horizon, saturated overhead. Two powers: the fifth puts the
  // haze band where a wide-angle interior shot sees it, and the gentler one
  // carries a slow deepening through the middle of the sky, which is what
  // makes a frame of towers against sky read as a sky rather than a fill.
  float above = 1.0 - clamp( up, 0.0, 1.0 );
  float band = 0.55 * pow( above, 5.0 ) + 0.45 * pow( above, 1.6 );
  vec3 sky = mix( uZenith, uHorizon, band );

  // Forward scattering: a broad halo the whole sky near the sun shares, and
  // the disc itself at roughly its true half-degree.
  float halo = pow( max( cosAngle, 0.0 ), 6.0 );
  float disc = smoothstep( 0.99988, 0.99996, cosAngle );
  sky += uSunColor * halo * uHaloStrength;
  sky += uSunColor * disc * uDiscStrength;

  // Below the horizon is ground, not sky. It matters: it is half of what an
  // exterior surface sees, and it is what keeps undersides from going black.
  sky = mix( uGround, sky, smoothstep( -0.04, 0.012, up ) );

  gl_FragColor = vec4( sky, 1.0 );
}
`

/** Linear-space palettes, blended by sun altitude. */
const PALETTE = {
  // Barcelona in clear weather is a much deeper blue overhead than the first
  // palette allowed, and the pallor at the horizon was carrying the whole sky
  // toward grey — which is most of why the exterior read as a maquette under
  // a studio dome rather than a building standing in a city.
  //
  // Deeper again for the film. These are chosen for what comes out of
  // render/film.ts, not for what goes in: AgX greys a saturated blue on its
  // way through and the Classic Chrome mix darkens it, so the zenith here is
  // about half the radiance the old palette carried and lands on screen at
  // the cobalt a midday photograph of the fronts has — measured, 44 87 170
  // against the photograph's 28 78 160. The envelope's fill is scaled back
  // up separately, so the sky being darker does not make the shade darker.
  day: {
    zenith: new THREE.Vector3(0.013, 0.082, 0.40),
    horizon: new THREE.Vector3(0.44, 0.60, 0.90),
    ground: new THREE.Vector3(0.22, 0.20, 0.17),
    // Daylight is not white. A touch of amber here is what makes stone read
    // as stone, and it is what the sunlit faces in every photograph have.
    sun: new THREE.Vector3(1.0, 0.94, 0.84),
  },
  twilight: {
    zenith: new THREE.Vector3(0.06, 0.11, 0.30),
    horizon: new THREE.Vector3(0.98, 0.44, 0.18),
    ground: new THREE.Vector3(0.09, 0.07, 0.06),
    sun: new THREE.Vector3(1.0, 0.46, 0.16),
  },
  night: {
    zenith: new THREE.Vector3(0.008, 0.012, 0.030),
    horizon: new THREE.Vector3(0.020, 0.026, 0.052),
    ground: new THREE.Vector3(0.008, 0.008, 0.010),
    sun: new THREE.Vector3(0.3, 0.35, 0.5),
  },
} as const

export interface SkyState {
  /** Colour to give the directional light. */
  sunColor: THREE.Color
  /** Intensity for the directional light, before the user's multiplier. */
  sunIntensity: number
  /**
   * What the air between here and the horizon is the colour of.
   *
   * The sky already computes this — it is the horizon end of the gradient —
   * and handing it out means the haze that distance fades into is the same
   * colour as the thing behind the distance, at every hour. Picked by eye it
   * would be right at noon and a grey band across a red sunset.
   */
  hazeColor: THREE.Color
}

export class Sky {
  readonly material: THREE.ShaderMaterial
  private readonly scene = new THREE.Scene()
  private readonly cubeTarget: THREE.WebGLCubeRenderTarget
  private readonly cubeCamera: THREE.CubeCamera
  private readonly pmrem: THREE.PMREMGenerator
  private envTarget: THREE.WebGLRenderTarget | null = null

  /** Overall brightness of the sky dome, for taste. */
  brightness = 1

  constructor(renderer: THREE.WebGLRenderer, resolution = 256) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
        uZenith: { value: PALETTE.day.zenith.clone() },
        uHorizon: { value: PALETTE.day.horizon.clone() },
        uGround: { value: PALETTE.day.ground.clone() },
        uSunColor: { value: PALETTE.day.sun.clone() },
        uHaloStrength: { value: 0.34 },
        uDiscStrength: { value: 40 },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      toneMapped: false,
    })

    this.scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), this.material))

    this.cubeTarget = new THREE.WebGLCubeRenderTarget(resolution, {
      type: THREE.HalfFloatType,
    })
    this.cubeCamera = new THREE.CubeCamera(0.1, 10, this.cubeTarget)
    this.pmrem = new THREE.PMREMGenerator(renderer)
    this.pmrem.compileCubemapShader()
  }

  /** Sharp cubemap, for `scene.background`. */
  get background(): THREE.Texture {
    return this.cubeTarget.texture
  }

  /** Pre-filtered radiance, for `scene.environment`. */
  get environment(): THREE.Texture | null {
    return this.envTarget?.texture ?? null
  }

  /**
   * Re-light the sky for a sun direction.
   *
   * Call it when the sun moves, not every frame: it re-renders six cube faces
   * and re-runs the PMREM chain, which is a millisecond or two — nothing at a
   * slider's pace, everything at sixty hertz.
   */
  update(renderer: THREE.WebGLRenderer, sunDirection: THREE.Vector3): SkyState {
    const altitude = Math.asin(THREE.MathUtils.clamp(sunDirection.y, -1, 1))
    const degrees = THREE.MathUtils.radToDeg(altitude)

    // Three-way blend. Twilight is deliberately wide: the long warm end of a
    // Barcelona afternoon is most of what the Passion glazing was designed for.
    const day = THREE.MathUtils.smoothstep(degrees, 3, 18)
    const dusk = THREE.MathUtils.smoothstep(degrees, -9, 3) * (1 - day)
    const night = Math.max(0, 1 - day - dusk)

    const u = this.material.uniforms
    blend(u.uZenith.value, day, dusk, night, 'zenith', this.brightness)
    blend(u.uHorizon.value, day, dusk, night, 'horizon', this.brightness)
    blend(u.uGround.value, day, dusk, night, 'ground', this.brightness)
    blend(u.uSunColor.value, day, dusk, night, 'sun', 1)
    u.uSunDirection.value.copy(sunDirection)
    u.uDiscStrength.value = 40 * (day + dusk * 0.5)

    this.cubeCamera.update(renderer, this.scene)

    const next = this.pmrem.fromCubemap(this.cubeTarget.texture, this.envTarget)
    this.envTarget = next

    // Extinction through the atmosphere: the sun loses most of its blue and
    // much of its strength in the last ten degrees above the horizon.
    const sun = u.uSunColor.value
    const reach = THREE.MathUtils.smoothstep(degrees, -1.5, 7)
    const thickness = THREE.MathUtils.lerp(0.42, 1, THREE.MathUtils.smoothstep(degrees, 0, 32))

    const horizon = u.uHorizon.value
    return {
      sunColor: new THREE.Color(sun.x, sun.y, sun.z),
      sunIntensity: 4.2 * reach * thickness,
      hazeColor: new THREE.Color(horizon.x, horizon.y, horizon.z),
    }
  }

  dispose(): void {
    this.cubeTarget.dispose()
    this.envTarget?.dispose()
    this.pmrem.dispose()
    this.material.dispose()
  }
}

function blend(
  out: THREE.Vector3,
  day: number,
  dusk: number,
  night: number,
  key: 'zenith' | 'horizon' | 'ground' | 'sun',
  scale: number,
): void {
  out
    .copy(PALETTE.day[key])
    .multiplyScalar(day)
    .addScaledVector(PALETTE.twilight[key], dusk)
    .addScaledVector(PALETTE.night[key], night)
    .multiplyScalar(scale)
}
