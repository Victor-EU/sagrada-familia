import * as THREE from 'three'

/**
 * The glazing.
 *
 * Vila-Grau's windows are not pictures; they are a colour temperature gradient
 * wrapped around the building. The Nativity side, which takes the sunrise, is
 * glazed in greens and blues; the Passion side, which takes the sunset, in
 * reds and oranges. Both wash out toward white as they climb, so the vault
 * stays luminous instead of being stained by whatever is below it.
 *
 * A pane is a flat quadrilateral of one colour. That is literally what leaded
 * glass is, so the cheapest possible representation is also the accurate one:
 * a jittered grid, flat-shaded per cell, carrying its colour in a vertex
 * attribute. One geometry, one draw call, and the colours are already in the
 * buffer that the transmittance pass needs to read.
 */

export type GlassSide = 'nativity' | 'passion'

export interface GlassPanelParams {
  width: number
  height: number
  /** Panes across. */
  columns: number
  /** Panes up. */
  rows: number
  /** How far interior grid nodes wander, as a fraction of a cell. */
  jitter: number
  seed: number
  side: GlassSide
  /** Height of the sill in the building, normalised 0 at the floor, 1 at the vault. */
  gradeBase: number
  /** Height of the head, same units. */
  gradeTop: number
  /**
   * Where this window stands along the nave: 0 at the Glory end, 1 at the
   * crossing.
   *
   * The grading is not only vertical. The glass nearest the entrance is
   * almost clear and deepens as you walk in, so that the colour arrives
   * gradually rather than all at once in the doorway.
   */
  along: number
}

export const defaultGlassPanel: GlassPanelParams = {
  width: 2.4,
  height: 11,
  columns: 4,
  rows: 11,
  jitter: 0.22,
  seed: 1,
  side: 'nativity',
  gradeBase: 0.1,
  gradeTop: 0.45,
  along: 1,
}

/**
 * Hue sweeps, low to high. Saturated at the bottom of the building, washing
 * out with height — the grading is the whole design, so it lives in one place.
 */
const SWEEP: Record<GlassSide, { low: number; high: number }> = {
  // Green through teal to deep blue.
  nativity: { low: 0.36, high: 0.62 },
  // Crimson through orange to gold. Runs forward through the wrap at 0.
  passion: { low: -0.03, high: 0.14 },
}

/**
 * One window, in the XY plane: x across, y from 0 at the sill, z = 0.
 *
 * Positioning is the caller's business, which keeps this function free of any
 * opinion about which wall it is in.
 */
