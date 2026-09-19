import * as THREE from 'three'
import { buildTreeColumn, type TreeColumnParams } from '../geometry/branch.ts'
import { buildVaultCell, type VaultCellParams } from '../geometry/vault.ts'
import { MODULE } from './module.ts'

/**
 * One nave bay: four tree columns at the corners of a square cell, and the
 * vault they carry.
 *
 * This is the vertical slice the design doc calls the go/no-go — the smallest
 * scene that exercises the column rule, a hyperboloid vault, both camera
 * behaviours and the plaster look under coloured light all at once.
 *
 * The four columns share one geometry set: the tree is built once and cloned,
 * and `clone()` keeps geometry and material references, so four columns cost
 * what one costs.
 */
export interface BayParams {
  /** Column spacing. Defaults to two modules. */
  bay: number
  tree: TreeColumnParams
  vault: Omit<VaultCellParams, 'bay' | 'springHeight'>
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

export function buildBay(p: BayParams, material: THREE.Material): Bay {
  const group = new THREE.Group()
  const geometries: THREE.BufferGeometry[] = []

  const template = buildTreeColumn(p.tree, material)
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
  const vault = buildVaultCell(
    { ...p.vault, bay: p.bay, springHeight },
    material,
  )
  geometries.push(...vault.geometries)
  group.add(vault.group)

  return { group, geometries, springHeight, skylight: vault.skylight, columnPositions }
}
