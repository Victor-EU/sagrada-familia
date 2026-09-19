import * as THREE from 'three'

/**
 * Gaudí's double-twist columns — the stone forest.
 *
 * The rule is published in full, and every column follows from its order
 * number alone:
 *
 *   order n ∈ {6, 8, 10, 12}   star points at the base
 *   height   = 2n metres       (12 points → 24 m)
 *   inner ⌀  = height / 10     (the 1:10 shaft proportion)
 *   plinth   = n decimetres
 *
 * The base section is a star made by superimposing regular polygons: three
 * squares for 12 points, two pentagons for 10, two squares for 8, two
 * equilateral triangles for 6. Above the plinth the section is rotated
 * helically in two *opposing* directions at once — Gaudí rejected a single
 * twist as making the column look structurally weak — and the cross-section is
 * the intersection of the two counter-rotating prisms.
 *
 * Each stage doubles the edge count while halving both the stage height and
 * the rotation, so the section runs star → 2n → 4n and converges on a fluted
 * near-circle at the capital. Halving heights makes the total a geometric
 * series, so the shaft closes at a finite height rather than trailing off.
 *
 * Representation: every section here is star-shaped about the axis, so a
 * radial function r(α) is *exact* — no polygon clipping needed. A union of
 * polygons is a max of their radial functions; an intersection is a min. The
 * whole twist collapses to one expression:
 *
 *   r(α, z) = min over ± offsets of ( max over base polygons )
 *
 * with 2^(k+1) offsets in stage k.
 */
export type ColumnOrder = 6 | 8 | 10 | 12

export const COLUMN_ORDERS: ColumnOrder[] = [6, 8, 10, 12]

export interface ColumnParams {
  order: ColumnOrder
  /** Twist stages. Past ~3 the flutes are shallower than a millimetre. */
  stages: number
  radialSegments: number
  heightSegments: number
  /**
   * Build only the lower fraction of the column. Branches are shorter pieces
   * of the same form, so the twist schedule stays keyed to the full height and
   * a truncated branch simply shows fewer stages.
   */
  lengthFraction?: number
}

export const defaultColumn: ColumnParams = {
  order: 12,
  stages: 3,
  radialSegments: 288,
  heightSegments: 176,
}

export interface ColumnMetrics {
  order: ColumnOrder
  height: number
  /** Radius of the circle inscribed in the base star — the shaft's core. */
  inradius: number
  innerDiameter: number
  /** Inradius each constituent polygon needs for the star to inscribe above. */
  polygonInradius: number
  /** Radius out to the star's points at the base. */
  pointRadius: number
  plinthHeight: number
  shaftHeight: number
  /** Regular polygons superimposed to make the base star. */
  polygonSides: number
  polygonCount: number
  /** What the real column is clad in, by load. Not used for rendering yet. */
  stone: string
}

/** order → the regular polygons whose union is the base star. */
const BASE_SHAPE: Record<ColumnOrder, { sides: number; count: number; stone: string }> = {
  6: { sides: 3, count: 2, stone: 'sandstone' },
  8: { sides: 4, count: 2, stone: 'grey granite' },
  10: { sides: 5, count: 2, stone: 'basalt' },
  12: { sides: 4, count: 3, stone: 'red porphyry' },
}

export function columnMetrics(order: ColumnOrder): ColumnMetrics {
  const shape = BASE_SHAPE[order]
  const height = order * 2
  const inradius = order / 10
  const plinthHeight = order / 10

  // The star is a *union* of polygons, so its inscribed circle is wider than
  // any one polygon's. Superimposing three squares at 30° gives a star whose
  // minimum radius is ρ/cos 30° — scale the polygons down so the star itself
  // honours the 1:10 rule, since it is the star that the shaft converges to.
  const unit = unitStarExtent(order)
  const polygonInradius = inradius / unit.min

  return {
    order,
    height,
    inradius,
    innerDiameter: inradius * 2,
    polygonInradius,
    pointRadius: polygonInradius * unit.max,
    plinthHeight,
    shaftHeight: height - plinthHeight,
    polygonSides: shape.sides,
    polygonCount: shape.count,
    stone: shape.stone,
  }
}

