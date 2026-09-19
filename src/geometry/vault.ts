import * as THREE from 'three'
import { surfaceRadial, surfaceRows } from './detail.ts'
import { buildHyperboloidSurface, type HyperboloidParams } from './hyperboloid.ts'

/**
 * The vault over one bay.
 *
 * Two interleaved families of hyperboloids, and nothing else:
 *
 *  - a **skylight funnel** at the centre of the cell, its throat at the crown
 *    so the throat is literally the opening — an unclosed surface is a
 *    skylight for free;
 *  - a **boss** over each column, throat at the springing where the branches
 *    arrive, flaring upward.
 *
 * They meet halfway and overlap slightly. Opaque white plaster hides the join,
 * the same trick the ellipsoid knots use, so no boolean geometry is needed
 * anywhere in this project.
 *
 * Flare is derived rather than dialled: given a throat radius and the radius
 * the surface must reach at the meeting height, there is exactly one flare
 * that gets there, and neighbours then touch by construction.
 */
export interface VaultCellParams {
  /** The cell's footprint: column spacing across and along the nave. */
  cell: { x: number; z: number }
  /** Underside of the skylight throat. */
  crownHeight: number
  /** Where the vault takes the branches. */
  springHeight: number
  skylightRadius: number
  bossRadius: number
  /** Height at which the two families meet, as a fraction of crown − spring. */
  meetFraction: number
  /** Overlap multiplier on the meeting radius. 1 makes neighbours just touch. */
  spread: number
}

export const defaultVaultCell: VaultCellParams = {
  cell: { x: 15, z: 15 },
  crownHeight: 45,
  springHeight: 41.7,
  skylightRadius: 1.1,
  bossRadius: 2.2,
  meetFraction: 0.55,
  spread: 1.06,
}

export interface VaultSurface {
  geometry: THREE.BufferGeometry
  /**
   * How far this tessellation strays from the true surface, in metres. A
   * hyperboloid is smooth, so it is the plain sagitta of a chord across the
   * widest ring — nothing is lost but roundness.
   */
  error: number
}

export interface VaultCell {
  /** The skylight funnel, in its own frame: z along the axis, throat at z=0. */
  funnel: VaultSurface
  /** One boss; the cell uses four of them, one over each column. */
  boss: VaultSurface
  /** Where the funnel's throat sits, in world height. */
  crownHeight: number
  /** Where each boss's throat sits, in world height. */
  springHeight: number
  /** Centre of the skylight opening, for placing the light later. */
  skylight: THREE.Vector3
}

/**
 * Flare c such that a hyperboloid of throat radius r0 reaches radius R after
 * rising (or falling) `depth`:  R = r0·√(1 + (depth/c)²).
 */
function flareFor(throat: number, reach: number, depth: number): number {
  const ratio = Math.max(reach / Math.max(throat, 1e-4), 1.0001)
  return depth / Math.sqrt(ratio * ratio - 1)
}

export function buildVaultCell(p: VaultCellParams, detail = 1): VaultCell {
  const rise = Math.max(0.5, p.crownHeight - p.springHeight)
  const meetHeight = p.springHeight + rise * p.meetFraction
  // The two families meet along the diagonal, where centre and corner are
  // furthest apart, so each covers half of the half-diagonal. Stated this way
  // it holds for the 7.5 × 15 m aisle cells as well as the square nave ones:
  // the long edge is covered by the bosses at its ends rather than by the
  // funnel, which is why an elliptical funnel is not needed.
  const halfDiagonal = Math.hypot(p.cell.x, p.cell.z) / 2
  const meetRadius = (halfDiagonal / 2) * p.spread

  // Skylight funnel: throat at the crown, flaring downward to the meeting level.
  const funnelDepth = p.crownHeight - meetHeight
  const funnel = surface(
    p.skylightRadius,
    flareFor(p.skylightRadius, meetRadius, funnelDepth),
    -funnelDepth,
    0,
    meetRadius,
    detail,
  )

  // Boss: throat at the springing, flaring up to meet the funnel.
  const bossRise = meetHeight - p.springHeight
  const boss = surface(
    p.bossRadius,
    flareFor(p.bossRadius, meetRadius, bossRise),
    0,
    bossRise,
    meetRadius,
    detail,
  )

  return {
    funnel,
    boss,
    crownHeight: p.crownHeight,
    springHeight: p.springHeight,
    skylight: new THREE.Vector3(0, p.crownHeight, 0),
  }
}

