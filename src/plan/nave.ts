import * as THREE from 'three'
import { buildTreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics } from '../geometry/column.ts'
import { DETAIL_LEVELS } from '../geometry/detail.ts'
import { RoomEnvelope } from '../camera/envelope.ts'
import { bossOffsets, buildVaultCell, type VaultCellParams } from '../geometry/vault.ts'
import { InstancedField, type FieldKindSpec } from '../render/field.ts'
import { buildClerestory, defaultClerestory } from './clerestory.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { MODULE } from './module.ts'

/**
 * The nave: one cell, repeated.
 *
 * Phase 1 built a single bay and the gate found what a single bay cannot do —
 * it is open at both ends, so a third of every frame taken at eye height is
 * sky, and its vault has no neighbours to close its perimeter against. Neither
 * is a fault in the bay. Both are the absence of the next one.
 *
 * So this is the same cell, laid along the nave on the 7.5 m module. Nothing
 * about the cell changes: the same tree, the same two hyperboloid families,
 * the same wall. What changes is that they now have neighbours, which is the
 * whole of it.
 *
 * Repetition costs a draw call, not a column: every tree is an instance of one
 * baked geometry per level of detail, and the field picks the level per copy
 * per frame.
 */
export interface WallParams {
  show: boolean
  /** Clearance from the column line, so the wall stands outboard of the trees. */
  offset: number
  thickness: number
  /** Stone at each end of one bay's wall. */
  margin: number
  /** Stone between two lights. */
  mullion: number
  /** Lights across each register. */
  lights: number
  lowSill: number
  lowHead: number
  highSill: number
  highHead: number
}

export interface NaveParams {
  /** Column spacing across the nave. Two modules — the central nave's width. */
  bay: number
  /** Column spacing along the nave. */
  station: number
  /** Cells along the nave. */
  bays: number
  /**
   * Which cell sits on the origin, counted from the Glory end.
   *
   * The nave has to be centred on a cell rather than on a column line, because
   * every curated view is framed from inside one and they are the regression
   * harness. One number keeps all six of them pointing at the same stone they
   * pointed at when the bay stood alone.
   */
  originBay: number
  tree: TreeColumnParams
  vault: Omit<VaultCellParams, 'cell' | 'springHeight'>
  walls: WallParams
}

export const defaultNave: NaveParams = {
  bay: MODULE * 2,
  station: MODULE * 2,
  // Six cells of 15 m is the 90 m the nave is published at, from the Glory
  // façade to the crossing.
  bays: 6,
  originBay: 1,
  tree: {
    order: 12,
    levels: 2,
    branches: 4,
    splayDeg: 21,
    phaseDeg: 45,
    // Tuned so the branches hand off around 36 m, leaving the vault most of
    // the 9 m to the 45 m crown. Longer branches reach the crown themselves
    // and there is no vault left to build.
    branchLength: 0.36,
    knotRadiusScale: 1.14,
    knotHeightScale: 1.95,
    stages: 3,
  },
  vault: {
    crownHeight: MODULE * 6, // the nave vault, 45 m
    skylightRadius: 1.3,
    bossRadius: 2.4,
    meetFraction: 0.55,
    // 1.45 is what closes a cell against its own diagonal. With neighbours
    // either side the perimeter is now covered twice over, which is the point.
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
    highSill: 23,
    highHead: 33.5,
  },
}

export interface Nave {
  /** Everything drawn once: the walls and their glass. */
  group: THREE.Group
  /** Everything drawn many times: columns, funnels, bosses. */
  field: InstancedField
  /** Geometries owned by `group`, so callers can dispose the lot. */
  geometries: THREE.BufferGeometry[]
  /** Where the branches hand off to the vault. */
  springHeight: number
  /** Centre of each skylight, for placing lights later. */
  skylights: THREE.Vector3[]
  columnPositions: THREE.Vector3[]
  /** What the camera needs in order to walk here. */
  envelope: RoomEnvelope
  /** What the whole assembly occupies, instances included. */
  bounds: THREE.Box3
  /** Ends of the nave along z, for framing and for the camera. */
  extent: { near: number; far: number }
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

  const bays = Math.max(1, Math.round(p.bays))
  const origin = THREE.MathUtils.clamp(Math.round(p.originBay), 0, bays - 1)
  // Cells run from the Glory end (+z) toward the crossing (−z).
  const cellCentres = Array.from({ length: bays }, (_, i) => (origin - i) * p.station)
  const half = p.bay / 2
  const halfStation = p.station / 2
  const near = cellCentres[0]! + halfStation
  const far = cellCentres[bays - 1]! - halfStation

  // One tree per level of detail. The 24 m trunk and the 5.8 m twigs are the
  // same rule sampled at different steps, not the same mesh decimated.
  const trees = DETAIL_LEVELS.map((detail) => buildTreeColumn(p.tree, detail))
  const springHeight = trees[0]!.totalHeight

