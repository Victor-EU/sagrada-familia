import * as THREE from 'three'
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
}

/**
 * A basket of fruit, for the top of a pinnacle.
 *
 * Spheres on a jittered spherical lattice, slightly flattened and hanging a
 * little below its middle — which is what a basket does, and what every
 * photograph of these shows: the cluster is widest below halfway and closes
 * to a point on top, where a small cap sits.
 */
export function buildFruit(p: FruitParams): THREE.BufferGeometry {
  const random = mulberry(p.seed)
  const pieces: THREE.BufferGeometry[] = []
  const count = Math.max(6, Math.round(p.count))

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
    pieces.push(sphere)
  }

  // The cap: a small stone finial the cluster is gathered under.
  const cap = new THREE.ConeGeometry(p.radius * 0.34, p.radius * 1.0, 6, 1)
  cap.translate(0, p.radius * 1.35, 0)
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