/**
 * One hyperboloid, tessellated for the detail asked of it.
 *
 * Counts come from the surface's own size — see `detail.ts` — rather than
 * from a parameter, so the same call serves the near view and the one
 * eighty metres down the nave.
 */
function surface(
  throatRadius: number,
  flare: number,
  zBottom: number,
  zTop: number,
  reach: number,
  detail: number,
): VaultSurface {
  const profile = Math.hypot(zTop - zBottom, reach - throatRadius)
  const radialSegments = surfaceRadial(reach, detail)
  const params: HyperboloidParams = {
    throatRadius,
    ellipticity: 1,
    flare,
    zBottom,
    zTop,
    radialSegments,
    heightSegments: surfaceRows(profile, detail),
  }
  return {
    geometry: buildHyperboloidSurface(params),
    error: reach * (1 - Math.cos(Math.PI / radialSegments)),
  }
}

/** Where a cell's four bosses stand, relative to its centre. */
export function bossOffsets(cell: { x: number; z: number }): [number, number][] {
  const hx = cell.x / 2
  const hz = cell.z / 2
  return [
    [-hx, -hz],
    [hx, -hz],
    [-hx, hz],
    [hx, hz],
  ]
}

/**
 * Hyperbolic paraboloid through four corners — the webbing family.
 *
 * Bilinear interpolation of four non-coplanar points *is* a hypar, and both
 * families of isolines are straight, which is why the real surfaces could be
 * cast against straight formwork.
 */
export function buildHypar(
  p00: THREE.Vector3,
  p10: THREE.Vector3,
  p01: THREE.Vector3,
  p11: THREE.Vector3,
  segU: number,
  segV: number,
): THREE.BufferGeometry {
  const nu = Math.max(1, Math.floor(segU))
  const nv = Math.max(1, Math.floor(segV))

  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const du = new THREE.Vector3()
  const dv = new THREE.Vector3()
  const n = new THREE.Vector3()
  const a = new THREE.Vector3()
  const b = new THREE.Vector3()

  for (let iv = 0; iv <= nv; iv++) {
    const v = iv / nv
    for (let iu = 0; iu <= nu; iu++) {
      const u = iu / nu

      positions.push(
        (1 - u) * (1 - v) * p00.x + u * (1 - v) * p10.x + (1 - u) * v * p01.x + u * v * p11.x,
        (1 - u) * (1 - v) * p00.y + u * (1 - v) * p10.y + (1 - u) * v * p01.y + u * v * p11.y,
        (1 - u) * (1 - v) * p00.z + u * (1 - v) * p10.z + (1 - u) * v * p01.z + u * v * p11.z,
      )

      // Exact partials of the bilinear patch.
      du.copy(a.copy(p10).sub(p00)).multiplyScalar(1 - v)
        .add(b.copy(p11).sub(p01).multiplyScalar(v))
      dv.copy(a.copy(p01).sub(p00)).multiplyScalar(1 - u)
        .add(b.copy(p11).sub(p10).multiplyScalar(u))
      n.crossVectors(du, dv).normalize()
      normals.push(n.x, n.y, n.z)
      uvs.push(u, v)
    }
  }

  const stride = nu + 1
  for (let iv = 0; iv < nv; iv++) {
    for (let iu = 0; iu < nu; iu++) {
      const i0 = iv * stride + iu
      const i1 = i0 + 1
      const i2 = i0 + stride
      const i3 = i2 + 1
      indices.push(i0, i2, i1, i1, i2, i3)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeBoundingSphere()
  return geometry
}