interface Poly {
  sides: number
  phase: number
}

const EXTENT_CACHE = new Map<ColumnOrder, { min: number; max: number }>()

/**
 * Minimum and maximum radius of the base star built from unit-inradius
 * polygons, sampled over one angular period.
 *
 * Sampled rather than solved: the minimum of a max-of-branches sits either at
 * a branch's own minimum or at a crossing between two branches, and sampling
 * finely catches both without a case analysis.
 */
function unitStarExtent(order: ColumnOrder): { min: number; max: number } {
  const cached = EXTENT_CACHE.get(order)
  if (cached) return cached

  const polys = basePolygons(order)
  const period = (Math.PI * 2) / order
  const samples = 8192
  let min = Infinity
  let max = 0
  for (let i = 0; i < samples; i++) {
    const beta = (i / samples) * period
    let r = 0
    for (const poly of polys) r = Math.max(r, polygonRadius(beta, poly, 1))
    if (r < min) min = r
    if (r > max) max = r
  }

  const extent = { min, max }
  EXTENT_CACHE.set(order, extent)
  return extent
}

function basePolygons(order: ColumnOrder): Poly[] {
  const { sides, count } = BASE_SHAPE[order]
  // Spreading by 2π/order turns `count` polygons of `sides` edges into an
  // order-pointed star: 3 squares at 0°, 30°, 60° give 12 points.
  return Array.from({ length: count }, (_, j) => ({
    sides,
    phase: (j * Math.PI * 2) / order,
  }))
}

/** Radius of a regular polygon of given inradius at absolute angle β. */
function polygonRadius(beta: number, poly: Poly, inradius: number): number {
  const step = (Math.PI * 2) / poly.sides
  let a = (beta - poly.phase) % step
  if (a < 0) a += step
  a -= step / 2
  return inradius / Math.cos(a)
}

interface Stage {
  z0: number
  z1: number
  twist: number
}

/**
 * Stage schedule up the shaft: heights halve, rotations halve.
 *
 * Φ_k = π / (n · 2^(k+1)). Two copies offset by 2Φ_k — exactly half the
 * section's current angular period — is what doubles the edge count; offset by
 * a full period the copies would simply coincide again.
 */
function stageSchedule(m: ColumnMetrics, stageCount: number): Stage[] {
  const n = Math.max(1, Math.floor(stageCount))
  let weightSum = 0
  for (let k = 0; k < n; k++) weightSum += 2 ** -k

  const stages: Stage[] = []
  let z = m.plinthHeight
  for (let k = 0; k < n; k++) {
    const h = (m.shaftHeight * 2 ** -k) / weightSum
    stages.push({
      z0: z,
      z1: z + h,
      twist: Math.PI / (m.order * 2 ** (k + 1)),
    })
    z += h
  }
  return stages
}

/** The ± angular offsets in force at height z. */
function offsetsAt(z: number, stages: Stage[]): number[] {
  let offsets = [0]
  for (let k = 0; k < stages.length; k++) {
    const s = stages[k]!
    if (z <= s.z0) break
    const t = z >= s.z1 ? 1 : (z - s.z0) / (s.z1 - s.z0)
    const phi = s.twist * t
    const next: number[] = []
    for (const o of offsets) {
      next.push(o + phi, o - phi)
    }
    offsets = next
    if (z < s.z1) break
  }
  return offsets
}

function sectionRadius(
  alpha: number,
  offsets: number[],
  polys: Poly[],
  inradius: number,
): number {
  let minR = Infinity
  for (let i = 0; i < offsets.length; i++) {
    const beta = alpha + offsets[i]!
    let maxR = 0
    for (let j = 0; j < polys.length; j++) {
      const r = polygonRadius(beta, polys[j]!, inradius)
      if (r > maxR) maxR = r
    }
    if (maxR < minR) minR = maxR
  }
  return minR
}

