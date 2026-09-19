import type { ColumnOrder } from './column.ts'

/**
 * How finely to tessellate — in one place, and as a rule rather than a table.
 *
 * Every count in this project used to be a constant typed into a parameter
 * block. That spends the same budget on a 2.4 m trunk and a 1.6 m branch, and
 * it has no way to spend less on something eighty metres away. Both are the
 * same problem: segment counts should follow the size of the feature, not the
 * name of the object.
 *
 * A level of detail here is a single scalar. 1 is what you see standing next
 * to the stone; each level down halves it, and the geometry is rebuilt at the
 * lower count rather than decimated, so a coarse column is still exactly the
 * surface the rule defines — just sampled less often.
 */

/** Detail scalars, most detailed first. Index into these is the LOD level. */
export const DETAIL_LEVELS = [1, 0.5, 0.25, 0.12] as const

/**
 * Reference radial count for an order-12 shaft at full detail.
 *
 * Chosen to match what phase 1 shipped, so the nearest column does not get
 * worse on the day level of detail arrives. Everything else is derived from
 * it: the count scales with the order, because order *is* the feature count.
 */
const RADIAL_AT_ORDER_12 = 192

/** Rows per metre of shaft at full detail — 128 rows over a 24 m column. */
const ROWS_PER_METRE = 128 / 24

/**
 * Segments around a shaft of the given order.
 *
 * Rounded to a multiple of 2·order, and that is the whole trick. The base star
 * has `order` points and `order` valleys, and their angular positions are
 * fixed; a count that is a multiple of 2·order lands a sample on every one of
 * them. So the silhouette keeps its points all the way down — the coarsest
 * level draws a clean star polygon rather than a mush of near-misses, which is
 * the failure mode of decimating a mesh instead of rebuilding it.
 */
export function shaftRadial(order: ColumnOrder, detail: number): number {
  const period = order * 2
  const target = RADIAL_AT_ORDER_12 * (order / 12) * detail
  return period * Math.max(1, Math.round(target / period))
}

/** Rows up a shaft of the given built height. */
export function shaftRows(height: number, detail: number): number {
  return Math.max(4, Math.round(height * ROWS_PER_METRE * detail))
}

/** Segments around a knot ellipsoid, and the rings up it. */
export function knotSegments(order: ColumnOrder, detail: number): number {
  return Math.max(8, 2 * Math.round((48 * (order / 12) * detail) / 2))
}

/**
 * Segments around a vault surface of the given radius.
 *
 * A hyperboloid has no corners to preserve, so this is the plain chord-error
 * bound: approximating a circle of radius r with an n-gon leaves a sagitta of
 * r·(1 − cos(π/n)), and asking for that to stay under `tolerance` gives
 * n ≥ π·√(r / 2·tolerance). Detail scales the tolerance, so a level of detail
 * is a statement about allowable error in metres.
 */
export function surfaceRadial(radius: number, detail: number): number {
  const tolerance = 0.004 / Math.max(detail, 1e-3)
  const n = Math.PI * Math.sqrt(Math.max(radius, 0.05) / (2 * tolerance))
  return Math.max(8, 4 * Math.round(n / 4))
}

/**
 * Rows up a vault surface, from the length of its *profile* rather than its
 * height.
 *
 * A funnel that opens from 1.3 m to 7.7 m over a metre and a half of rise is
 * mostly a horizontal surface; counting its rows by height would give it six,
 * and it would read as a cone made of rings. The profile's own arc length is
 * what the rows have to resolve.
 */
export function surfaceRows(profileLength: number, detail: number): number {
  return Math.max(4, Math.round(profileLength * 7 * detail))
}
