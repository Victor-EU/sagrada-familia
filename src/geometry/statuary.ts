import * as THREE from 'three'
import { mulberry32 } from './glass.ts'
import { mergeOrEmpty } from './window.ts'

/**
 * The sculpture on the Nativity front.
 *
 * The front had an encrustation and no sculpture, and the note that put it
 * there said so out loud: *the sculpture is out of scope and would be a lie
 * to fake*. That was two mistakes in one sentence.
 *
 * The first is the claim underneath it — that from the width of the plaza
 * this front is read as a texture rather than as figures. Hold any
 * photograph taken from Plaça de Gaudí against the model and it is not
 * true. At a hundred metres you cannot read a face, but you read *people*:
 * uprights a little taller than a door, standing in rows on brackets, each
 * one under a pointed hood that puts a hard black triangle over it. That
 * reading survives to the far side of the plaza, and it is most of what
 * separates this front from the Passion front, which really is bare.
 *
 * The second is the scale it chose instead. Bosses of a quarter of a metre
 * on a front thirty metres wide are below the size any of this is seen at:
 * past forty metres they average into one flat tone and the front goes back
 * to being a wall. What the eye is actually catching on in the photographs
 * is a metre or two of projection, over and over — canopies, corbels,
 * foliage the size of a person — throwing a hundred small hard shadows down
 * a face that is otherwise a cliff.
 *
 * So this is not a carving of anything. A figure here is a mass with a hem,
 * a waist, shoulders and a head, which is exactly as much as the stone says
 * at the range it is seen from and no more than the model can honestly
 * claim. What it must get right is the silhouette and the shadow, and those
 * are geometry, not iconography.
 *
 * Everything is built in the wall's own frame — x across the face, y up from
 * the pavement, z out of the wall — because that is the frame the front
 * hands to its porch. The caller turns it.
 */

/**
 * Radius up a standing figure, as a share of the hem.
 *
 * Eleven readings, and every one of them is doing a job in the silhouette:
 * the hem spread where the robe falls on the bracket, the waist drawn in,
 * the shoulders wider than anything above them, the neck pinched to a third
 * so the head is a head rather than a continuation, and the crown closed.
 *
 * Drop any one of these and it stops reading. Without the waist it is a
 * bollard; without the neck it is a chess piece; without the spread hem it
 * floats off its bracket, which is the single thing that most gives away a
 * figure that has been dropped onto a wall rather than carved standing on
 * it.
 */
const FIGURE: readonly (readonly [number, number])[] = [
  [0.0, 0.88],
  [0.08, 1.0],
  [0.3, 0.76],
  [0.5, 0.58],
  [0.66, 0.78],
  [0.75, 0.98],
  [0.81, 0.28],
  [0.86, 0.46],
  [0.92, 0.48],
  [0.97, 0.32],
  [1.0, 0.1],
]

export interface FigureParams {
  height: number
  /** Radius at the hem. Shoulders come out at 0.92 of it. */
  girth: number
  /** Depth as a share of width: a figure against a wall is not round. */
  flat?: number
  /** Which way it faces off the wall, radians. Small angles only. */
  turn?: number
}

/**
 * One standing figure.
 *
 * A single swept shell rather than a body with a head set on it — one
 * closed surface has no seam to catch the light wrongly, costs a third of
 * the triangles, and the neck is a radius rather than a join. Seven sides,
 * because an even count puts a flat face square to anyone standing in front
 * of it and the figure goes to cardboard at exactly the angle it is most
 * looked at.
 */