export function buildGlassPanel(p: GlassPanelParams): THREE.BufferGeometry {
  const random = mulberry32(p.seed)
  const cols = Math.max(1, Math.round(p.columns))
  const rows = Math.max(1, Math.round(p.rows))

  // Grid nodes first, jittered once so adjacent panes share an edge exactly
  // and the leading reads as a continuous net rather than as loose tiles.
  const nodes: THREE.Vector2[] = []
  const cellW = p.width / cols
  const cellH = p.height / rows
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || i === cols || j === 0 || j === rows
      const wobble = edge ? 0 : p.jitter
      nodes.push(
        new THREE.Vector2(
          -p.width / 2 + i * cellW + (random() - 0.5) * 2 * wobble * cellW,
          j * cellH + (random() - 0.5) * 2 * wobble * cellH,
        ),
      )
    }
  }

  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const color = new THREE.Color()

  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = nodes[j * (cols + 1) + i]
      const b = nodes[j * (cols + 1) + i + 1]
      const c = nodes[(j + 1) * (cols + 1) + i + 1]
      const d = nodes[(j + 1) * (cols + 1) + i]

      // Grade by where this pane sits in the building, not in the panel: two
      // windows at different heights must agree about what colour that height
      // is, or the building loses the gradient.
      const v = (j + 0.5) / rows
      const grade = THREE.MathUtils.lerp(p.gradeBase, p.gradeTop, v)
      paneColor(color, p.side, (i + 0.5) / cols, grade, p.along, random)

      const base = positions.length / 3
      for (const n of [a, b, c, d]) {
        positions.push(n.x, n.y, 0)
        colors.push(color.r, color.g, color.b)
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Colour of one pane.
 *
 * `u` is its position across the light, `grade` its height in the building.
 * Both feed the hue so the sweep runs diagonally, which is what stops a wall
 * of windows from reading as a set of identical stripes.
 */
export function paneColor(
  out: THREE.Color,
  side: GlassSide,
  u: number,
  grade: number,
  along: number,
  random: () => number,
): THREE.Color {
  const sweep = SWEEP[side]
  const t = THREE.MathUtils.clamp(grade * 1.25 + (u - 0.5) * 0.14 + (random() - 0.5) * 0.16, 0, 1)
  // The sweep says what colour this height is; the pane says how nearly it
  // agrees. A window with no scatter about its own gradient is a gradient,
  // and leaded glass is not a gradient — the panes next to each other in
  // every photograph here are a crimson, an orange and a gold, cut from
  // different sheets and set by somebody's eye. The jitter has to be in hue
  // and not in the sweep parameter: the Passion sweep is a sixth of the
  // circle wide, so a healthy-looking wobble along it moves the hue by about
  // a degree and comes out as one flat colour.
  const hue = (THREE.MathUtils.lerp(sweep.low, sweep.high, t) + (random() - 0.5) * 0.075 + 1) % 1

  // The wash toward white.
  //
  // This used to run all the way to a saturation of 0.16, which put pale grey
  // glass across the top two thirds of every window — and pale grey glass is
  // the one thing Vila-Grau did not make. The windows lighten as they climb,
  // but they never stop being coloured: the upper lights in the photographs
  // are still unmistakably green, or blue, or gold. The range below keeps
  // them so, and the vault above still reads as luminous because what lights
  // it is the sun through the glass rather than the glass going white.
  //
  // The walk from the Glory end still adds to it, so the colour gathers as
  // you go in rather than arriving all at once in the doorway — but half as
  // strongly as before, because the first bay had been glazed nearly clear.
  const entrance = THREE.MathUtils.lerp(0.22, 0, THREE.MathUtils.clamp(along, 0, 1))
  const wash = THREE.MathUtils.clamp((grade - 0.3) / 0.55 + entrance, 0, 1)
  const saturation = THREE.MathUtils.lerp(0.98, 0.56, wash) * (0.74 + random() * 0.44)
  const lightness = THREE.MathUtils.lerp(0.33, 0.7, wash) * (0.78 + random() * 0.48)

  return out.setHSL(
    hue,
    THREE.MathUtils.clamp(saturation, 0, 1),
    THREE.MathUtils.clamp(lightness, 0, 1),
    THREE.SRGBColorSpace,
  )
}

/**
 * Glass knows which side the sun is on.
 *
 * An unlit pane looks the same from both faces, which is the one thing
 * stained glass never does: from outside in daylight it is a dark panel set
 * in stone, and from inside it is the brightest thing for a hundred metres.
 * The cue is simply whether the sun and the eye are on opposite faces, which
 * is the sign of `(N·S)(N·V)` and costs two dot products.
 */
const GLASS_VERTEX = /* glsl */ `
attribute vec3 color;
varying vec3 vPaneColor;
varying vec3 vPaneNormal;
varying vec3 vPaneWorld;
void main() {
  vPaneColor = color;
  vPaneNormal = normalize( mat3( modelMatrix ) * normal );
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vPaneWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const GLASS_FRAGMENT = /* glsl */ `
uniform vec3 uSunDirection;
uniform float uGlow;
uniform float uFront;
uniform float uBlaze;
uniform float uFocus;
varying vec3 vPaneColor;
varying vec3 vPaneNormal;
varying vec3 vPaneWorld;
void main() {
  vec3 N = normalize( vPaneNormal );
  vec3 V = normalize( cameraPosition - vPaneWorld );
  float towardSun = dot( N, uSunDirection );
  float towardEye = dot( N, V );

  // Opposite signs mean the sun is behind the pane from where we stand.
  // Fading by |towardSun| stops a grazing sun from lighting the whole window.
  float backlit =
    smoothstep( 0.0, 0.10, - towardSun * towardEye ) *
    smoothstep( 0.0, 0.22, abs( towardSun ) );

  // What is behind the pane is not one brightness. It is a sky, and somewhere
  // in that sky is the disc — so a window seen from inside has a core of a
  // few square metres that is white and unreadable and a whole remaining
  // acreage that is the deepest colour in the building. Photograph after
  // photograph in the folder is exactly that: a blazing middle with saturated
  // crimson and gold around it.
  //
  // Lit flat, the window is one brightness, and whatever it is it is wrong.
  // High enough to blaze and ACES desaturates the entire wall to a pale
  // wash — which is what this did, and why an interior glazed in Vila-Grau's
  // reds came out the colour of weak tea. Low enough to keep the colour and
  // no window in the building is ever the brightest thing in it.
  //
  // So the blaze is put where it belongs: on the line of sight to the sun.
  // Looking along the ray that continues into the disc is the only direction
  // that sees it, which costs one dot product and gives both at once.
  float solar = pow( max( dot( - V, uSunDirection ), 0.0 ), uFocus );
  float gain = mix( uFront, uGlow + uBlaze * solar, backlit );

  gl_FragColor = vec4( vPaneColor * gain, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export interface GlassMaterial extends THREE.ShaderMaterial {
  uniforms: {
    uSunDirection: { value: THREE.Vector3 }
    uGlow: { value: number }
    uFront: { value: number }
    uBlaze: { value: number }
    uFocus: { value: number }
  }
}

export function glassMaterial(glow = 1.7): GlassMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uGlow: { value: glow },
      // Seen from the sunlit side a window is darker than the stone around it.
      uFront: { value: 0.22 },
      /** How much brighter the disc is than the sky it sits in. */
      uBlaze: { value: 26 },
      /** How tightly that is concentrated. Half a degree, near enough. */
      uFocus: { value: 900 },
    },
    vertexShader: GLASS_VERTEX,
    fragmentShader: GLASS_FRAGMENT,
    side: THREE.DoubleSide,
  }) as GlassMaterial
}

/**
 * The same geometry seen by the sun: raw transmittance, no gain, no tone
 * mapping. What this pass writes is multiplied into the sunlight, so it has
 * to be the honest colour of the glass and nothing else.
 */
export function transmittanceMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  })
}

/** Small deterministic PRNG, so a rebuild reproduces the same window. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
