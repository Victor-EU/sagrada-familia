import * as THREE from 'three'
import { buildInscription, textWidth } from './letters.ts'
import { mergeOrEmpty } from './window.ts'

/**
 * What stands on the roof.
 *
 * From the street the roof of this building is a silhouette of two things,
 * and the model had neither. The first is the **gables**: over every bay of
 * the clerestory a steep triangle stands on the wall head, its rakes edged in
 * a saw of stone teeth, with a round light in its face and a V of valley
 * between it and the next — so the roofline is a row of peaks and not a
 * parapet. The second is the **fruit**: every pinnacle on the building is
 * crowned with a basket of glazed ceramic — grapes, apples, peaches, a wheat
 * sheaf — and it is the only colour on a sandstone building, which is why it
 * is what people photograph from the towers.
 *
 * Both are cheap. A gable is six vertices and a saw is a triangle wave; a
 * basket of fruit is thirty spheres on a lattice with some noise in it. What
 * they buy is the difference between a roof and a lid.
 */

export interface GableParams {
  /** Width along the wall. One bay. */
  span: number
  /** Height of the apex above the wall head. */
  rise: number
  /** How far back from the wall face the gable runs before it dies into it. */
  depth: number
  /** Stone teeth along each rake: how many, and how far they stand proud. */
  teeth: number
  toothDepth: number
  /** Radius of the light in the gable's face. Zero for none. */
  eye: number
  /** A word cut across the face. Empty for a blank gable. */
  word?: string
}

/**
 * One gable, in its own frame: x across the wall, y up from the wall head,
 * z back from the wall face (so the gable occupies negative z).
 *
 * Built as a tapered wedge rather than a plain prism: the front triangle
 * stands full height at the wall face and a smaller one closes it at the
 * back, which is what gives the rake its perspective and stops a row of them
 * reading as a cardboard cut-out.
 */
export function buildGable(p: GableParams): THREE.BufferGeometry[] {
  const half = p.span / 2
  const back = -p.depth
  const rear = p.rise * 0.34

  // Front triangle, back triangle. Index 0,1 are the eaves; 2 is the apex.
  const front: THREE.Vector3[] = [
    new THREE.Vector3(-half, 0, 0),
    new THREE.Vector3(half, 0, 0),
    new THREE.Vector3(0, p.rise, 0),
  ]
  const rearHalf = half * 0.82
  const behind: THREE.Vector3[] = [
    new THREE.Vector3(-rearHalf, 0, back),
    new THREE.Vector3(rearHalf, 0, back),
    new THREE.Vector3(0, rear, back),
  ]

  const positions: number[] = []
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  }
  // Face, back, two rakes, and the soffit that closes it onto the deck.
  tri(front[0]!, front[1]!, front[2]!)
  tri(behind[1]!, behind[0]!, behind[2]!)
  for (const [i, j] of [
    [1, 2],
    [2, 0],
    [0, 1],
  ] as const) {
    tri(front[i]!, behind[i]!, behind[j]!)
    tri(front[i]!, behind[j]!, front[j]!)
  }

  const body = new THREE.BufferGeometry()
  body.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  body.computeVertexNormals()

  const pieces = [body]
  if (p.teeth > 0 && p.toothDepth > 0) pieces.push(rakeTeeth(p, half))
  if (p.word) {
    // Low in the face, under the light, where the triangle is still wide
    // enough to hold a word — and sized so it never runs out past the rake.
    // Every gable on the apse in `reference/ex-apse-flank-west.jpg` carries
    // one: Amen, Honor, Poder, Accio de Gracies, all of them legible from
    // the street, and they are most of why that roofline reads as built
    // rather than as extruded.
    const at = p.rise * 0.15
    const room = 2 * half * (1 - at / p.rise) * 0.86
    const size = Math.min(p.rise * 0.16, room / Math.max(0.5, textWidth(p.word)))
    const line = buildInscription({ text: p.word, size, relief: 0.2 })
    line.translate((-textWidth(p.word) * size) / 2, at, 0.02)
    pieces.push(line)
  }
  if (p.eye > 0.05) {
    // The light sits low in the face, where the triangle is still wide enough
    // to hold it, and it is a ring rather than a disc: there is a window in
    // there and the gable is a frame for it.
    const ring = new THREE.TorusGeometry(p.eye, p.eye * 0.26, 6, 20)
    ring.translate(0, p.rise * 0.44, 0.14)
    pieces.push(ring)
  }
  return pieces
}

