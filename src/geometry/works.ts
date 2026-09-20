import * as THREE from 'three'
import { mergeOrEmpty } from './window.ts'

/**
 * The plant, which is part of the building.
 *
 * There is a crane in every exterior photograph in `reference/`, two in three
 * of them, and in `ex-flank-elevation.jpg` the crane is the second largest
 * object in the frame. `ex-apse-flank-west.jpg` has two cranes, a scaffold
 * tower standing on the roof, and two tower tops wrapped in sheeting.
 * `ex-terraces-roofscape.jpg`, taken from a bell tower, has a red scaffold
 * tower in the middle of the nave roof and site huts beside it.
 *
 * This is not set dressing. Sagrada Família has been a building site for a
 * hundred and forty years and nobody alive has seen it without one; for
 * anybody looking at a picture of it, the crane is as much of the outline as
 * the towers are. A model that leaves the plant out is not modelling the
 * building as it stands — it is modelling a finished building that does not
 * exist yet, and then wondering why the frame looks like an architect's
 * visualisation rather than a photograph.
 *
 * Everything here is one generator. A crane mast, a crane jib and a scaffold
 * tower are the same object at three sizes and two orientations: a square
 * lattice of four legs, ties every bay, and one diagonal a face. Steel is the
 * cheapest thing in this project to draw and the most expensive to get wrong,
 * so the members are deliberately chunky — a quarter-metre angle is a third
 * of a pixel from the plaza and would do nothing but shimmer.
 */

export interface LatticeParams {
  /** How long, along local +y. */
  length: number
  /** Across the section at the foot. */
  width: number
  /** Across the section at the head. Defaults to `width`. */
  head?: number
  /** Spacing of the ties. */
  bay: number
  /** Thickness of a member. */
  member: number
}

/**
 * A square lattice mast, standing on the origin and running up +y.
 *
 * Four legs, a square of ties at every bay, and one diagonal per face per bay
 * with its hand alternating — which is what a real mast does and what stops
 * the thing reading as a zip when the bays line up down a long jib.
 */
export function buildLattice(p: LatticeParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const bays = Math.max(1, Math.round(p.length / p.bay))
  const head = p.head ?? p.width
  const m = p.member
  const halfAt = (t: number): number => THREE.MathUtils.lerp(p.width, head, t) / 2

  const bar = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
  ): void => {
    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    const len = Math.hypot(dx, dy, dz)
    if (len < 1e-4) return
    const box = new THREE.BoxGeometry(m, len, m)
    // Stand the box along the segment: rotate +y onto it, then sit it at the
    // midpoint. A quaternion rather than two Euler angles, because a jib bar
    // that happens to be vertical sends the second angle to whatever it likes.
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx / len, dy / len, dz / len),
    )
    box.applyQuaternion(q)
    box.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2)
    pieces.push(box)
  }

  /** The four legs, one corner at a time, in straight runs bay by bay. */
  const corners = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ] as const
  for (let i = 0; i < bays; i++) {
    const t0 = i / bays
    const t1 = (i + 1) / bays
    const y0 = t0 * p.length
    const y1 = t1 * p.length
    const h0 = halfAt(t0)
    const h1 = halfAt(t1)
    for (const [sx, sz] of corners) {
      bar(sx * h0, y0, sz * h0, sx * h1, y1, sz * h1)
    }
    // The square of ties at the head of this bay.
    for (let c = 0; c < 4; c++) {
      const a = corners[c]!
      const b = corners[(c + 1) % 4]!
      bar(a[0] * h1, y1, a[1] * h1, b[0] * h1, y1, b[1] * h1)
      // One diagonal, handed off the bay index so the pattern zig-zags.
      const flip = (i + c) % 2 === 0
      if (flip) bar(a[0] * h0, y0, a[1] * h0, b[0] * h1, y1, b[1] * h1)
      else bar(b[0] * h0, y0, b[1] * h0, a[0] * h1, y1, a[1] * h1)
    }
  }
  // And the square at the foot, so the bottom is closed.
  for (let c = 0; c < 4; c++) {
    const a = corners[c]!
    const b = corners[(c + 1) % 4]!
    const h = halfAt(0)
    bar(a[0] * h, 0, a[1] * h, b[0] * h, 0, b[1] * h)
  }
  return mergeOrEmpty(pieces)
}

export interface CraneParams {
  /** Height of the mast to the slewing ring. */
  height: number
  /** Reach of the jib from the mast centre. */
  jib: number
  /** Reach of the counter-jib. */
  counter: number
  /** Across the mast. */
  mast: number
  /** Where the hook hangs along the jib, and how far down. */
  trolley: number
  drop: number
  /** Slew, radians. */
  turn: number
}

/**
 * A tower crane, standing on the origin.
 *
 * The proportions are off `ex-apse-flank-west.jpg` and `ex-flank-elevation.jpg`
 * rather than out of a catalogue: a mast about two metres across carrying a
 * jib three quarters of its own height long, a counter-jib a third of that
 * with the block on the end of it, and the hoist rope hanging from a trolley
 * two thirds out. The cab and the A-frame are left off — at the distance
 * these stand from any viewpoint in this project they are four pixels, and
 * four pixels of extra geometry a hundred metres up is four pixels of
 * shimmer.
 */
export function buildCrane(p: CraneParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []

  const mast = buildLattice({
    length: p.height,
    width: p.mast,
    bay: p.mast * 2.2,
    member: Math.max(0.22, p.mast * 0.11),
  })
  pieces.push(mast)

  const arm = (reach: number, sign: number, deep: number): THREE.BufferGeometry => {
    const lattice = buildLattice({
      length: reach,
      width: deep,
      head: deep * 0.62,
      bay: deep * 2.4,
      member: Math.max(0.2, deep * 0.12),
    })
    // Built standing up, laid down along ±x, and lifted to the slewing ring.
    lattice.rotateZ((-sign * Math.PI) / 2)
    lattice.translate(0, p.height + deep * 0.6, 0)
    return lattice
  }
  pieces.push(arm(p.jib, 1, p.mast * 0.95))
  pieces.push(arm(p.counter, -1, p.mast * 0.95))

  // The counterweight, which is the heaviest-looking thing in the sky and
  // the one part of a crane that reads as solid from any distance.
  const block = new THREE.BoxGeometry(p.mast * 1.5, p.mast * 1.4, p.mast * 1.5)
  block.translate(-p.counter * 0.86, p.height + p.mast * 0.6, 0)
  pieces.push(block)

  // Hoist rope and hook block. A rope is below a pixel wide at any range
  // this is seen from, so it is drawn at a member's thickness — which is
  // what a photograph of one looks like anyway, a dark hairline.
  const rope = new THREE.BoxGeometry(0.16, p.drop, 0.16)
  rope.translate(p.trolley, p.height + p.mast * 0.6 - p.drop / 2, 0)
  pieces.push(rope)
  const hook = new THREE.BoxGeometry(0.9, 1.2, 0.9)
  hook.translate(p.trolley, p.height + p.mast * 0.6 - p.drop, 0)
  pieces.push(hook)

  const crane = mergeOrEmpty(pieces)
  crane.rotateY(p.turn)
  return crane
}
