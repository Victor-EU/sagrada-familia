import * as THREE from 'three'
import type { TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import type { VaultCellParams } from '../geometry/vault.ts'
import type { Parts } from './parts.ts'

/**
 * A transverse slice of the building, and the cells between two of them.
 *
 * The nave, the transept and the crossing are the same thing measured in
 * different places: a line of columns across the five naves, and a run of
 * vault cells between consecutive lines. What changes from one to the next is
 * which order stands on each line and how high its vault is — the crossing is
 * the station where the order jumps to twelve and the crown to sixty, and the
 * transept arm is the strip either side of it.
 *
 * Writing it once means the crossing cannot drift out of alignment with the
 * nave it interrupts: they are generated from the same rule, on the same grid.
 */

/** One band of the plan, measured out from the centreline. */
export interface BandParams {
  name: string
  /** Where this band's outer column line stands, as ±x. */
  outer: number
  /** Crown of the vault over the band. */
  crown: number
  /** The columns standing on that line. */
  order: ColumnOrder
  levels: number
  /** Branch length as a fraction of the branch's own order's full height. */
  branchLength: number
  /** Whether this band's vault is opened to the sky at each cell centre. */
  skylight: boolean
}

/** A transverse line of columns. */
export interface Station {
  z: number
  bands: BandParams[]
}

/** The cells filling the gap between two consecutive stations. */
export interface Strip {
  near: number
  far: number
  bands: BandParams[]
}

export type TreeShape = Omit<TreeColumnParams, 'order' | 'levels' | 'branchLength'>

/**
 * The vault's shape, as ratios rather than as metres.
 *
 * Everything that varies from cell to cell — its footprint, its crown, where
 * it springs from, whether it is open — is a placement. What is left is the
 * shape itself, and the two numbers that size the swelling over a column are
 * ratios on purpose: a boss belongs to the column it stands on, so it is
 * measured in that column's own girth and not in the cell's.
 */
export interface VaultShape {
  skylightRadius: number
  /** Throat of the swelling, as a multiple of the shaft's inner radius. */
  bossScale: number
  /** How far the swelling flares, as a multiple of its own throat. */
  bossFlare: number
  /** Height at which the two families meet, as a fraction of crown − spring. */
  meetFraction: number
  /** How far past its own half-diagonal a funnel reaches when it is free to. */
  spread: number
  /** Clear space left around a neighbouring skylight, past its own throat. */
  skylightMargin: number
}

/**
 * One cell's full parameters: the shape, placed, sized to its column, and
 * fitted to its neighbours.
 *
 * The two reaches are decided here because both are questions about what
 * stands next door, and the cell builder cannot see that.
 *
 * **The funnel** would like to reach its own half-diagonal, which covers its
 * corners and leaves the swelling over each column nothing to prove. It may
 * only do that if there is no opening within range: a funnel that passes
 * under the next cell's throat seals it, and a nave whose funnels each cover
 * their own corners is a nave with no skylights at all. So an open cell is
 * held back to `clearance`, the distance to the nearest neighbouring centre,
 * less that opening's own throat and a margin. A closed cell — the aisles,
 * the ambulatory — has no such duty and takes the whole diagonal.
 *
 * **The swelling** then covers exactly what the funnel could not, and no more.
 * Where the funnel reaches the corners that is nothing at all, and the boss
 * is left at its natural girth: one and two-thirds of the shaft it stands on,
 * flaring to twice that. Where the funnel is held back, the boss makes up the
 * difference — which is honest work, rather than the four-metre collar that
 * came of sizing it to the cell.
 */
export function cellFor(
  shape: VaultShape,
  at: {
    cell: { x: number; z: number }
    crownHeight: number
    springHeight: number
    order: ColumnOrder
    skylight: boolean
    /** Distance to the nearest neighbouring cell centre. */
    clearance: number
  },
): VaultCellParams {
  const half = { x: at.cell.x / 2, z: at.cell.z / 2 }
  const diagonal = Math.hypot(half.x, half.z)

  const wanted = diagonal * shape.spread
  const allowed = at.clearance - shape.skylightRadius - shape.skylightMargin
  const funnelReach = at.skylight ? Math.min(wanted, Math.max(diagonal * 0.5, allowed)) : wanted

  // What the funnel leaves: the far corner, and either edge midpoint the
  // funnel cannot reach — each of which is half the *other* side away from
  // the nearest column.
  let uncovered = Math.max(0, diagonal - funnelReach)
  if (funnelReach < half.x) uncovered = Math.max(uncovered, half.z)
  if (funnelReach < half.z) uncovered = Math.max(uncovered, half.x)

  const throat = columnMetrics(at.order).inradius * shape.bossScale
  return {
    cell: at.cell,
    crownHeight: at.crownHeight,
    springHeight: at.springHeight,
    skylightRadius: shape.skylightRadius,
    funnelReach,
    bossRadius: throat,
    bossReach: Math.max(throat * shape.bossFlare, uncovered * 1.12),
    meetFraction: shape.meetFraction,
    skylight: at.skylight,
  }
}

/** The full tree parameters for a band: plan decides three, shape the rest. */
export function shapeOf(band: BandParams, tree: TreeShape): TreeColumnParams {
  return {
    ...tree,
    order: band.order,
    levels: band.levels,
    branchLength: band.branchLength,
  }
}

/** Where this band's branches hand off to its vault. */
export function springOf(parts: Parts, band: BandParams, tree: TreeShape): number {
  return parts.treeLevels(shapeOf(band, tree))[0]!.totalHeight
}

/** Stand one transverse line of columns, two per band. */
export function buildStation(
  parts: Parts,
  station: Station,
  tree: TreeShape,
  vault: VaultShape,
): void {
  for (const band of station.bands) {
    const shape = shapeOf(band, tree)
    for (const sign of [-1, 1]) {
      parts.column(shape, sign * band.outer, station.z, { crown: band.crown, vault })
    }
  }
}

/**
 * Fill the gap between two stations with one cell per band.
 *
 * The central band is a single run of cells on the centreline; every other
 * band is a mirrored pair. Returns the centre of each skylight, which is what
 * a later phase will hang a lamp in.
 */
export function buildStrip(
  parts: Parts,
  strip: Strip,
  tree: TreeShape,
  vault: VaultShape,
): THREE.Vector3[] {
  const length = Math.abs(strip.near - strip.far)
  const centreZ = (strip.near + strip.far) / 2
  const skylights: THREE.Vector3[] = []

  const widthOf = (i: number): number => {
    const band = strip.bands[i]
    if (!band) return Infinity
    return i === 0 ? band.outer * 2 : band.outer - strip.bands[i - 1]!.outer
  }

  for (const [index, band] of strip.bands.entries()) {
    const inner = index === 0 ? 0 : strip.bands[index - 1]!.outer
    const width = widthOf(index)
    if (width <= 0) continue

    // Nearest neighbouring cell centre: the next one along the strip, or the
    // one across in either direction. Band 0 is a single run on the
    // centreline, so its neighbour across is band 1 on both sides.
    const clearance = Math.min(
      length,
      (width + widthOf(index - 1)) / 2,
      (width + widthOf(index + 1)) / 2,
    )

    const shaped = parts.treeLevels(shapeOf(band, tree))[0]!
    const spec = cellFor(vault, {
      cell: { x: width, z: length },
      crownHeight: band.crown,
      springHeight: shaped.totalHeight,
      order: band.order,
      skylight: band.skylight,
      clearance,
    })

    const centresX = index === 0 ? [0] : [-(inner + width / 2), inner + width / 2]
    for (const x of centresX) {
      parts.vault(spec, x, centreZ)
      if (band.skylight) skylights.push(new THREE.Vector3(x, band.crown, centreZ))
    }
  }

  return skylights
}
