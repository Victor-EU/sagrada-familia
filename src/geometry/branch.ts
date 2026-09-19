import * as THREE from 'three'
import {
  buildColumn,
  columnMetrics,
  COLUMN_ORDERS,
  type ColumnOrder,
  type ColumnParams,
} from './column.ts'

/**
 * The branching node — the stone forest.
 *
 * The published description is the rule we follow: the shaft imitates a trunk,
 * the capital acts as a knot, and the column branches from there before
 * merging into the vaults. The knot itself is an **ellipsoid**, and the shaft's
 * circular capital is hidden inside it — so the join never has to be shown.
 *
 * That last point is what makes this tractable without constructive solid
 * geometry. Everything is opaque white plaster, so an ellipsoid that swallows
 * the capital and branch bases reads as one continuous form. No booleans, no
 * metaballs, no blend surfaces.
 *
 * Load falls as it divides, and column order is chosen by load, so each level
 * of branching steps down one order: 12 → 10 → 8 → 6.
 */
export interface TreeColumnParams {
  order: ColumnOrder
  /** Levels of branching. 0 is a bare shaft with a capital knot. */
  levels: number
  /** Branches leaving each knot. */
  branches: number
  /** Tilt from vertical, degrees. */
  splayDeg: number
  /** Rotation of each fan, degrees — keeps successive levels from aligning. */
  phaseDeg: number
  /** Branch length as a fraction of that order's own full height. */
  branchLength: number
  /** Ellipsoid semi-axes, as multiples of the shaft's inner radius. */
  knotRadiusScale: number
  knotHeightScale: number
  knotSegments: number
  /** Tessellation shared by every column in the assembly. */
  stages: number
  radialSegments: number
  heightSegments: number
}

export const defaultTreeColumn: TreeColumnParams = {
  order: 12,
  levels: 2,
  branches: 4,
  splayDeg: 21,
  phaseDeg: 45,
  branchLength: 0.52,
  // Narrow and tall: a wide sphere reads as a bead threaded on a stick, an
  // elongated ellipsoid as a swelling in the branch itself.
  knotRadiusScale: 1.14,
  knotHeightScale: 1.95,
  knotSegments: 48,
  stages: 3,
  radialSegments: 192,
  heightSegments: 128,
}

/** Next order down the hierarchy; the smallest order stays put. */
export function childOrder(order: ColumnOrder): ColumnOrder {
  const i = COLUMN_ORDERS.indexOf(order)
  return i > 0 ? COLUMN_ORDERS[i - 1]! : order
}

export interface TreeColumn {
  group: THREE.Group
  /** Every distinct geometry built, so callers can dispose the lot. */
  geometries: THREE.BufferGeometry[]
  /** Where the outermost branches end — the vault springs from these. */
  tips: THREE.Vector3[]
  totalHeight: number
}

/**
 * Assemble a tree column. Returns a group in world orientation (y up); the
 * column generator works with z as its axis, so each mesh rotates on the way in.
 */
export function buildTreeColumn(
  params: TreeColumnParams,
  material: THREE.Material,
): TreeColumn {
  const geometries: THREE.BufferGeometry[] = []
  const tipMarkers: THREE.Object3D[] = []
  const group = new THREE.Group()

  // One geometry per (order, lengthFraction) — every branch at a given level is
  // the same shape, which is also what makes this instanceable later.
  const cache = new Map<string, THREE.BufferGeometry>()
  const columnGeometry = (order: ColumnOrder, lengthFraction: number): THREE.BufferGeometry => {
    const key = `${order}:${lengthFraction.toFixed(4)}`
    const hit = cache.get(key)
    if (hit) return hit
    const shape: ColumnParams = {
      order,
      stages: params.stages,
      radialSegments: params.radialSegments,
      heightSegments: params.heightSegments,
      lengthFraction,
    }
    const geometry = buildColumn(shape)
    cache.set(key, geometry)
    geometries.push(geometry)
    return geometry
  }

  const knotGeometry = new THREE.SphereGeometry(1, params.knotSegments, params.knotSegments / 2)
  geometries.push(knotGeometry)

  const splay = THREE.MathUtils.degToRad(params.splayDeg)

  /** Adds a shaft, its knot, and recursively its branches, into `parent`. */
  function grow(parent: THREE.Object3D, order: ColumnOrder, level: number, phase: number): void {
    const m = columnMetrics(order)
    const isTrunk = level === 0
    const fraction = isTrunk ? 1 : params.branchLength
    const length = m.height * fraction

    const shaft = new THREE.Mesh(columnGeometry(order, fraction), material)
    shaft.rotation.x = -Math.PI / 2
    shaft.castShadow = true
    shaft.receiveShadow = true
    parent.add(shaft)

    // The knot sits on the capital so that its lower half swallows it.
    const knot = new THREE.Mesh(knotGeometry, material)
    knot.position.y = length
    knot.scale.set(
      m.inradius * params.knotRadiusScale,
      m.inradius * params.knotHeightScale,
      m.inradius * params.knotRadiusScale,
    )
    knot.castShadow = true
    knot.receiveShadow = true
    parent.add(knot)

    if (level >= params.levels) {
      // Mark the branch end rather than resolving it now — world matrices are
      // only valid once the whole hierarchy exists.
      const marker = new THREE.Object3D()
      marker.position.y = length
      parent.add(marker)
      tipMarkers.push(marker)
      return
    }

    const next = childOrder(order)
    for (let i = 0; i < params.branches; i++) {
      const azimuth = (i / params.branches) * Math.PI * 2 + phase

      const pivot = new THREE.Group()
      pivot.position.y = length
      pivot.rotation.y = azimuth
      parent.add(pivot)

      // After the azimuth turn, local +X is the outward direction; a negative
      // rotation about Z leans the branch that way.
      const tilt = new THREE.Group()
      tilt.rotation.z = -splay
      pivot.add(tilt)

      grow(tilt, next, level + 1, phase + THREE.MathUtils.degToRad(params.phaseDeg))
    }
  }

  grow(group, params.order, 0, 0)
  group.updateMatrixWorld(true)

  const tips = tipMarkers.map((marker) => marker.getWorldPosition(new THREE.Vector3()))
  let totalHeight = 0
  for (const t of tips) totalHeight = Math.max(totalHeight, t.y)

  return { group, geometries, tips, totalHeight }
}
