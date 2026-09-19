import * as THREE from 'three'
import { buildTreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics } from '../geometry/column.ts'
import { DETAIL_LEVELS } from '../geometry/detail.ts'
import { BayEnvelope } from '../camera/envelope.ts'
import { bossOffsets, buildVaultCell, type VaultCellParams } from '../geometry/vault.ts'
import { InstancedField, type FieldKindSpec } from '../render/field.ts'
import { buildClerestory, defaultClerestory } from './clerestory.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { MODULE } from './module.ts'

/**
 * One nave bay: four tree columns at the corners of a square cell, the vault
 * they carry, and the two glazed walls that make the light worth looking at.
 *
 * This is the vertical slice the design doc calls the go/no-go — the smallest
 * scene that exercises the column rule, a hyperboloid vault, both camera
 * behaviours and the plaster look under coloured light all at once.
 *
 * Everything repeated is built once per level of detail and then instanced, so
 * four columns cost one draw call and the count does not change when the nave
 * grows to seventy of them.
 */
export interface WallParams {
  show: boolean
  /** Clearance from the column line, so the wall stands outboard of the trees. */
  offset: number
  thickness: number
  /** Stone at each end of the wall. */
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

export interface BayParams {
  /** Column spacing. Defaults to two modules. */
  bay: number
  tree: TreeColumnParams
  vault: Omit<VaultCellParams, 'bay' | 'springHeight'>
  walls: WallParams
}

export const defaultBay: BayParams = {
  bay: MODULE * 2,
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
    // Above ~1.4 the two families overlap enough to close the cell. Adjacent
    // bays will cover the perimeter once the nave is tiled.
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

export interface Bay {
  /** Everything drawn once: the walls and their glass. */
  group: THREE.Group
  /** Everything drawn many times: columns, funnels, bosses. */
  field: InstancedField
  /** Geometries owned by `group`, so callers can dispose the lot. */
  geometries: THREE.BufferGeometry[]
  /** Where the branches hand off to the vault. */
  springHeight: number
  /** Centre of the skylight, for placing the light later. */
  skylight: THREE.Vector3
  columnPositions: THREE.Vector3[]
  /** What the camera needs in order to walk here. */
  envelope: BayEnvelope
  /** What the whole assembly occupies, instances included. */
  bounds: THREE.Box3
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

export function buildBay(
  p: BayParams,
  plaster: THREE.Material,
  glass: THREE.Material,
): Bay {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []

  // One tree per level of detail. The 24 m trunk and the 5.8 m twigs are the
  // same rule sampled at different steps, not the same mesh decimated.
  const trees = DETAIL_LEVELS.map((detail) => buildTreeColumn(p.tree, detail))
  const springHeight = trees[0]!.totalHeight

  const half = p.bay / 2
  const corners = bossOffsets(p.bay)
  const columnPositions = corners.map(([x, z]) => new THREE.Vector3(x, 0, z))

  // The vault springs from wherever the branches actually end, rather than
  // from a number typed in twice.
  const cells = DETAIL_LEVELS.map((detail) =>
    buildVaultCell({ ...p.vault, bay: p.bay, springHeight }, detail),
  )
  const cell = cells[0]!

  const kinds: FieldKindSpec[] = [
    {
      name: 'column',
      levels: trees.map((t) => ({ geometry: t.geometry, error: t.error })),
      material: plaster,
      placements: corners.map(([x, z]) => at(x, 0, z)),
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
      placements: [upright(0, cell.crownHeight, 0)],
    },
    {
      name: 'boss',
      levels: cells.map((c) => c.boss),
      material: plaster,
      placements: corners.map(([x, z]) => upright(x, springHeight, z)),
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
      const spec = defaultClerestory(p.bay, springHeight, side)
      spec.thickness = p.walls.thickness
      spec.margin = p.walls.margin
      spec.mullion = p.walls.mullion
      spec.registers = [
        { sill: p.walls.lowSill, head: p.walls.lowHead, lights: p.walls.lights, panesAcross: 4, panesUp: 12 },
        { sill: p.walls.highSill, head: p.walls.highHead, lights: p.walls.lights, panesAcross: 3, panesUp: 8 },
      ]

      const wall = buildClerestory(spec)
      geometries.push(wall.stone, wall.glass)

      const holder = new THREE.Group()
      holder.position.x = sign * (half + p.walls.offset)
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

  // The walls stand outboard of the columns, so the room is wider than the bay.
  const wallInner = p.walls.show ? half + p.walls.offset - p.walls.thickness / 2 : half + 12
  const columnRadius = columnMetrics(p.tree.order).innerDiameter / 2
  const envelope = new BayEnvelope({
    halfWidth: wallInner,
    halfDepth: half,
    ceiling: p.vault.crownHeight,
    floor: 0,
    columns: columnPositions.map((c) => ({ x: c.x, z: c.z, radius: columnRadius })),
  })

  const bounds = new THREE.Box3()
  group.updateMatrixWorld(true)
  bounds.setFromObject(group)
  const reach = Math.max(half + trees[0]!.radius, wallInner + p.walls.thickness)
  bounds.expandByPoint(new THREE.Vector3(-reach, 0, -reach))
  bounds.expandByPoint(new THREE.Vector3(reach, p.vault.crownHeight + 2, reach))

  return {
    group,
    field,
    geometries,
    springHeight,
    skylight: cell.skylight,
    columnPositions,
    envelope,
    bounds,
  }
}
