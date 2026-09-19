import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import {
  buildColumn,
  columnMetrics,
  columnSectionError,
  COLUMN_ORDERS,
  type ColumnOrder,
  type ColumnParams,
} from './column.ts'
import { knotSegments, shaftRadial, shaftRows } from './detail.ts'

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
 *
 * A tree is baked to **one geometry**. Twenty-one meshes per column is twenty-
 * one draw calls, and a nave has seventy-odd columns; merged once at build
 * time, a whole tree is a single instanceable piece of stone.
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
  stages: number
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
  stages: 3,
}

/** Next order down the hierarchy; the smallest order stays put. */
export function childOrder(order: ColumnOrder): ColumnOrder {
  const i = COLUMN_ORDERS.indexOf(order)
  return i > 0 ? COLUMN_ORDERS[i - 1]! : order
}

export interface TreeColumn {
  /** The whole tree as one geometry, standing on the origin, y up. */
  geometry: THREE.BufferGeometry
  /** Where the outermost branches end — the vault springs from these. */
  tips: THREE.Vector3[]
  totalHeight: number
  /** Widest horizontal reach, for placing walls and for culling. */
  radius: number
  /**
   * How far this tessellation strays from the true surface, in metres —
   * measured, not estimated. What the level-of-detail switch is judged on.
   */
  error: number
}

/**
 * Build a tree column at one level of detail.
 *
 * `detail` is the scalar from `detail.ts`: 1 is what you stand next to, and
 * each level down halves it. Nothing is decimated — the surface is re-sampled
 * from the same rule at a coarser step, so a distant column is still exactly
 * the column, and its star keeps its points.
 */
export function buildTreeColumn(params: TreeColumnParams, detail = 1): TreeColumn {
  const tipMarkers: THREE.Object3D[] = []
  const root = new THREE.Group()

  // One geometry per (order, lengthFraction) — every branch at a given level
  // is the same shape. They are merged away below, but building each shape
  // once still saves the generator work.
  const cache = new Map<string, THREE.BufferGeometry>()
  const columnGeometry = (order: ColumnOrder, lengthFraction: number): THREE.BufferGeometry => {
    const key = `${order}:${lengthFraction.toFixed(4)}`
    const hit = cache.get(key)
    if (hit) return hit
    const height = columnMetrics(order).height * lengthFraction
    const shape: ColumnParams = {
      order,
      stages: params.stages,
      radialSegments: shaftRadial(order, detail),
      heightSegments: shaftRows(height, detail),
      lengthFraction,
    }
    const geometry = buildColumn(shape)
    cache.set(key, geometry)
    return geometry
  }

  const knotCache = new Map<ColumnOrder, THREE.BufferGeometry>()
  const knotGeometry = (order: ColumnOrder): THREE.BufferGeometry => {
    const hit = knotCache.get(order)
    if (hit) return hit
    const segments = knotSegments(order, detail)
    const geometry = new THREE.SphereGeometry(1, segments, segments / 2)
    knotCache.set(order, geometry)
    return geometry
  }

  const splay = THREE.MathUtils.degToRad(params.splayDeg)

  /** Adds a shaft, its knot, and recursively its branches, into `parent`. */
  function grow(parent: THREE.Object3D, order: ColumnOrder, level: number, phase: number): void {
    const m = columnMetrics(order)
    const isTrunk = level === 0
    const fraction = isTrunk ? 1 : params.branchLength
    const length = m.height * fraction

    const shaft = new THREE.Mesh(columnGeometry(order, fraction))
    shaft.rotation.x = -Math.PI / 2
    parent.add(shaft)

    // The knot sits on the capital so that its lower half swallows it.
    const knot = new THREE.Mesh(knotGeometry(order))
    knot.position.y = length
    knot.scale.set(
      m.inradius * params.knotRadiusScale,
      m.inradius * params.knotHeightScale,
      m.inradius * params.knotRadiusScale,
    )
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

  grow(root, params.order, 0, 0)
  root.updateMatrixWorld(true)

  const pieces: THREE.BufferGeometry[] = []
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      pieces.push(node.geometry.clone().applyMatrix4(node.matrixWorld))
    }
  })

  const geometry = mergeGeometries(pieces, false)
  for (const piece of pieces) piece.dispose()
  for (const shape of cache.values()) shape.dispose()
  for (const shape of knotCache.values()) shape.dispose()

  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  const tips = tipMarkers.map((marker) => marker.getWorldPosition(new THREE.Vector3()))
  let totalHeight = 0
  for (const t of tips) totalHeight = Math.max(totalHeight, t.y)

  const box = geometry.boundingBox!
  const radius = Math.max(
    Math.abs(box.min.x), Math.abs(box.max.x),
    Math.abs(box.min.z), Math.abs(box.max.z),
  )

  // The worst any shaft in the tree does, not the average: the level has to
  // survive the piece you are looking straight at.
  let error = 0
  let order = params.order
  for (let level = 0; level <= params.levels; level++) {
    const [worst] = columnSectionError(order, params.stages, [shaftRadial(order, detail)])
    error = Math.max(error, worst ?? 0)
    order = childOrder(order)
  }

  return { geometry, tips, totalHeight, radius, error }
}
