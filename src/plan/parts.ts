import * as THREE from 'three'
import { buildTreeColumn, type TreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import type { VaultShape } from './section.ts'
import { buildColumnBase, columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import { DETAIL_LEVELS, shaftRadial } from '../geometry/detail.ts'
import { agreeWinding } from '../geometry/normals.ts'
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
import { stoneForOrder, type Quarry, type StoneName } from '../render/materials.ts'

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

  /**
   * Every kind the building is made of, by shape key.
   *
   * The lucernaris are the one kind whose placements come in at many
   * different scales under a single key — see `lucernaris`.
   */
  private readonly kinds = new Map<string, FieldKindSpec>()
  private readonly trees = new Map<string, TreeColumn[]>()
  private readonly cells = new Map<string, VaultCell[]>()

  constructor(
    /**
     * Every stone the building is cut from. A piece asks for the one it is
     * made of; identical shapes in the same stone still collapse to one kind,
     * because the stone is part of the key.
     */
    readonly stones: Quarry,
    readonly glass: THREE.Material,
    /** Stone that knows it is a floor and draws its own joints. */
    readonly paving: THREE.Material,
  ) {}

  /** The material for a named stone, for the one-off meshes. */
  stone(name: StoneName): THREE.Material {
    return this.stones[name]
  }

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
    // The order says which stone. Sandstone on the side naves, granite on the
    // central nave, basalt round the crossing, porphyry at the centre — the
    // four the Basilica publishes, and the four column.ts has recorded all
    // along without anything ever drawing them.
    const cut = stoneForOrder(shape.order)
    this.add(
      `column ${treeKey(shape)}`,
      trees.map((t) => ({ geometry: t.geometry, error: t.error })),
      matrix,
      cut,
      // A column is allowed several pixels where a vault is allowed one. Its
      // error is one flute clipped where the twist puts a corner between two
      // samples — a few pixels of one edge, not the whole outline moving.
      COLUMN_TOLERANCE_PX,
    )
    this.columns.push({ x, z, radius: columnMetrics(shape.order).innerDiameter / 2 })
    this.base(shape.order, matrix, trees, cut)

    const tree = trees[0]!
    this.lucernaris(tree, matrix)
    if (opts.crown !== undefined && opts.vault) this.rosette(shape, tree, matrix, opts.crown, opts.vault)
    return tree.totalHeight
  }

  /**
   * The lights on the knots.
   *
   * Every branching node in this building carries an oval of lit alabaster,
   * and after the windows they are the brightest things in the room — the
   * only light at column height, and the only reason a knot reads as a
   * joint somebody designed rather than as a bulge in a branch. Six of the
   * ten photographs this model is matched against have a dozen in shot and
   * the model had none of them.
   *
   * One unit geometry for the whole building, scaled by each knot's own
   * size through the placement matrix, so a hundred and fifty columns of
   * four different orders are one instanced draw. A lens rather than a
   * plate: the real ones are set into each face of the knot and there are
   * several to a knot, so a band round its waist is what they add up to
   * from any direction a visitor stands in.
   */
  private lucernaris(tree: TreeColumn, placement: THREE.Matrix4): void {
    if (tree.knots.length === 0) return

    // Only the knots worth lighting. A tree throws a knot at the top of
    // every shaft it owns, branches included, and the ones above the first
    // division are a third of the size and mostly hidden inside the canopy
    // — lit, they were a second population of small bright objects with
    // nothing to sit on. The building's own answer is the same: it is the
    // main branchings that carry these.
    let largest = 0
    for (const knot of tree.knots) largest = Math.max(largest, knot.radius)

    const spot = new THREE.Vector3()
    for (const knot of tree.knots) {
      if (knot.radius < largest * LAMP_MIN_KNOT) continue
      spot.copy(knot.at).applyMatrix4(placement)
      for (let i = 0; i < LAMP_FACES; i++) {
        // Offset off the axes so a lamp does not sit where a branch leaves.
        const azimuth = ((i + 0.5) / LAMP_FACES) * Math.PI * 2
        const out = knot.radius * LAMP_INSET
        const matrix = new THREE.Matrix4()
          .makeScale(
            knot.radius * LAMP_DEPTH,
            knot.height * LAMP_RISE,
            knot.radius * LAMP_WIDTH,
          )
          .premultiply(new THREE.Matrix4().makeRotationY(azimuth))
          .premultiply(
            at(
              spot.x + Math.cos(azimuth) * out,
              spot.y,
              spot.z - Math.sin(azimuth) * out,
            ),
          )
        this.surface(
          'lucernari',
          // A unit sphere, and the placement makes it an oval. Its error is
          // a fraction of a small object's radius and decides nothing.
          () => ({ geometry: lampGeometry(), error: 0.004 }),
          matrix,
          'lamp',
        )
      }
    }
  }

  /**
   * The block at the foot of a shaft.
   *
   * One kind per order, however many columns of that order there are, and it
   * rides the column's own placement. Its error is the column's rather than
   * its own — a base is smaller than the shaft it stands under, so borrowing
   * the shaft's number switches it a level early, which costs nothing and is
   * the safe direction to be wrong in.
   */
  private base(
    order: ColumnOrder,
    matrix: THREE.Matrix4,
    trees: TreeColumn[],
    cut: StoneName,
  ): void {
    const key = `base ${order}`
    const kind = this.kinds.get(key)
    if (kind) {
      kind.placements.push(matrix)
      return
    }
    this.add(
      key,
      DETAIL_LEVELS.map((detail, level) => ({
        geometry: buildColumnBase({ order, radialSegments: shaftRadial(order, detail) }),
        error: trees[level]!.error,
      })),
      matrix,
      cut,
      COLUMN_TOLERANCE_PX,
    )
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

    // A tip is a branch end, so its throat is a branch's own girth.
    const throat = Math.max(0.6, columnMetrics(shape.order).inradius * 0.9)
    // Half the way to the next tip, and barely more. These want to *meet*,
    // not to overlap: a petal wider than the gap it spans buries itself in
    // its neighbours, and four of them on a small ring make a lump rather
    // than a rosette.
    const reach = Math.max(throat * 1.6, (gap / 2) * 1.06)
    // As tall as it is wide, near enough. Given the whole storey to climb it
    // becomes a spike, which is what a tip does not look like — and it would
    // be climbing ground the swelling over the column already covers.
    const rise = Math.min(
      Math.max(1.2, reach * 1.6),
      Math.max(1.2, (crown - tree.totalHeight) * vault.meetFraction),
    )
    const key = `tip ${treeKey(shape)}:${crown}`

    for (const tip of tips) {
      const spot = tip.clone().applyMatrix4(placement)
      this.surface(
        key,
        (detail) =>
          vaultSurface(throat, flareFor(throat, reach, rise), 0, rise, reach, detail),
        upright(spot.x, spot.y, spot.z),
        'vault',
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

    this.add(`funnel ${key}`, cells.map((c) => c.funnel), centre, 'vault')
    if (cells[0]!.cap) {
      this.add(`cap ${key}`, cells.map((c) => c.cap!), centre, 'vault')
    }

    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    for (const [index, [ox, oz]] of bossOffsets(spec.cell).entries()) {
      const y = opts.springs?.[index] ?? spec.springHeight
      this.add(
        `boss ${key}`,
        cells.map((c) => c.boss),
        upright(x + ox * cos + oz * sin, y, z - ox * sin + oz * cos),
        'vault',
      )
    }
  }

  /**
   * One surface of the caller's own making, placed by a matrix.
   *
   * `skyline` marks a piece that stands above the roofs and roofs nothing —
   * see `LAYER_SKYLINE`. It changes nothing about how the piece is drawn.
   */
  /**
   * `cut` is required and has no default on purpose. It briefly defaulted to
   * 'facade', and the twelve swellings over the apse ring quietly took the
   * envelope's stone — which is the one stone that gets no indoor fill,
   * because outdoors a shaded face really is lit by sky alone. Inside a dark
   * apse they came back as black blotches on the vault, and nothing about the
   * call site said anything was wrong. A default that is right four times out
   * of five is worse here than no default at all.
   */
  surface(
    key: string,
    make: (detail: number) => VaultSurface,
    matrix: THREE.Matrix4,
    cut: StoneName,
    skyline = false,
  ): void {
    let kind = this.kinds.get(key)
    if (!kind) {
      const levels = DETAIL_LEVELS.map(make)
      this.add(key, levels, matrix, cut, undefined, skyline)
      return
    }
    kind.placements.push(matrix)
  }

  /** A mesh drawn once, already placed in world space. */
  piece(mesh: THREE.Object3D, ...geometries: THREE.BufferGeometry[]): void {
    for (const geometry of geometries) agreeWinding(geometry)
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
    cut: StoneName,
    tolerancePx?: number,
    skyline?: boolean,
  ): void {
    let kind = this.kinds.get(key)
    if (!kind) {
      // Every instanced surface the field draws is registered here, and the
      // one-offs go through piece(), which makes these the two places the
      // winding invariant can be stated once rather than in each generator
      // that happens to remember it. Once per key: the later calls for the
      // same shape are only adding somewhere else to stand it.
      for (const level of levels) agreeWinding(level.geometry)
      kind = {
        name: key,
        levels,
        material: this.stones[cut],
        placements: [],
        tolerancePx,
        skyline,
      }
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

/**
 * A lucernari, in the knot's own girths.
 *
 * Four separate ovals set round the knot rather than one band about its
 * waist, which is what the first two attempts built. A band is a ring of
 * light whichever way you look at it, and six hundred of them turned a
 * frame down the nave into a rack of glowing bracelets; the real thing is
 * a plate on each face of the knot with stone showing between them, so a
 * knot seen from anywhere shows one or two ovals and a dark side.
 *
 * Each one is half sunk into the stone — its centre inside the ellipsoid,
 * its outer end a tenth proud — so what shows is a lens set in a socket
 * rather than a bead stuck on.
 */
const LAMP_FACES = 3
const LAMP_INSET = 0.62
const LAMP_DEPTH = 0.48
const LAMP_RISE = 0.34
const LAMP_WIDTH = 0.5

/** How small a knot may be, against the tree's largest, and still be lit. */
const LAMP_MIN_KNOT = 0.6

/**
 * The lens every lucernari is cut from, built once for the whole building.
 *
 * Coarse on purpose: it is never more than a metre across, it is always
 * over the film's white point, and the bloom spreads it a good deal wider
 * than its own outline — so segments spent on its silhouette are segments
 * spent on something nothing in the frame can resolve.
 */
let LAMP_GEOMETRY: THREE.BufferGeometry | null = null
function lampGeometry(): THREE.BufferGeometry {
  LAMP_GEOMETRY ??= new THREE.SphereGeometry(1, 20, 10)
  return LAMP_GEOMETRY
}

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

/**
 * A one-off mesh that says what it is.
 *
 * Instanced pieces already carry their full parameters in their names so a
 * frame can be interrogated; the meshes drawn once had nothing, and came back
 * from a census lumped together as "wall". A name costs nothing and the
 * measurements get sharper.
 */
export function named(
  name: string,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = name
  return mesh
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