/**
 * The saw along a rake.
 *
 * Not decoration: it is the thing that makes a gable in this building read as
 * cut stone rather than as a folded plane, and it is on every rake, cornice
 * and parapet edge in the photographs. Each tooth is a little pyramid
 * standing on the sloping edge, spaced evenly along it.
 */
function rakeTeeth(p: GableParams, half: number): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const apex = new THREE.Vector3(0, p.rise, 0)
  for (const side of [-1, 1]) {
    const foot = new THREE.Vector3(side * half, 0, 0)
    for (let i = 0; i < p.teeth; i++) {
      const t = (i + 0.5) / p.teeth
      const at = foot.clone().lerp(apex, t)
      // Shrinking toward the apex, because the stone runs out there.
      const size = p.toothDepth * (1 - 0.45 * t)
      const tooth = new THREE.ConeGeometry(size, size * 2.1, 4, 1)
      tooth.rotateX(Math.PI / 2)
      tooth.rotateZ(side * -0.55)
      tooth.translate(at.x, at.y, at.z + size * 0.5)
      pieces.push(tooth)
    }
  }
  return mergeOrEmpty(pieces)
}

export interface FruitParams {
  /** Radius of the cluster. */
  radius: number
  /** How many pieces of fruit. */
  count: number
  seed: number
  /** Glazes to paint the berries with. Without one the basket is stone. */
  palette?: readonly number[]
}

/**
 * A basket of fruit, for the top of a pinnacle.
 *
 * Spheres on a jittered spherical lattice, slightly flattened and hanging a
 * little below its middle — which is what a basket does, and what every
 * photograph of these shows: the cluster is widest below halfway and closes
 * to a point on top, where a small cap sits.
 *
 * Painted per berry rather than per basket, but not at random. In
 * `reference/ex-terraces-roofscape.jpg` each basket is plainly *the green
 * one* or *the red one* — one glaze dominates and a handful of pieces break
 * it — so the seed picks a dominant and most berries take it. A basket with
 * an even mix of all five is a bowl of sweets, which is the failure the old
 * cream was trying to avoid and avoided by giving up the colour entirely.
 */
export function buildFruit(p: FruitParams): THREE.BufferGeometry {
  const random = mulberry(p.seed)
  const pieces: THREE.BufferGeometry[] = []
  const count = Math.max(6, Math.round(p.count))
  const glazes = p.palette
  // The pale glaze is kept last in the palette and used as the accent.
  const dominant = glazes ? p.seed % Math.max(1, glazes.length - 1) : 0
  const paint = (geometry: THREE.BufferGeometry, hex: number): void => {
    if (!glazes) return
    const n = geometry.getAttribute('position').count
    const colour = new Float32Array(n * 3)
    const c = new THREE.Color(hex).convertSRGBToLinear()
    for (let i = 0; i < n; i++) {
      colour[i * 3] = c.r
      colour[i * 3 + 1] = c.g
      colour[i * 3 + 2] = c.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  }

  for (let i = 0; i < count; i++) {
    // Fibonacci on the sphere, so they spread without clumping, then pulled
    // down and in so the cluster is a pear rather than a ball.
    const t = (i + 0.5) / count
    const y = 1 - 2 * t
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const angle = i * 2.399963
    const droop = 0.62 + 0.38 * (1 - t)
    const r = p.radius * (0.82 + random() * 0.22)
    const berry = p.radius * (0.3 + random() * 0.14)
    // Five by three. A berry is two metres across and forty-five up: the
    // silhouette of the cluster is the whole of what anybody sees of it.
    const sphere = new THREE.SphereGeometry(berry, 5, 3)
    sphere.translate(
      Math.cos(angle) * ring * r * droop,
      y * r * 0.86 + p.radius * 0.1,
      Math.sin(angle) * ring * r * droop,
    )
    if (glazes) {
      const roll = random()
      const pick =
        roll < 0.66
          ? dominant
          : roll < 0.88
            ? (dominant + 1 + Math.floor(random() * 2)) % Math.max(1, glazes.length - 1)
            : glazes.length - 1
      paint(sphere, glazes[pick] ?? 0xffffff)
    }
    pieces.push(sphere)
  }

  // The cap: a small stone finial the cluster is gathered under.
  const cap = new THREE.ConeGeometry(p.radius * 0.34, p.radius * 1.0, 6, 1)
  cap.translate(0, p.radius * 1.35, 0)
  paint(cap, 0xcfc6b4)
  pieces.push(cap)

  return mergeOrEmpty(pieces)
}

/** Small deterministic PRNG, so a rebuild grows the same fruit. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GargoyleParams {
  /** How far it stands out from the wall. */
  reach: number
  /** How far the head hangs below the root. */
  drop: number
  /** Widest across the body. */
  girth: number
  /** Sides round the body. */
  sides: number
  seed: number
}

