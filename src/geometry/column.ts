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
  /** Segments around. Callers get this from `detail.ts`, not from a constant. */
  radialSegments: number
  /** Rows up the part actually built, not up the notional full column. */
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

/**
 * The foot of a column.
 *
 * Every shaft in the building used to end at the floor with nothing at all
 * where the two met, and it showed the moment the floor stopped being a blank
 * plane: the columns did not stand on it, they went into it. There was no
 * shading to say otherwise either, because the ambient occlusion works over a
 * three-metre radius and on a 7.5 m grid most of the floor has nothing within
 * three metres of it — a flat plane beside a smooth vertical shaft has no
 * crevice to find.
 *
 * So the crevice is built. A short block a fifth wider than the shaft, its top
 * chamfered back in to meet it, which is what every stone column has for the
 * same reason: the foot is where a shaft gets chipped. The section is the
 * column's own star, untwisted — the double twist has not started at this
 * height anyway, the first `plinthHeight` metres of the shaft hold the base
 * polygon — so the base steps straight out of the shaft's own outline and
 * needs no shape of its own.
 */
export interface ColumnBaseParams {
  order: ColumnOrder
  radialSegments: number
}

/** How far the base stands out past the shaft, and how tall it is. */
const BASE_FLARE = 1.2
const BASE_HEIGHT_RATIO = 0.5

export function buildColumnBase(params: ColumnBaseParams): THREE.BufferGeometry {
  const m = columnMetrics(params.order)
  const polys = basePolygons(params.order)
  const height = m.inradius * BASE_HEIGHT_RATIO

  // Block, then chamfer. Three rings is all it takes and the middle one is
  // what makes it read as a base rather than as a cone.
  const rings: [number, number][] = [
    [0, BASE_FLARE],
    [height * 0.6, BASE_FLARE],
    [height, 1],
  ]

  const cols = Math.max(12, Math.floor(params.radialSegments))
  const dAlpha = (Math.PI * 2) / cols
  const positions: number[] = []

  const at = (ring: number, col: number): [number, number, number] => {
    const [z, factor] = rings[ring]!
    const alpha = (col % cols) * dAlpha
    const r = sectionRadius(alpha, [0], polys, m.polygonInradius) * factor
    return [r * Math.cos(alpha), r * Math.sin(alpha), z]
  }

  for (let ring = 0; ring + 1 < rings.length; ring++) {
    for (let col = 0; col < cols; col++) {
      const a = at(ring, col)
      const b = at(ring, col + 1)
      const c = at(ring + 1, col + 1)
      const d = at(ring + 1, col)
      positions.push(...a, ...b, ...c, ...a, ...c, ...d)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  // Generated with z up, like every column; the tree stands its shafts upright
  // itself, and a base placed by the column's own matrix has to arrive already
  // turned.
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

export function buildColumn(params: ColumnParams): THREE.BufferGeometry {
  const m = columnMetrics(params.order)
  const polys = basePolygons(params.order)
  const stages = stageSchedule(m, params.stages)

  const fraction = Math.min(1, Math.max(0.02, params.lengthFraction ?? 1))
  const buildHeight = m.height * fraction

  const cols = Math.max(12, Math.floor(params.radialSegments))
  const rows = Math.max(4, Math.floor(params.heightSegments))
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

/**
 * How far a column's true section strays from the polyline the renderer will
 * actually draw at each radial count.
 *
 * This exists so that level of detail can be decided by *error* rather than by
 * a made-up distance. Every other piece in the project is a smooth surface
 * whose sampling error is the plain sagitta of a chord; a column is not, and
 * guessing at it would have been the one place the budget was decided by feel.
 *
 * Two things make the answer interesting. Sampling a regular polygon at a
 * multiple of its edge count is *exact* — a polygon's edges are already
 * straight — so the base star costs nothing at any level, and the whole error
 * is the fluting the twist stages add. And because the radial function is
 * star-shaped, the chord between two samples has a closed polar form:
 *
 *   r_chord(α) = r₀·r₁·sin(α₁ − α₀) / ( r₀·sin(α₁ − α) + r₁·sin(α − α₀) )
 *
 * so the deviation is a subtraction rather than a point-to-segment solve.
 *
 * Sampled over the height because the flutes deepen and double as the twist
 * accumulates, and the level has to survive the worst of it.
 */
const ERROR_CACHE = new Map<string, number[]>()

export function columnSectionError(
  order: ColumnOrder,
  stages: number,
  radialCounts: number[],
): number[] {
  const key = `${order}:${stages}:${radialCounts.join(',')}`
  const cached = ERROR_CACHE.get(key)
  if (cached) return cached

  const m = columnMetrics(order)
  const polys = basePolygons(order)
  const schedule = stageSchedule(m, stages)

  const finest = Math.max(...radialCounts)
  // A multiple of every count on the list, so each coarse sample lands exactly
  // on a fine one and no interpolation creeps into the reference.
  const fine = finest * 16
  const dFine = (Math.PI * 2) / fine

  const heights = [0, 0.12, 0.3, 0.5, 0.72, 0.92, 1].map(
    (f) => m.plinthHeight + m.shaftHeight * f,
  )

  const errors = radialCounts.map(() => 0)

  for (const z of heights) {
    const offsets = offsetsAt(z, schedule)
    const ring = new Float64Array(fine)
    for (let i = 0; i < fine; i++) {
      ring[i] = sectionRadius(i * dFine, offsets, polys, m.polygonInradius)
    }

    for (let k = 0; k < radialCounts.length; k++) {
      const n = radialCounts[k]!
      const stride = fine / n
      if (!Number.isInteger(stride)) continue
      const span = stride * dFine
      const sinSpan = Math.sin(span)

      for (let c = 0; c < n; c++) {
        const i0 = c * stride
        const i1 = ((c + 1) % n) * stride
        const r0 = ring[i0]!
        const r1 = ring[i1]!
        for (let j = 1; j < stride; j++) {
          const da = j * dFine
          const chord = (r0 * r1 * sinSpan) / (r0 * Math.sin(span - da) + r1 * Math.sin(da))
          const deviation = Math.abs(ring[(i0 + j) % fine]! - chord)
          if (deviation > errors[k]!) errors[k] = deviation
        }
      }
    }
  }

  ERROR_CACHE.set(key, errors)
  return errors
}
