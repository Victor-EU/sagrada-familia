import * as THREE from 'three'
import { buildTreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import { buildVaultCell, type VaultCellParams } from '../geometry/vault.ts'
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
 * The four columns share one geometry set: the tree is built once and cloned,
 * and `clone()` keeps geometry and material references, so four columns cost
 * what one costs.
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
    knotSegments: 48,
    stages: 3,
    radialSegments: 192,
    heightSegments: 128,
  },
  vault: {
    crownHeight: MODULE * 6, // the nave vault, 45 m
    skylightRadius: 1.3,
    bossRadius: 2.4,
    meetFraction: 0.55,
    // Above ~1.4 the two families overlap enough to close the cell. Adjacent
    // bays will cover the perimeter once the nave is tiled.
    spread: 1.45,
    radialSegments: 128,
    heightSegments: 64,
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
  group: THREE.Group
  geometries: THREE.BufferGeometry[]
  /** Where the branches hand off to the vault. */
  springHeight: number
  /** Centre of the skylight, for placing the light later. */
  skylight: THREE.Vector3
  columnPositions: THREE.Vector3[]
}

export function buildBay(
  p: BayParams,
  plaster: THREE.Material,
  glass: THREE.Material,
): Bay {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []

  const template = buildTreeColumn(p.tree, plaster)
  geometries.push(...template.geometries)

  const half = p.bay / 2
  const columnPositions: THREE.Vector3[] = []
  for (const [x, z] of [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ] as const) {
    const instance = template.group.clone()
    instance.position.set(x, 0, z)
    group.add(instance)
    columnPositions.push(new THREE.Vector3(x, 0, z))
  }

  // The vault springs from wherever the branches actually end, rather than
  // from a number typed in twice.
  const springHeight = template.totalHeight
  const vault = buildVaultCell({ ...p.vault, bay: p.bay, springHeight }, plaster)
  geometries.push(...vault.geometries)
  group.add(vault.group)

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

  return { group, geometries, springHeight, skylight: vault.skylight, columnPositions }
}