/**
 * A gargoyle, as a shape rather than as an animal.
 *
 * Every cornice on the apse in `reference/ex-apse-flank-west.jpg` carries a
 * row of these, and what they are at that distance — which is the only
 * distance any viewpoint in this project sees them from — is not a lizard or
 * a snail. It is a dark knuckle standing a metre and a half out of the wall
 * at the one place where the wall turns a corner, breaking the cornice line
 * and throwing a shadow back onto it. That is the whole of the effect and it
 * is worth two hundred triangles.
 *
 * So: a tube swept along a curve that leaves the wall level, arcs out and
 * falls, with a shoulder near the root and a flare at the head. No face, no
 * limbs, no attempt at a creature. The real ones *are* creatures and at
 * sixty metres nobody has ever been able to tell, which is the argument for
 * building the mass and stopping.
 *
 * Its own frame: the wall is the xy plane, z runs out of it, y is up.
 */
export function buildGargoyle(p: GargoyleParams): THREE.BufferGeometry {
  const random = mulberry(p.seed)
  const rings = 9
  const sides = Math.max(4, p.sides)
  // A little sideways set, so a row of them is not a row of one.
  const sway = (random() - 0.5) * p.girth * 1.6
  const positions: number[] = []

  const at = (t: number): THREE.Vector3 =>
    new THREE.Vector3(
      sway * Math.sin(t * 2.4),
      -p.drop * Math.pow(t, 1.9),
      p.reach * t,
    )
  /** Base, plus a shoulder near the root and a flare at the head. */
  const girthAt = (t: number): number =>
    p.girth *
    (0.34 +
      0.62 * Math.exp(-(((t - 0.3) / 0.3) ** 2)) +
      0.55 * Math.exp(-(((t - 0.9) / 0.13) ** 2)))

  const ring = (t: number): THREE.Vector3[] => {
    const centre = at(t)
    const ahead = at(Math.min(1, t + 0.02))
    const behind = at(Math.max(0, t - 0.02))
    const axis = ahead.clone().sub(behind).normalize()
    const side = new THREE.Vector3(1, 0, 0).cross(axis).normalize()
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0)
    const up = axis.clone().cross(side).normalize()
    const r = girthAt(t)
    const out: THREE.Vector3[] = []
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2
      // Squashed, because a gargoyle is a beam with a beast cut on it and a
      // round tube reads as a drainpipe.
      out.push(
        centre
          .clone()
          .addScaledVector(side, Math.cos(a) * r)
          .addScaledVector(up, Math.sin(a) * r * 0.76),
      )
    }
    return out
  }

  let previous = ring(0)
  for (let k = 1; k <= rings; k++) {
    const current = ring(k / rings)
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides
      const a = previous[i]!
      const b = previous[j]!
      const c = current[j]!
      const d = current[i]!
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
    }
    previous = current
  }
  // Close the head, so the mouth is not an open pipe against the sky.
  const tip = at(1)
  for (let i = 0; i < sides; i++) {
    const a = previous[i]!
    const b = previous[(i + 1) % sides]!
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}