  // A column stands at every station on both lines, and neighbouring cells
  // share the ones between them — which is why the set is built from stations
  // rather than from cells.
  const columnPositions: THREE.Vector3[] = []
  for (let i = 0; i <= bays; i++) {
    const z = near - i * p.station
    columnPositions.push(new THREE.Vector3(-half, 0, z), new THREE.Vector3(half, 0, z))
  }

  const cellSize = { x: p.bay, z: p.station }
  const cells = DETAIL_LEVELS.map((detail) =>
    buildVaultCell({ ...p.vault, cell: cellSize, springHeight }, detail),
  )
  const corners = bossOffsets(cellSize)

  const bossPlacements: THREE.Matrix4[] = []
  const funnelPlacements: THREE.Matrix4[] = []
  const skylights: THREE.Vector3[] = []
  for (const centre of cellCentres) {
    funnelPlacements.push(upright(0, p.vault.crownHeight, centre))
    skylights.push(new THREE.Vector3(0, p.vault.crownHeight, centre))
    for (const [x, z] of corners) {
      bossPlacements.push(upright(x, springHeight, centre + z))
    }
  }

  const kinds: FieldKindSpec[] = [
    {
      name: 'column',
      levels: trees.map((t) => ({ geometry: t.geometry, error: t.error })),
      material: plaster,
      placements: columnPositions.map((c) => at(c.x, 0, c.z)),
      // A column is allowed several pixels where a vault is allowed one.
      // Its error is the depth of one flute clipped where the twist puts a
      // corner between two samples — a few pixels of one edge, not the whole
      // outline moving — and the shading either side of it is unchanged.
      // Measured rather than argued: at the distance this tolerance puts the
      // first switch, dropping a level changes the average plaster tone by
      // about 1/255, with no bias in either direction.
      tolerancePx: 5,
    },
    {
      name: 'funnel',
      levels: cells.map((c) => c.funnel),
      material: plaster,
      placements: funnelPlacements,
    },
    {
      name: 'boss',
      levels: cells.map((c) => c.boss),
      material: plaster,
      // Adjacent cells stack two bosses on the same column head. They are
      // opaque plaster and coincident, so the pair reads as the one swelling
      // it is — the same trick the ellipsoid knots play on the capitals.
      placements: bossPlacements,
    },
  ]
  const field = new InstancedField(kinds)

  if (p.walls.show) {
    // Nativity to +X, Passion to −X. That is the convention the sun model
    // assumes, and it is why morning light arrives green and evening red.
    for (const [sign, side] of [
      [1, 'nativity'],
      [-1, 'passion'],
    ] as const) {
      for (const [index, centre] of cellCentres.entries()) {
        const spec = defaultClerestory(p.station, springHeight, side)
        spec.thickness = p.walls.thickness
        spec.margin = p.walls.margin
        spec.mullion = p.walls.mullion
        // A different seed per bay, so the glazing does not repeat down the
        // nave the way the stone does. Nothing else about a bay varies yet.
        spec.seed += index * 97
        spec.registers = [
          { sill: p.walls.lowSill, head: p.walls.lowHead, lights: p.walls.lights, panesAcross: 4, panesUp: 12 },
          { sill: p.walls.highSill, head: p.walls.highHead, lights: p.walls.lights, panesAcross: 3, panesUp: 8 },
        ]

        const wall = buildClerestory(spec)
        geometries.push(wall.stone, wall.glass)

        const holder = new THREE.Group()
        holder.position.set(sign * (half + p.walls.offset), 0, centre)
        holder.rotation.y = (sign * Math.PI) / 2

        holder.add(new THREE.Mesh(wall.stone, plaster))

        // Glass sits on its own layer so the sun rig can render it separately
        // from everything that blocks light.
        const panes = new THREE.Mesh(wall.glass, glass)
        panes.layers.set(LAYER_GLASS)
        holder.add(panes)

        group.add(holder)
      }
    }
  }

  // The walls stand outboard of the columns, so the room is wider than the bay.
  const wallInner = p.walls.show ? half + p.walls.offset - p.walls.thickness / 2 : half + 12
  const columnRadius = columnMetrics(p.tree.order).innerDiameter / 2
  const envelope = new RoomEnvelope({
    halfWidth: wallInner,
    near,
    far,
    ceiling: p.vault.crownHeight,
    floor: 0,
    columns: columnPositions.map((c) => ({ x: c.x, z: c.z, radius: columnRadius })),
  })

  const reach = Math.max(half + trees[0]!.radius, wallInner + p.walls.thickness)
  const bounds = new THREE.Box3(
    new THREE.Vector3(-reach, 0, far - reach),
    new THREE.Vector3(reach, p.vault.crownHeight + 2, near + reach),
  )

  return {
    group,
    field,
    geometries,
    springHeight,
    skylights,
    columnPositions,
    envelope,
    bounds,
    extent: { near, far },
  }
}