export function buildColumn(params: ColumnParams): THREE.BufferGeometry {
  const m = columnMetrics(params.order)
  const polys = basePolygons(params.order)
  const stages = stageSchedule(m, params.stages)

  const fraction = Math.min(1, Math.max(0.02, params.lengthFraction ?? 1))
  const buildHeight = m.height * fraction

  const cols = Math.max(12, Math.floor(params.radialSegments))
  const rows = Math.max(4, Math.floor(params.heightSegments * fraction))
  const dAlpha = (Math.PI * 2) / cols
  const dZ = buildHeight / rows

  // Radius grid first, so normals can come from finite differences on it
  // rather than from averaging face normals.
  const grid: Float64Array[] = []
  for (let row = 0; row <= rows; row++) {
    const z = row * dZ
    const offsets = offsetsAt(z, stages)
    const ring = new Float64Array(cols)
    for (let col = 0; col < cols; col++) {
      ring[col] = sectionRadius(col * dAlpha, offsets, polys, m.polygonInradius)
    }
    grid.push(ring)
  }

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const shellCols = cols + 1 // duplicate seam so UVs wrap cleanly
  for (let row = 0; row <= rows; row++) {
    const z = row * dZ
    const ring = grid[row]!
    const below = grid[Math.max(0, row - 1)]!
    const above = grid[Math.min(rows, row + 1)]!
    const zSpan = (Math.min(rows, row + 1) - Math.max(0, row - 1)) * dZ

    for (let col = 0; col < shellCols; col++) {
      const c = col % cols
      const alpha = col * dAlpha
      const r = ring[c]!
      const ca = Math.cos(alpha)
      const sa = Math.sin(alpha)

      positions.push(r * ca, r * sa, z)

      const rA = (ring[(c + 1) % cols]! - ring[(c - 1 + cols) % cols]!) / (2 * dAlpha)
      const rZ = zSpan > 0 ? (above[c]! - below[c]!) / zSpan : 0

      // N = ∂P/∂α × ∂P/∂z for P = (r cos α, r sin α, z), which reduces to:
      let nx = rA * sa + r * ca
      let ny = -rA * ca + r * sa
      let nz = -r * rZ
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len
      normals.push(nx, ny, nz)
      uvs.push(col / cols, z / m.height)
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i0 = row * shellCols + col
      const i1 = i0 + 1
      const i2 = i0 + shellCols
      const i3 = i2 + 1
      indices.push(i0, i2, i1, i1, i2, i3)
    }
  }

  // Caps. The top one goes away once the branching node lands on it.
  addCap(positions, normals, uvs, indices, grid[0]!, cols, dAlpha, 0, -1)
  addCap(positions, normals, uvs, indices, grid[rows]!, cols, dAlpha, buildHeight, 1)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}

function addCap(
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  ring: Float64Array,
  cols: number,
  dAlpha: number,
  z: number,
  dir: 1 | -1,
): void {
  const centre = positions.length / 3
  positions.push(0, 0, z)
  normals.push(0, 0, dir)
  uvs.push(0.5, 0.5)

  for (let col = 0; col < cols; col++) {
    const alpha = col * dAlpha
    const r = ring[col]!
    positions.push(r * Math.cos(alpha), r * Math.sin(alpha), z)
    normals.push(0, 0, dir)
    uvs.push(0.5 + Math.cos(alpha) * 0.5, 0.5 + Math.sin(alpha) * 0.5)
  }

  for (let col = 0; col < cols; col++) {
    const a = centre + 1 + col
    const b = centre + 1 + ((col + 1) % cols)
    if (dir > 0) indices.push(centre, a, b)
    else indices.push(centre, b, a)
  }
}
