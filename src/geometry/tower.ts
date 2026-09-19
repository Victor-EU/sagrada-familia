import * as THREE from 'three'
import { starProfile, type ColumnOrder } from './column.ts'

/**
 * The towers — eighteen of them, and the one part of this building most
 * people can draw from memory.
 *
 * The rule is published and it is a single curve. Gaudí's bell towers are
 * **paraboloids of revolution**: the silhouette is a parabola with its apex at
 * the top, which in a surface of revolution means the square of the radius
 * falls linearly with height,
 *
 *   r(y)² = r₀² · (1 − (1 − k²)·y/H)
 *
 * where k is what is left of the radius at the top. One expression, no
 * profile table, and it has the property the whole building is built on: it
 * carries its own weight in pure compression, which is why Gaudí used it and
 * why the towers can be as thin as they are. Carrying it *below* the foot
 * costs nothing and is what makes a tower spread onto the roof it grows out
 * of rather than ending in mid-air.
 *
 * The section is the same construction as the columns. A bell tower is a
 * twelve-pointed star in section low down, rounding off as it climbs — and
 * the twelve-pointed star is three squares superimposed at thirty degrees,
 * which is exactly `starProfile(12)` from `column.ts`. Nothing here needed
 * inventing; it needed sharing.
 *
 * The apertures are the third documented thing and the one that makes a
 * silhouette read as Sagrada Família rather than as a spire: the shaft is
 * pierced all the way up by rows of openings that drift round it as they
 * climb, so the bells sound and the tower is a lattice rather than a chimney.
 * There is **no boolean geometry** here any more than anywhere else in this
 * project — an opening is a cell the mesh declines to emit, and a short jamb
 * turned inward at its edges is what gives it a thickness of stone.
 *
 * Generated **y-up**, unlike every other generator here. Columns and vault
 * surfaces are built with z as their axis because their mathematics is
 * cleaner that way and the plan stands them upright. A tower has no
 * mathematics that cares: it is placed by the plan at an (x, z) and a height,
 * and generating it in the world's own frame makes that placement a
 * translation and nothing else.
 */

/** How the shaft is pierced. */
export interface TowerOpenings {
  /** Where the apertures begin and end, as fractions of the shaft. */
  from: number
  to: number
  /** Rows of apertures over that range. */
  bands: number
  /** How much of a row's height is open. */
  tall: number
  /** How much of a bay's width is open — a bay being one star point. */
  wide: number
  /** Bays the pattern drifts round between the first row and the last. */
  helix: number
}

export interface TowerParams {
  /** Foot to the top of the shaft. Whatever crowns it stands above this. */
  height: number
  /** Radius of the section's inscribed circle at the foot. */
  footRadius: number
  /** What is left of that radius at the top, as a fraction. */
  taper: number
  /** Points in section. Twelve for a bell tower, which is documented. */
  points: ColumnOrder
  /** How much star there is at the foot and at the top; 0 is a circle. */
  starFoot: number
  starTop: number
  /** Turn of the section between foot and top, degrees. */
  twistDeg: number
  /** How far the paraboloid is carried below its foot, metres. */
  skirt: number
  openings: TowerOpenings | null
  /** Stone shown at an aperture's edge. */
  reveal: number
  /** Rise of the cone that closes the top. 0 leaves it open. */
  cap: number
  detail: number
}

export interface TowerSurface {
  geometry: THREE.BufferGeometry
  /** How far this tessellation strays from the true surface, in metres. */
  error: number
}

/**
 * Segments around a tower of the given order.
 *
 * A multiple of the order, for the same reason the columns use one: the star
 * has its points at fixed angles and a count that misses them turns a star
 * into a mush of near-misses. Eight per point at full detail puts the chord
 * error on the widest tower in the building at six millimetres.
 */
export function towerRadial(points: number, detail: number): number {
  return points * Math.max(2, Math.round(8 * detail))
}

/** Rows up a tower, keyed to its apertures rather than to its height. */
export function towerRows(bands: number, detail: number): number {
  return Math.max(1, bands) * Math.max(2, Math.round(8 * detail))
}

/** One ring of the section: where it is, how wide, how much star, how turned. */
interface Ring {
  y: number
  radius: number
  star: number
  turn: number
}

