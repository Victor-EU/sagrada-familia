import * as THREE from 'three'
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
  /** Column spacing — the cell is square. */
  bay: number
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
  radialSegments: number
  heightSegments: number
}

export const defaultVaultCell: VaultCellParams = {
  bay: 15,
  crownHeight: 45,
  springHeight: 41.7,
  skylightRadius: 1.1,
  bossRadius: 2.2,
  meetFraction: 0.55,
  spread: 1.06,
  radialSegments: 128,
  heightSegments: 64,
}

export interface VaultCell {
  group: THREE.Group
  geometries: THREE.BufferGeometry[]
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

export function buildVaultCell(
  p: VaultCellParams,
  material: THREE.Material,
): VaultCell {
  const geometries: THREE.BufferGeometry[] = []
  const group = new THREE.Group()

  const rise = Math.max(0.5, p.crownHeight - p.springHeight)
  const meetHeight = p.springHeight + rise * p.meetFraction
  // Cell centre to corner is bay/√2, so each family covers half of that.
  const meetRadius = ((p.bay / Math.SQRT2) / 2) * p.spread

  const shared = {
    ellipticity: 1,
    radialSegments: p.radialSegments,
    heightSegments: p.heightSegments,
  }

  // Skylight funnel: throat at the crown, flaring downward to the meeting level.
  const funnelDepth = p.crownHeight - meetHeight
  const funnel: HyperboloidParams = {
    ...shared,
    throatRadius: p.skylightRadius,
    flare: flareFor(p.skylightRadius, meetRadius, funnelDepth),
    zBottom: -funnelDepth,
    zTop: 0,
  }
  const funnelGeometry = buildHyperboloidSurface(funnel)
  geometries.push(funnelGeometry)

  const funnelMesh = new THREE.Mesh(funnelGeometry, material)
  funnelMesh.rotation.x = -Math.PI / 2
  funnelMesh.position.y = p.crownHeight
  funnelMesh.castShadow = true
  funnelMesh.receiveShadow = true
  group.add(funnelMesh)

  // Boss: throat at the springing, flaring up to meet the funnel.
  const bossRise = meetHeight - p.springHeight
  const boss: HyperboloidParams = {
    ...shared,
    throatRadius: p.bossRadius,
    flare: flareFor(p.bossRadius, meetRadius, bossRise),
    zBottom: 0,
    zTop: bossRise,
  }
  const bossGeometry = buildHyperboloidSurface(boss)
  geometries.push(bossGeometry)

  const half = p.bay / 2
  for (const [x, z] of [
    [-half, -half],
    [half, -half],
    [-half, half],
    [half, half],
  ] as const) {
    const mesh = new THREE.Mesh(bossGeometry, material)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, p.springHeight, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  return { group, geometries, skylight: new THREE.Vector3(0, p.crownHeight, 0) }
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
