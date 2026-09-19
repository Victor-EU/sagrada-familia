import * as THREE from 'three'
import { buildTreeColumn, type TreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import type { VaultShape } from './section.ts'
import { columnMetrics } from '../geometry/column.ts'
import { DETAIL_LEVELS } from '../geometry/detail.ts'
import {
  bossOffsets,
  buildVaultCell,
  flareFor,
  vaultSurface,
  type VaultCell,
  type VaultCellParams,
  type VaultSurface,
} from '../geometry/vault.ts'
import type { FieldKindSpec, FieldLevel } from '../render/field.ts'

/**
 * Where the pieces of the building are collected before they are drawn.
 *
 * Phase 2 had one region — the nave — so the nave built its own instanced
 * field and that was the whole scene. A church has several regions that share
 * their stone: the aisle column standing in the nave is the same column that
 * stands in the transept arm, and the crossing's vault is the nave's vault
 * with a different crown. If each region built its own field they would be
 * different draw calls for identical geometry.
 *
 * So regions do not build anything drawable. They ask for a piece by shape,
 * and say where it stands. Identical shapes collapse to one kind however many
 * regions asked for them, and every kind is one instanced draw per level of
 * detail across the whole building.
 *
 * Two things are kept alongside: the one-off meshes, which are the walls and
 * their glass, and the column footprints the camera needs in order to walk.
 */
export class Parts {
  /** Meshes drawn once — walls, glass, anything not repeated. */
  readonly group = new THREE.Group()
  /** Geometries owned by `group`, so the caller can dispose the lot. */
  readonly geometries: THREE.BufferGeometry[] = []
  /** Every shaft standing on the floor, for the camera to bump into. */
  readonly columns: { x: number; z: number; radius: number }[] = []

  private readonly kinds = new Map<string, FieldKindSpec>()
  private readonly trees = new Map<string, TreeColumn[]>()
  private readonly cells = new Map<string, VaultCell[]>()

  constructor(
    readonly plaster: THREE.Material,
    readonly glass: THREE.Material,
  ) {}

  /**
   * The tree of this shape, at every level of detail.
   *
   * Built once per shape and shared: two bands that agree about order,
   * branching and length are the same tree, and the building has four shapes
   * where it has a hundred and fifty columns.
   */
  treeLevels(shape: TreeColumnParams): TreeColumn[] {
    const key = treeKey(shape)
    let built = this.trees.get(key)
    if (!built) {
      built = DETAIL_LEVELS.map((detail) => buildTreeColumn(shape, detail))
      this.trees.set(key, built)
    }
    return built
  }

  /**
   * Stand a tree on the floor at (x, z). Returns where its branches end.
   *
   * Given a crown and a vault shape it also plants the rosette: one small
   * hyperboloid rising from each branch tip. That is not decoration. A tree
   * ends in eight tips standing five or six metres out from its axis, each
   * finished with its own knot, and the swelling over the column is nowhere
   * near them at the height they stop — so without this they hang under the
   * vault like eggs on sticks. Widening the swelling until it covers them
   * turns it into a cylinder and is worse.
   *
   * The building's own answer is the one taken here: the vault springs from
   * the branch tips. Each tip gets a throat about its own thickness, flaring
   * up until it meets its neighbours around the ring, by which height the
   * swelling over the column has opened wide enough to take over.
   */
  column(
    shape: TreeColumnParams,
    x: number,
    z: number,
    opts: { turn?: number; crown?: number; vault?: VaultShape } = {},
  ): number {
    const trees = this.treeLevels(shape)
    const turn = opts.turn ?? 0
    const matrix = new THREE.Matrix4().makeRotationY(turn).premultiply(at(x, 0, z))
    this.add(
      `column ${treeKey(shape)}`,
      trees.map((t) => ({ geometry: t.geometry, error: t.error })),
      matrix,
      // A column is allowed several pixels where a vault is allowed one. Its
      // error is one flute clipped where the twist puts a corner between two
      // samples — a few pixels of one edge, not the whole outline moving.
      COLUMN_TOLERANCE_PX,
    )
    this.columns.push({ x, z, radius: columnMetrics(shape.order).innerDiameter / 2 })

    const tree = trees[0]!
    if (opts.crown !== undefined && opts.vault) this.rosette(shape, tree, matrix, opts.crown, opts.vault)
    return tree.totalHeight
  }

  /** One hyperboloid rising from each of a tree's branch tips. */
  private rosette(
    shape: TreeColumnParams,
    tree: TreeColumn,
    placement: THREE.Matrix4,
    crown: number,
    vault: VaultShape,
  ): void {
    const tips = tree.tips
    if (tips.length < 2) return

    // Tips stand on a ring about the axis; what each has to reach is half the
    // way to the next one round it.
    let ring = 0
    for (const tip of tips) ring = Math.max(ring, Math.hypot(tip.x, tip.z))
    if (ring < 0.5) return
    const gap = (2 * Math.PI * ring) / tips.length

    // The same meeting height as the rest of the cell, so the whole vault
    // springs as one.
    const rise = Math.max(1.5, (crown - tree.totalHeight) * vault.meetFraction)
    // A tip is a branch end, so its throat is a branch's own girth.
    const throat = Math.max(0.6, columnMetrics(shape.order).inradius * 0.9)
    const reach = Math.max(throat * 1.6, (gap / 2) * vault.spread)
    const key = `tip ${treeKey(shape)}:${crown}`

    for (const tip of tips) {
      const spot = tip.clone().applyMatrix4(placement)
      this.surface(
        key,
        (detail) =>
          vaultSurface(throat, flareFor(throat, reach, rise), 0, rise, reach, detail),
        upright(spot.x, spot.y, spot.z),
      )
    }
  }

  /** The vault cell of this shape, at every level of detail. */
  cellLevels(spec: VaultCellParams): VaultCell[] {
    const key = JSON.stringify(spec)
    let built = this.cells.get(key)
    if (!built) {
      built = DETAIL_LEVELS.map((detail) => buildVaultCell(spec, detail))
      this.cells.set(key, built)
    }
    return built
  }

  /**
   * One cell of vault centred at (x, z): the funnel at its crown, the dome
   * that closes it when it has no skylight, and a boss over each corner.
   *
   * `turn` rotates the cell about its own axis, for the ambulatory, whose
   * cells sit on radii rather than on the grid. `springs` gives the four
   * corner heights in the order `bossOffsets` returns them, for cells whose
   * corners stand on columns of different orders; left out, every corner
   * springs from the cell's own height.
   */
  vault(
    spec: VaultCellParams,
    x: number,
    z: number,
    opts: { turn?: number; springs?: number[] } = {},
  ): void {
    const cells = this.cellLevels(spec)
    const key = JSON.stringify(spec)
    const turn = opts.turn ?? 0
    const centre = upright(x, spec.crownHeight, z)

    this.add(`funnel ${key}`, cells.map((c) => c.funnel), centre)
    if (cells[0]!.cap) {
      this.add(`cap ${key}`, cells.map((c) => c.cap!), centre)
    }

    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    for (const [index, [ox, oz]] of bossOffsets(spec.cell).entries()) {
      const y = opts.springs?.[index] ?? spec.springHeight
      this.add(
        `boss ${key}`,
        cells.map((c) => c.boss),
        upright(x + ox * cos + oz * sin, y, z - ox * sin + oz * cos),
      )
    }
  }

  /** One surface of the caller's own making, placed by a matrix. */
  surface(key: string, make: (detail: number) => VaultSurface, matrix: THREE.Matrix4): void {
    let kind = this.kinds.get(key)
    if (!kind) {
      const levels = DETAIL_LEVELS.map(make)
      this.add(key, levels, matrix)
      return
    }
    kind.placements.push(matrix)
  }

  /** A mesh drawn once, already placed in world space. */
  piece(mesh: THREE.Object3D, ...geometries: THREE.BufferGeometry[]): void {
    this.group.add(mesh)
    this.geometries.push(...geometries)
  }

  /** Everything the field has to draw. */
  specs(): FieldKindSpec[] {
    return [...this.kinds.values()]
  }

  private add(
    key: string,
    levels: FieldLevel[],
    matrix: THREE.Matrix4,
    tolerancePx?: number,
  ): void {
    let kind = this.kinds.get(key)
    if (!kind) {
      kind = { name: key, levels, material: this.plaster, placements: [], tolerancePx }
      this.kinds.set(key, kind)
    }
    kind.placements.push(matrix)
  }
}

/**
 * Pixels of deviation a column may show before the next level up is used.
 *
 * Measured rather than argued: at the distance this puts the first switch,
 * dropping a level changes the average plaster tone by about 1/255, with no
 * bias in either direction.
 */
export const COLUMN_TOLERANCE_PX = 5

function treeKey(shape: TreeColumnParams): string {
  return [
    shape.order,
    shape.levels,
    shape.branches,
    shape.branchLength,
    shape.splayDeg,
    shape.phaseDeg,
    shape.knotRadiusScale,
    shape.knotHeightScale,
    shape.stages,
  ].join(':')
}

/** A placement with no rotation or scale. */
export function at(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z)
}

/**
 * Hyperboloids are generated with z as their axis; the world is y up. One
 * quarter turn on the way in, and the mathematics stays clean.
 */
export function upright(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeRotationX(-Math.PI / 2).premultiply(at(x, y, z))
}

/** Upright, and turned about its own axis — for surfaces on a radial plan. */
export function uprightTurned(
  x: number,
  y: number,
  z: number,
  turn: number,
): THREE.Matrix4 {
  return new THREE.Matrix4()
    .makeRotationZ(turn)
    .premultiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
    .premultiply(at(x, y, z))
}