export function buildTowerShaft(p: TowerParams): TowerSurface {
  const bands = p.openings?.bands ?? 4
  const cols = towerRadial(p.points, p.detail)
  const shaftRows = towerRows(bands, p.detail)
  const skirtRows = p.skirt > 0 ? Math.max(1, Math.round((shaftRows * p.skirt) / p.height)) : 0

  const k = Math.max(0.05, p.taper)
  const rings: Ring[] = []
  for (let i = -skirtRows; i <= shaftRows; i++) {
    const t = i / shaftRows
    rings.push({
      y: t * p.height,
      // r² linear in height: the paraboloid, and the only curve the towers need.
      radius: p.footRadius * Math.sqrt(Math.max(0.04, 1 - (1 - k * k) * t)),
      // The star fades out as the tower climbs, which is what the photographs
      // show: a star low down where the ribs are, a circle by the belfry.
      star: p.starFoot + (p.starTop - p.starFoot) * Math.pow(Math.min(Math.max(t, 0), 1), 0.7),
      turn: THREE.MathUtils.degToRad(p.twistDeg) * t,
    })
  }

  // The apertures live in cell indices rather than in angles, so their edges
  // land on grid lines at every level of detail instead of crawling by a
  // fraction of a cell each time the tessellation changes.
  const first = skirtRows
  const mask = p.openings
    ? apertureMask(p.openings, cols, p.points, first, first + shaftRows)
    : null

  return buildRings(rings, p.points, cols, mask, p.reveal, p.cap)
}

type Mask = (row: number, col: number) => boolean

function apertureMask(
  o: TowerOpenings,
  cols: number,
  points: number,
  rowFirst: number,
  rowLast: number,
): Mask {
  const span = rowLast - rowFirst
  const from = rowFirst + Math.round(span * o.from)
  const to = rowFirst + Math.round(span * o.to)
  const perBand = Math.max(1, Math.floor((to - from) / Math.max(1, o.bands)))
  const openRows = Math.min(perBand, Math.max(1, Math.round(perBand * o.tall)))
  const pad = Math.floor((perBand - openRows) / 2)

  const bay = Math.max(2, Math.round(cols / points))
  const openCols = Math.min(bay, Math.max(1, Math.round(bay * o.wide)))
  const margin = Math.floor((bay - openCols) / 2)

  return (row, col) => {
    if (row < from || row >= from + perBand * o.bands) return false
    const up = (row - from) % perBand
    if (up < pad || up >= pad + openRows) return false
    // The drift is what makes the pattern spiral instead of stacking.
    const band = Math.floor((row - from) / perBand)
    const shift = Math.round((o.helix * bay * band) / Math.max(1, o.bands - 1))
    const across = (((col - margin - shift) % bay) + bay) % bay
    return across < openCols
  }
}

/**
 * Turn a stack of rings into a surface.
 *
 * Positions come off the ring's own radial function; normals come from finite
 * differences on the radius grid rather than from averaging faces, so the
 * ribs stay crisp and the apertures do not drag the shading around with them.
 * Where a cell is open it is simply not emitted, and every edge it shares
 * with a closed cell gets a jamb turned inward — which is the whole of the
 * "no boolean geometry" rule applied to a hole.
 */