export function buildFigure(p: FigureParams): THREE.BufferGeometry {
  const sides = 7
  const flat = p.flat ?? 0.72
  const positions: number[] = []

  /** The profile, smoothstepped between readings so shoulders are round. */
  const radiusAt = (t: number): number => {
    for (let i = 1; i < FIGURE.length; i++) {
      const [t1, r1] = FIGURE[i]!
      if (t > t1 && i < FIGURE.length - 1) continue
      const [t0, r0] = FIGURE[i - 1]!
      const u = THREE.MathUtils.clamp((t - t0) / (t1 - t0), 0, 1)
      return THREE.MathUtils.lerp(r0, r1, u * u * (3 - 2 * u))
    }
    return 0
  }

  // Two rows to a reading, so every one of them lands on a row: sampling
  // this profile uniformly walks straight past the neck, which is six per
  // cent of the height and the whole of what makes it a person.
  const rows: number[] = []
  for (let i = 1; i < FIGURE.length; i++) {
    rows.push(FIGURE[i - 1]![0], (FIGURE[i - 1]![0] + FIGURE[i]![0]) / 2)
  }
  rows.push(1)

  const at = (row: number, col: number): THREE.Vector3 => {
    const t = rows[row]!
    const a = (col / sides) * Math.PI * 2 + (p.turn ?? 0)
    const r = radiusAt(t) * p.girth
    return new THREE.Vector3(Math.cos(a) * r, t * p.height, Math.sin(a) * r * flat)
  }

  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): void => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
  }

  for (let row = 0; row < rows.length - 1; row++) {
    for (let col = 0; col < sides; col++) {
      quad(at(row, col), at(row, col + 1), at(row + 1, col + 1), at(row + 1, col))
    }
  }
  // The sole. Nobody sees it, but an open shell is a hole in the depth
  // buffer from underneath and these are stood above eye height.
  const foot = new THREE.Vector3(0, 0, 0)
  for (let col = 0; col < sides; col++) {
    const a = at(0, col)
    const b = at(0, col + 1)
    positions.push(foot.x, foot.y, foot.z, b.x, b.y, b.z, a.x, a.y, a.z)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export interface CanopyParams {
  /** Width of the niche it covers. */
  span: number
  /** How far it and its bracket stand out of the wall. */
  reach: number
  /** Height of the figure beneath: the bracket goes at 0, the hood on top. */
  rise: number
}

/**
 * The bracket under a figure and the hood over it.
 *
 * This is the part that does the work at distance. A figure alone on a wall
 * is a light-grey lump against light-grey stone and at eighty metres it is
 * gone; the same figure with a pointed hood over it is read immediately,
 * because the hood is in its own shadow from every sun angle and what
 * carries is the black triangle, not the person under it. The real front
 * does nothing else — the whole thing is tiers of little gabled canopies,
 * and the figures are what they are there to shelter.
 *
 * Bracket, hood, finial. Three shapes, forty triangles, and it is the
 * difference between a wall with things on it and a façade.
 */
export function buildNicheCanopy(p: CanopyParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const half = p.span / 2

  // The bracket: a wedge that grows out of the wall and widens as it comes,
  // so the figure is standing on something that is visibly holding it.
  const corbel = new THREE.CylinderGeometry(half * 0.92, half * 0.34, p.span * 0.66, 6, 1)
  corbel.scale(1, 1, 0.8)
  corbel.translate(0, -p.span * 0.33, p.reach * 0.46)
  pieces.push(corbel)

  // The hood: a short drum carrying a steep six-sided spire. Steep on
  // purpose — a shallow one reads as a hat and throws half the shadow.
  const drum = new THREE.CylinderGeometry(half * 1.06, half * 1.12, p.span * 0.3, 6, 1, true)
  drum.translate(0, p.rise + p.span * 0.15, p.reach * 0.5)
  pieces.push(drum)

  // Kept short on purpose. The first one was a spire half as tall again as
  // the figure, and what a row of those reads as at any distance is a row of
  // spires with something small underneath — the hood is here to shade the
  // figure, not to be the thing that is seen.
  const spire = new THREE.ConeGeometry(half * 1.12, p.span * 0.95, 6, 1)
  spire.translate(0, p.rise + p.span * 0.62, p.reach * 0.5)
  pieces.push(spire)

  const finial = new THREE.ConeGeometry(half * 0.2, p.span * 0.38, 5, 1)
  finial.translate(0, p.rise + p.span * 1.22, p.reach * 0.5)
  pieces.push(finial)

  return mergeOrEmpty(pieces)
}

export interface FoliageParams {
  /** Across, and how far it stands out of the wall. */
  spread: number
  reach: number
  /** How many blades. Four to seven; below four it is a bud. */
  lobes: number
  seed: number
}

/**
 * A cluster of carved growth.
 *
 * Three goes at this. The first was single spheres of a quarter of a metre
 * scattered on a lattice, and what that gives at any distance is gravel. The
 * second was the same spheres at a metre and a half, gathered five to a
 * cluster — which is worse, because a heap of ovoids at a size you can
 * actually see is unmistakably a bunch of grapes, and a hundred and eighty
 * of them turned the front to popcorn.
 *
 * The third was blades — flat pointed leaves springing from a common knot,
 * fanned about the way out of the wall. Which is what the carving is, and
 * which at fifteen metres turned every pier into a row of small birds:
 * five spikes leaving one point in a symmetrical star is a shuttlecock, and
 * no amount of jitter on the angles stops it being one.
 *
 * What the photographs actually show, close up, is a *mass* — lumpy,
 * asymmetric, hanging below its own root, low against the stone rather than
 * standing off it, with the shadow in the creases between lobes rather than
 * behind the whole thing. So: one body carrying the outline, lobes
 * overlapping it far enough to merge into it instead of reading as separate
 * balls, weighted below the root because growth has weight, and two or three
 * tips carried further out than the rest, which are the only things that
 * break the silhouette. Everything flattened to half depth, because this is
 * relief on a wall and not fruit in a bowl.
 */
export function buildFoliage(p: FoliageParams): THREE.BufferGeometry {
  const random = mulberry32(p.seed)
  const pieces: THREE.BufferGeometry[] = []
  const lobes = Math.max(3, Math.round(p.lobes))

  /** One lobe: a low dome, wider than it is deep, squashed onto the wall. */
  const lobe = (
    radius: number,
    x: number,
    y: number,
    z: number,
    tall: number,
  ): void => {
    const g = new THREE.SphereGeometry(radius, 5, 3)
    g.scale(1, tall, 0.5)
    g.translate(x, y, z)
    pieces.push(g)
  }

  // The body of it: one mass on the wall, and the thing that has to carry
  // the silhouette. Everything else overlaps it far enough to merge.
  lobe(p.spread * 0.46, 0, 0, p.reach * 0.3, 0.86)

  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2 + random() * 0.6
    // Weighted below the root: carved growth hangs, and a cluster with as
    // much above its knot as below reads as a rosette rather than as
    // something with weight in it.
    const r = p.spread * (0.3 + random() * 0.18)
    lobe(
      p.spread * (0.22 + random() * 0.12),
      Math.cos(a) * r,
      Math.sin(a) * r * 0.8 - p.spread * 0.1,
      p.reach * (0.3 + random() * 0.25),
      1.15,
    )
  }

  // Two or three tips carried further out than the rest, which is all that
  // breaks the outline. Without them the cluster is a bun.
  for (let i = 0; i < 3; i++) {
    const a = Math.PI * (0.9 + random() * 1.2)
    lobe(
      p.spread * 0.17,
      Math.cos(a) * p.spread * 0.42,
      Math.sin(a) * p.spread * 0.36,
      p.reach * (0.7 + random() * 0.4),
      1.3,
    )
  }
  return mergeOrEmpty(pieces)
}

export interface CrestParams {
  /** The run it stands on, and how many. */
  width: number
  count: number
  /** Each gablet: how wide, how high, how far out of the wall. */
  rise: number
  reach: number
}

/**
 * Cresting: a row of small gablets along a string course.
 *
 * The horizontals on this front were flat bands, and a flat band a hundred
 * metres long is the one thing a Gaudí façade never has. Standing a row of
 * little pointed gables on each of them costs sixteen triangles apiece and
 * turns a line into a comb — the same argument the Passion porch's own comb
 * makes, one scale down, and the reason both fronts saw-tooth against
 * whatever is behind them instead of ruling a pencil line across it.
 */
export function buildCresting(p: CrestParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const count = Math.max(2, Math.round(p.count))
  const pitch = p.width / count

  for (let i = 0; i < count; i++) {
    const x = -p.width / 2 + (i + 0.5) * pitch
    const gablet = new THREE.ConeGeometry(pitch * 0.42, p.rise, 4, 1)
    gablet.rotateY(Math.PI / 4)
    gablet.scale(1, 1, 0.7)
    gablet.translate(x, p.rise / 2, p.reach)
    pieces.push(gablet)
  }
  return mergeOrEmpty(pieces)
}
