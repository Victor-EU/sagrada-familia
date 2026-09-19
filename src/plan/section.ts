import * as THREE from 'three'
import type { TreeColumnParams } from '../geometry/branch.ts'
import type { ColumnOrder } from '../geometry/column.ts'
import { meetingRadius, type VaultCellParams } from '../geometry/vault.ts'
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
export type VaultShape = Omit<
  VaultCellParams,
  'cell' | 'springHeight' | 'crownHeight' | 'skylight'
>

/** The full tree parameters for a band: plan decides three, shape the rest. */
export function shapeOf(band: BandParams, tree: TreeShape): TreeColumnParams {
  return {
    ...tree,
    order: band.order,
    levels: band.levels,
    branchLength: band.branchLength,
  }
}

/**
 * How wide the swelling over a column has to be.
 *
 * Not a number anyone should be typing. A tree ends in four branch tips
 * standing a few metres out from its axis, each finished with its own knot,
 * and a boss narrower than that leaves them poking out of the vault like
 * eggs on sticks. So the throat is sized to swallow the tips — the same
 * argument the ellipsoid knot makes about the capital it hides, and the
 * reason there is still no boolean geometry in this project.
 *
 * Bounded above by the radius at which the two families of the vault meet:
 * past that the boss would have to flare inwards to reach it, which is not a
 * hyperboloid of one sheet and not a vault.
 */
export function bossRadiusFor(
  treeRadius: number,
  cell: { x: number; z: number },
  vault: VaultShape,
): number {
  const reach = meetingRadius(cell, vault.spread)
  return Math.min(Math.max(vault.bossRadius, treeRadius * 1.04), reach * 0.92)
}

/** Where this band's branches hand off to its vault. */
export function springOf(parts: Parts, band: BandParams, tree: TreeShape): number {
  return parts.treeLevels(shapeOf(band, tree))[0]!.totalHeight
}

/** Stand one transverse line of columns, two per band. */
export function buildStation(parts: Parts, station: Station, tree: TreeShape): void {
  for (const band of station.bands) {
    const shape = shapeOf(band, tree)
    for (const sign of [-1, 1]) {
      parts.column(shape, sign * band.outer, station.z)
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

  for (const [index, band] of strip.bands.entries()) {
    const inner = index === 0 ? 0 : strip.bands[index - 1]!.outer
    const width = index === 0 ? band.outer * 2 : band.outer - inner
    if (width <= 0) continue

    const cell = { x: width, z: length }
    const shaped = parts.treeLevels(shapeOf(band, tree))[0]!
    const spec: VaultCellParams = {
      ...vault,
      cell,
      crownHeight: band.crown,
      springHeight: shaped.totalHeight,
      bossRadius: bossRadiusFor(shaped.radius, cell, vault),
      skylight: band.skylight,
    }

    const centresX = index === 0 ? [0] : [-(inner + width / 2), inner + width / 2]
    for (const x of centresX) {
      parts.vault(spec, x, centreZ)
      if (band.skylight) skylights.push(new THREE.Vector3(x, band.crown, centreZ))
    }
  }

  return skylights
}