function buildRings(
  rings: Ring[],
  points: ColumnOrder,
  cols: number,
  mask: Mask | null,
  reveal: number,
  cap: number,
): TowerSurface {
  const star = starProfile(points)
  const rows = rings.length - 1
  const dAlpha = (Math.PI * 2) / cols

  // Radius grid first — normals are read off it, and the aperture test and
  // the jambs both need to look at neighbours.
  const grid: Float64Array[] = []
  let widest = 0
  for (const ring of rings) {
    const row = new Float64Array(cols)
    for (let col = 0; col < cols; col++) {
      const alpha = col * dAlpha
      const s = ring.star
      row[col] = ring.radius * (1 + s * (star(alpha + ring.turn) - 1))
      if (row[col]! > widest) widest = row[col]!
    }
    grid.push(row)
  }

  const positions: number[] = []
  const normals: number[] = []

  const point = (row: number, col: number, inset = 0): THREE.Vector3 => {
    const alpha = (col % cols) * dAlpha
    const r = Math.max(0.01, grid[row]![col % cols]! - inset)
    return new THREE.Vector3(r * Math.cos(alpha), rings[row]!.y, r * Math.sin(alpha))
  }

  /** Outward normal from the parametrisation, by central differences. */
  const normal = (row: number, col: number): THREE.Vector3 => {
    const c = col % cols
    const alpha = c * dAlpha
    const rHere = grid[row]![c]!
    const rNext = grid[row]![(c + 1) % cols]!
    const rPrev = grid[row]![(c - 1 + cols) % cols]!
    const dR = (rNext - rPrev) / (2 * dAlpha)

    const above = Math.min(row + 1, rows)
    const below = Math.max(row - 1, 0)
    const dY = rings[above]!.y - rings[below]!.y
    const dRdY = dY > 1e-6 ? (grid[above]![c]! - grid[below]![c]!) / dY : 0

    const cos = Math.cos(alpha)
    const sin = Math.sin(alpha)
    // dP/dα and dP/dy of P = (r cos α, y, r sin α); their cross product,
    // ordered so it points away from the axis.
    const a = new THREE.Vector3(dR * cos - rHere * sin, 0, dR * sin + rHere * cos)
    const b = new THREE.Vector3(dRdY * cos, 1, dRdY * sin)
    return b.cross(a).normalize()
  }

  const push = (p: THREE.Vector3, n: THREE.Vector3): void => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
  }

  /**
   * Emit a quad, wound to agree with the normals it was given.
   *
   * The plaster is `DoubleSide`, and three flips a fragment's normal when the
   * triangle under it faces away — so a quad whose winding disagrees with its
   * own normals is lit from exactly the wrong side, with nothing in the
   * geometry to say so. Deriving the order from the normal rather than
   * getting it right by hand makes that impossible instead of unlikely: the
   * first version of this file had the shaft inside out and it took a sun
   * ablation to see it, because an unlit white tower looks like a shadowed
   * one.
   */
  const quad = (
    corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
    ns: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
  ): void => {
    const facing = new THREE.Vector3()
      .subVectors(corners[1], corners[0])
      .cross(new THREE.Vector3().subVectors(corners[2], corners[0]))
    const order = facing.dot(ns[0]) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const i of order) push(corners[i]!, ns[i]!)
  }

  const open = (row: number, col: number): boolean =>
    mask !== null && row >= 0 && row < rows && mask(row, ((col % cols) + cols) % cols)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (open(row, col)) {
        if (reveal <= 0) continue
        // Jambs: one for each edge this aperture shares with standing stone.
        for (const side of [-1, 1] as const) {
          if (open(row, col + side)) continue
          const edge = side < 0 ? col : col + 1
          const outerA = point(row, edge)
          const outerB = point(row + 1, edge)
          const innerA = point(row, edge, reveal)
          const innerB = point(row + 1, edge, reveal)
          // A jamb looks into the opening, which is away from the stone it
          // was cut from: the tangent at this edge, turned against the side
          // the standing stone is on.
          const alpha = ((edge % cols) + cols) % cols * dAlpha
          const face = new THREE.Vector3(Math.sin(alpha), 0, -Math.cos(alpha))
            .multiplyScalar(side)
          quad([outerA, outerB, innerB, innerA], [face, face, face, face])
        }
        for (const dir of [-1, 1]) {
          if (open(row + dir, col)) continue
          const edge = dir < 0 ? row : row + 1
          const outerA = point(edge, col)
          const outerB = point(edge, col + 1)
          const innerA = point(edge, col, reveal)
          const innerB = point(edge, col + 1, reveal)
          const face = new THREE.Vector3(0, -dir, 0)
          quad([outerA, outerB, innerB, innerA], [face, face, face, face])
        }
        continue
      }

      quad(
        [
          point(row, col),
          point(row, col + 1),
          point(row + 1, col + 1),
          point(row + 1, col),
        ],
        [
          normal(row, col),
          normal(row, col + 1),
          normal(row + 1, col + 1),
          normal(row + 1, col),
        ],
      )
    }
  }

  if (cap > 0) {
    const apex = new THREE.Vector3(0, rings[rows]!.y + cap, 0)
    for (let col = 0; col < cols; col++) {
      const a = point(rows, col)
      const b = point(rows, col + 1)
      const n = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(apex, a))
        .normalize()
      if (n.y < 0) n.negate()
      quad([a, b, apex, apex], [n, n, n, n])
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()

  return { geometry, error: widest * (1 - Math.cos(Math.PI / cols)) }
}

/**
 * The pinnacle on a bell tower.
 *
 * The real ones are stacked geometric solids finished in Venetian glass
 * mosaic — the most coloured thing on the building, and in a white plaster
 * maquette they are white like everything else. What survives that is their
 * profile, which is a sequence of collars and swellings rather than a spire,
 * and at a hundred metres up the profile is all anybody sees of them anyway.
 *
 * Stated as fractions of the shaft's top radius and of the pinnacle's own
 * height, so one table serves every tower whatever size it is.
 */
