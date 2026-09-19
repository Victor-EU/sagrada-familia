import * as THREE from 'three'
import { buildTreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import { DETAIL_LEVELS } from '../geometry/detail.ts'
import { RoomEnvelope } from '../camera/envelope.ts'
import { bossOffsets, buildVaultCell, type VaultCellParams } from '../geometry/vault.ts'
import { InstancedField, type FieldKindSpec } from '../render/field.ts'
import { buildClerestory, defaultClerestory } from './clerestory.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { MODULE } from './module.ts'

/**
 * The nave: five of them, tiled.
 *
 * Phase 1 built a single cell and the gate found what a single cell cannot do
 * — it is open at every side, so a third of any eye-height frame came back
 * sky, and its vault had no neighbours to close its perimeter against. Neither
 * was a fault in the cell. Both were the absence of the next one.
 *
 * The plan is the published one. Five naves across: a central nave of 15 m
 * flanked by four aisles of 7.5 m, which is the 45 m the building measures,
 * and every number of it an integer count of the 7.5 m module. The central
 * vault stands at 45 m and the aisles at 30 m, six modules and four.
 *
 * Columns are chosen by load, which is Gaudí's own rule and not an invention
 * here: the published assignment gives the twelve-pointed porphyry to the
 * four columns of the crossing, the ten-pointed basalt to the apse, and the
 * six-pointed sandstone to the side naves. Only the central nave's own order
 * is argued for rather than quoted — see the note on the band below. The
 * crossing and the apse belong to phase 3.
 *
 * Where the aisle vault meets a central-nave column it simply dies into it.
 * The boss is a hyperboloid whose throat is wider than the shaft it lands on,
 * and both are opaque plaster, so the junction needs no geometry of its own —
 * the same argument the ellipsoid knots make about capitals, and the reason
 * there is still no boolean anywhere in this project.
 */
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

export interface WallParams {
  show: boolean
  /** Clearance from the outermost column line. */
  offset: number
  thickness: number
  /** Stone at each end of one bay's wall. */
  margin: number
  /** Stone between two lights. */
  mullion: number
  /** Lights across each register. */
  lights: number
  /** The aisle windows, the ones you stand beside. */
  lowSill: number
  lowHead: number
  /** The clerestory, riding above the aisle vaults on the nave's own wall. */
  highSill: number
  highHead: number
  /** How far outboard of the nave column line the clerestory wall stands. */
  clerestoryOffset: number
}

export interface NaveParams {
  /** Column spacing along the nave. */
  station: number
  /** Cells along the nave. */
  bays: number
  /**
   * Which cell sits on the origin, counted from the Glory end.
   *
   * The nave has to be centred on a cell rather than on a column line, because
   * every curated view is framed from inside one and they are the regression
   * harness. One number keeps all of them pointing at the same stone.
   */
  originBay: number
  /** Across the nave, from the centreline out. The first is the central nave. */
  bands: BandParams[]
  /** Shape shared by every tree; order and branching come from the band. */
  tree: Omit<TreeColumnParams, 'order' | 'levels' | 'branchLength'>
  vault: Omit<VaultCellParams, 'cell' | 'springHeight' | 'crownHeight' | 'skylight'>
  walls: WallParams
}

export const defaultNave: NaveParams = {
  station: MODULE * 2,
  // Six cells of 15 m is the 90 m the nave is published at, from the Glory
  // façade to the crossing.
  bays: 6,
  originBay: 1,
  bands: [
    // 15 m across and 45 m up: two modules and six.
    //
    // Ten-pointed, and this is the least settled number in the plan. The
    // published sources are explicit about three of the four orders — twelve
    // at the crossing, ten in the apse, six for the side naves — and they
    // disagree with each other about the central nave, one calling it
    // eight-pointed granite. Three things decide it here: the load
    // hierarchy has four tiers and the nave is the second of them; the
    // height published for the central nave, 22.2 m, is nearest to the
    // twenty that the height = 2 × points rule gives an order of ten; and
    // ten is the only choice that steps 10 → 8 → 6 through the branching,
    // which is the taper the stone forest is *for*. Eight branches to six
    // and then to six again, and limbs that never thin read as a bush.
    // Recorded as open in the design doc.
    { name: 'central nave', outer: MODULE, crown: MODULE * 6, order: 10, levels: 2, branchLength: 0.62, skylight: true },
    // 7.5 m aisles at 30 m. Six-pointed sandstone, which is documented.
    // Branches kept short on purpose. An aisle column that reaches 26 m
    // leaves its 30 m vault less than four metres of rise, which is a disc
    // rather than a vault; at 21 m the cell has eight and reads as one.
    { name: 'inner aisle', outer: MODULE * 2, crown: MODULE * 4, order: 6, levels: 2, branchLength: 0.42, skylight: false },
    { name: 'outer aisle', outer: MODULE * 3, crown: MODULE * 4, order: 6, levels: 2, branchLength: 0.42, skylight: false },
  ],
  tree: {
    branches: 4,
    splayDeg: 21,
    phaseDeg: 45,
    knotRadiusScale: 1.14,
    knotHeightScale: 1.95,
    stages: 3,
  },
  vault: {
    skylightRadius: 1.3,
    bossRadius: 2.4,
    meetFraction: 0.55,
    // 1.45 is what closes a cell against its own diagonal. With neighbours on
    // every side the perimeter is now covered twice over, which is the point.
    spread: 1.45,
  },
  walls: {
    show: true,
    offset: 1.9,
    thickness: 0.9,
    margin: 1.1,
    mullion: 0.55,
    lights: 3,
    lowSill: 3.2,
    lowHead: 17,
    highSill: 32,
    highHead: 41,
    clerestoryOffset: 0.55,
  },
}

export interface Nave {
  /** Everything drawn once: the walls and their glass. */
  group: THREE.Group
  /** Everything drawn many times: columns, funnels, bosses. */
  field: InstancedField
  /** Geometries owned by `group`, so callers can dispose the lot. */
  geometries: THREE.BufferGeometry[]
  /** Where the central nave's branches hand off to its vault. */
  springHeight: number
  /** Centre of each central-nave skylight. */
  skylights: THREE.Vector3[]
  columnPositions: THREE.Vector3[]
  /** What the camera needs in order to walk here. */
  envelope: RoomEnvelope
  /** What the whole assembly occupies, instances included. */
  bounds: THREE.Box3
  /** Ends of the nave along z, for framing and for the camera. */
  extent: { near: number; far: number }
  /** Half the width of the room, inner face to centreline. */
  halfWidth: number
  /** Springing of each band's vault, for the record. */
  springs: number[]
}

/** A placement with no rotation or scale. */
function at(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4().makeTranslation(x, y, z)
}

/**
 * Hyperboloids are generated with z as their axis; the world is y up. One
 * quarter turn on the way in, and the mathematics stays clean.
 */
function upright(x: number, y: number, z: number): THREE.Matrix4 {
  return new THREE.Matrix4()
    .makeRotationX(-Math.PI / 2)
    .premultiply(at(x, y, z))
}

export function buildNave(
  p: NaveParams,
  plaster: THREE.Material,
  glass: THREE.Material,
): Nave {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []
  const kinds: FieldKindSpec[] = []

  const bays = Math.max(1, Math.round(p.bays))
  const origin = THREE.MathUtils.clamp(Math.round(p.originBay), 0, bays - 1)
  // Cells run from the Glory end (+z) toward the crossing (−z).
  const cellCentres = Array.from({ length: bays }, (_, i) => (origin - i) * p.station)
  const halfStation = p.station / 2
  const near = cellCentres[0]! + halfStation
  const far = cellCentres[bays - 1]! - halfStation
  const stations = Array.from({ length: bays + 1 }, (_, i) => near - i * p.station)

  const crown = p.bands[0]!.crown

  // One set of trees per column line, at every level of detail. Lines that
  // agree about order and branching share a set, so the two aisle lines cost
  // one tree between them.
  const treeCache = new Map<string, ReturnType<typeof buildTreeColumn>[]>()
  const treesFor = (band: BandParams): ReturnType<typeof buildTreeColumn>[] => {
    const key = `${band.order}:${band.levels}:${band.branchLength}`
    const hit = treeCache.get(key)
    if (hit) return hit
    const shape: TreeColumnParams = {
      ...p.tree,
      order: band.order,
      levels: band.levels,
      branchLength: band.branchLength,
    }
    const built = DETAIL_LEVELS.map((detail) => buildTreeColumn(shape, detail))
    treeCache.set(key, built)
    return built
  }

  // Column lines, and where each band's vault springs from.
  const columnPositions: THREE.Vector3[] = []
  const linePlacements = new Map<string, THREE.Matrix4[]>()
  const springs: number[] = []

  for (const band of p.bands) {
    const trees = treesFor(band)
    springs.push(trees[0]!.totalHeight)
    const key = `${band.order}:${band.levels}:${band.branchLength}`
    let list = linePlacements.get(key)
    if (!list) {
      list = []
      linePlacements.set(key, list)
    }
    for (const sign of [-1, 1]) {
      for (const z of stations) {
        const x = sign * band.outer
        columnPositions.push(new THREE.Vector3(x, 0, z))
        list.push(at(x, 0, z))
      }
    }
  }

  for (const [key, placements] of linePlacements) {
    const trees = treeCache.get(key)!
    kinds.push({
      name: `column ${key}`,
      levels: trees.map((t) => ({ geometry: t.geometry, error: t.error })),
      material: plaster,
      placements,
      // A column is allowed several pixels where a vault is allowed one.
      // Its error is the depth of one flute clipped where the twist puts a
      // corner between two samples — a few pixels of one edge, not the whole
      // outline moving — and the shading either side of it is unchanged.
      // Measured rather than argued: at the distance this tolerance puts the
      // first switch, dropping a level changes the average plaster tone by
      // about 1/255, with no bias in either direction.
      tolerancePx: 5,
    })
  }

  // Vault cells. One shape per band — the central nave's is square, the
  // aisles' are half as wide and the same length — and both mirrored bands
  // share it.
  const skylights: THREE.Vector3[] = []
  for (const [index, band] of p.bands.entries()) {
    const inner = index === 0 ? 0 : p.bands[index - 1]!.outer
    const width = index === 0 ? band.outer * 2 : band.outer - inner
    const cell = { x: width, z: p.station }
    const springHeight = springs[index]!

    const cells = DETAIL_LEVELS.map((detail) =>
      buildVaultCell(
        { ...p.vault, crownHeight: band.crown, cell, springHeight, skylight: band.skylight },
        detail,
      ),
    )
    const corners = bossOffsets(cell)

    // The central band is one run of cells on the centreline; every other
    // band is a mirrored pair.
    const centresX = index === 0 ? [0] : [-(inner + width / 2), inner + width / 2]

    const funnelPlacements: THREE.Matrix4[] = []
    const bossPlacements: THREE.Matrix4[] = []
    for (const cx of centresX) {
      for (const cz of cellCentres) {
        funnelPlacements.push(upright(cx, band.crown, cz))
        if (index === 0) skylights.push(new THREE.Vector3(cx, band.crown, cz))
        for (const [ox, oz] of corners) {
          bossPlacements.push(upright(cx + ox, springHeight, cz + oz))
        }
      }
    }

    if (cells[0]!.cap) {
      kinds.push({
        name: `cap ${band.name}`,
        levels: cells.map((c) => c.cap!),
        material: plaster,
        placements: funnelPlacements,
      })
    }

    kinds.push(
      {
        name: `funnel ${band.name}`,
        levels: cells.map((c) => c.funnel),
        material: plaster,
        placements: funnelPlacements,
      },
      {
        name: `boss ${band.name}`,
        levels: cells.map((c) => c.boss),
        material: plaster,
        // Adjacent cells stack two bosses on the same column head, and where
        // an aisle meets the nave the boss lands on a shaft rather than on a
        // branch tip. Opaque and coincident either way, so it reads as the
        // one swelling it is.
        placements: bossPlacements,
      },
    )
  }

  const field = new InstancedField(kinds)

  const outermost = p.bands[p.bands.length - 1]!.outer
  const wallCentre = outermost + p.walls.offset
  const aisleCrown = p.bands[p.bands.length - 1]!.crown

  if (p.walls.show) {
    // Nativity to +X, Passion to −X. That is the convention the sun model
    // assumes, and it is why morning light arrives green and evening red.
    for (const [sign, side] of [
      [1, 'nativity'],
      [-1, 'passion'],
    ] as const) {
      for (const [index, centre] of cellCentres.entries()) {
        // 0 at the Glory end, 1 at the crossing.
        const along = bays > 1 ? index / (bays - 1) : 1

        const outer = defaultClerestory(p.station, aisleCrown, side)
        outer.thickness = p.walls.thickness
        outer.margin = p.walls.margin
        outer.mullion = p.walls.mullion
        outer.gradeHeight = crown
        outer.along = along
        // A different seed per bay, so the glazing does not repeat down the
        // nave the way the stone does.
        outer.seed += index * 97
        outer.registers = [
          {
            sill: p.walls.lowSill,
            head: p.walls.lowHead,
            lights: p.walls.lights,
            panesAcross: 4,
            panesUp: 12,
          },
        ]
        addWall(outer, sign * wallCentre, centre)

        // The clerestory: the nave's own wall, standing on the aisle vaults
        // and glazed nearly clear, because what it is lighting is the vault.
        const high = defaultClerestory(p.station, p.walls.highHead + 1, side)
        high.thickness = p.walls.thickness
        high.base = aisleCrown
        high.margin = p.walls.margin
        high.mullion = p.walls.mullion
        high.gradeHeight = crown
        high.along = along
        high.seed += index * 97 + 5
        high.registers = [
          {
            sill: p.walls.highSill,
            head: p.walls.highHead,
            lights: p.walls.lights,
            panesAcross: 3,
            panesUp: 8,
          },
        ]
        addWall(high, sign * (p.bands[0]!.outer + p.walls.clerestoryOffset), centre)
      }
    }
  }

  function addWall(
    spec: ReturnType<typeof defaultClerestory>,
    x: number,
    z: number,
  ): void {
    const wall = buildClerestory(spec)
    geometries.push(wall.stone, wall.glass)

    const holder = new THREE.Group()
    holder.position.set(x, 0, z)
    holder.rotation.y = (Math.sign(x) * Math.PI) / 2

    holder.add(new THREE.Mesh(wall.stone, plaster))

    // Glass sits on its own layer so the sun rig can render it separately
    // from everything that blocks light.
    const panes = new THREE.Mesh(wall.glass, glass)
    panes.layers.set(LAYER_GLASS)
    holder.add(panes)

    group.add(holder)
  }

  // The walls stand outboard of the columns, so the room is wider than the
  // outermost column line.
  const halfWidth = p.walls.show ? wallCentre - p.walls.thickness / 2 : outermost + 12
  const envelope = new RoomEnvelope({
    halfWidth,
    near,
    far,
    ceiling: crown,
    floor: 0,
    columns: columnPositions.map((c) => ({
      x: c.x,
      z: c.z,
      radius: columnRadiusAt(p, c.x),
    })),
  })

  const reach = halfWidth + p.walls.thickness + 4
  const bounds = new THREE.Box3(
    new THREE.Vector3(-reach, 0, far - reach),
    new THREE.Vector3(reach, crown + 2, near + reach),
  )

  return {
    group,
    field,
    geometries,
    springHeight: springs[0]!,
    skylights,
    columnPositions,
    envelope,
    bounds,
    extent: { near, far },
    halfWidth,
    springs,
  }
}

/** Shaft radius of whichever line stands at this x. */
function columnRadiusAt(p: NaveParams, x: number): number {
  const band = p.bands.find((b) => Math.abs(Math.abs(x) - b.outer) < 1e-6) ?? p.bands[0]!
  return columnMetrics(band.order).innerDiameter / 2
}