const PINNACLE_PROFILE: [number, number][] = [
  [0, 1],
  [0.08, 0.74],
  [0.14, 1.3],
  [0.28, 1.42],
  [0.36, 1.12],
  [0.44, 0.7],
  [0.5, 1.04],
  [0.62, 0.92],
  [0.7, 0.42],
  [0.84, 0.5],
  [0.92, 0.22],
  [1, 0.04],
]

export interface PinnacleParams {
  height: number
  /** The radius it stands on — the top of the shaft. */
  radius: number
  points: ColumnOrder
  star: number
  detail: number
}

export function buildPinnacle(p: PinnacleParams): TowerSurface {
  const cols = towerRadial(p.points, p.detail)
  const perSegment = Math.max(1, Math.round(3 * p.detail))

  const rings: Ring[] = []
  for (let i = 0; i + 1 < PINNACLE_PROFILE.length; i++) {
    const [y0, r0] = PINNACLE_PROFILE[i]!
    const [y1, r1] = PINNACLE_PROFILE[i + 1]!
    for (let s = 0; s < perSegment; s++) {
      const f = s / perSegment
      rings.push({
        y: (y0 + (y1 - y0) * f) * p.height,
        radius: (r0 + (r1 - r0) * f) * p.radius,
        // The star runs out through the pinnacle, so the finial is round.
        star: p.star * (1 - (y0 + (y1 - y0) * f)),
        turn: 0,
      })
    }
  }
  const [lastY, lastR] = PINNACLE_PROFILE[PINNACLE_PROFILE.length - 1]!
  rings.push({ y: lastY * p.height, radius: lastR * p.radius, star: 0, turn: 0 })

  return buildRings(rings, p.points, cols, null, 0, p.radius * 0.12)
}

/**
 * The four-armed cross on the tower of Jesus Christ.
 *
 * Arms on both horizontal axes as well as the vertical, which is why the
 * published description calls it four-armed and why it reads as a cross from
 * every direction rather than only from two. Three boxes crossing at a point
 * is the whole of it; opaque plaster hides the joins, the same as everywhere
 * else in this model.
 */
export function buildCross(height: number): THREE.BufferGeometry[] {
  const limb = height * 0.11
  const arm = height * 0.42
  const upright = new THREE.BoxGeometry(limb, height, limb)
  upright.translate(0, height / 2, 0)
  const across = new THREE.BoxGeometry(arm * 2, limb, limb)
  across.translate(0, height * 0.68, 0)
  const through = new THREE.BoxGeometry(limb, limb, arm * 2)
  through.translate(0, height * 0.68, 0)
  return [upright, across, through]
}

/**
 * The twelve-pointed star on the tower of the Virgin Mary.
 *
 * Twelve spikes on the vertices of a regular arrangement about a small core —
 * six in a horizontal ring, three up and three down — which is the reading
 * that makes it a solid star rather than a flat one, and the one the
 * photographs of the installed piece support.
 */
export function buildStar(span: number, points = 12): THREE.BufferGeometry {
  const core = span * 0.18
  const reach = span / 2
  const positions: number[] = []

  const spikes: THREE.Vector3[] = []
  const ring = Math.max(4, points - Math.floor(points / 3) * 2)
  const upper = Math.floor((points - ring) / 2)
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2
    spikes.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
  }
  for (const tilt of [1, -1]) {
    for (let i = 0; i < upper; i++) {
      const a = ((i + 0.5) / upper) * Math.PI * 2
      spikes.push(
        new THREE.Vector3(Math.cos(a) * 0.55, tilt * 0.84, Math.sin(a) * 0.55).normalize(),
      )
    }
  }

  for (const dir of spikes) {
    const tip = dir.clone().multiplyScalar(reach)
    // A square collar about the axis of the spike, then four faces to the tip.
    const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    const u = new THREE.Vector3().crossVectors(up, dir).normalize().multiplyScalar(core)
    const v = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(core)
    const base = dir.clone().multiplyScalar(core * 0.6)
    const collar = [
      base.clone().add(u),
      base.clone().add(v),
      base.clone().sub(u),
      base.clone().sub(v),
    ]
    for (let i = 0; i < 4; i++) {
      const a = collar[i]!
      const b = collar[(i + 1) % 4]!
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
