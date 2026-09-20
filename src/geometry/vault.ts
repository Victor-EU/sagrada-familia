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
  /**
   * How far the funnel reaches from the centre of its own cell.
   *
   * Decided by the plan rather than here, because it is a question about the
   * neighbours. A funnel that covers its own corners has to reach its
   * half-diagonal — but a cell 7.5 m from the next opening cannot reach 8.8 m
   * without passing under that opening and sealing it, which is exactly what
   * happened: the nave went from 1.7% open to 0.01%. See `cellFor`.
   */
  funnelReach: number
  /** Throat of the swelling over a column — a girth, not a footprint. */
  bossRadius: number
  /** How far that swelling flares, covering whatever the funnel could not. */
  bossReach: number
  /** Height at which the two families meet, as a fraction of crown − spring. */
  meetFraction: number
  /**
   * Whether the funnel's throat is left open.
   *
   * Open, it is a skylight for free — an unclosed surface is a hole. That is
   * right for the central nave, whose vault is lit from above, and wrong for
   * the aisles: thirty openings in a roof read as a colander rather than as a
   * building. A closed cell gets a shallow dome over the throat instead.
   */
  skylight: boolean
}

export const defaultVaultCell: VaultCellParams = {
  cell: { x: 15, z: 15 },
  crownHeight: 45,
  springHeight: 41.7,
  skylightRadius: 1.1,
  funnelReach: 5.5,
  bossRadius: 1.4,
  bossReach: 2.8,
  meetFraction: 0.35,
  skylight: true,
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
  /** Dome closing the throat, when the cell has no skylight. */
  cap: VaultSurface | null
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
/**
 * Ribs around a vault surface.
 *
 * Twelve, which is the largest column order and the count the vault already
 * answers to everywhere else — a cell springs from twelve-sided trunks, so
 * twelve creases arrive over the branches rather than beating against them.
 * It is also what the coarsest level of detail can afford: surfaceRadial
 * bottoms out near 24 segments on a funnel, which is exactly two samples per
 * pleat, so the creases survive all the way out.
 */
const VAULT_PLEATS = 16

/**
 * How deep, as a fraction of the local radius.
 *
 * Shallow. These are creases in a shell, not corrugations — in the
 * photographs the ridges catch a highlight and the valleys hold a thin
 * shadow, and the funnel still reads as one smooth flare from across the
 * nave. Deeper than this and a funnel starts to look like a cast gear.
 */
const VAULT_PLEAT_DEPTH = 0.16

export function flareFor(throat: number, reach: number, depth: number): number {
  const ratio = Math.max(reach / Math.max(throat, 1e-4), 1.0001)
  return depth / Math.sqrt(ratio * ratio - 1)
}

export function buildVaultCell(p: VaultCellParams, detail = 1): VaultCell {
  const rise = Math.max(0.5, p.crownHeight - p.springHeight)
  const meetHeight = p.springHeight + rise * p.meetFraction
  // Skylight funnel: throat at the crown, flaring downward to the meeting level.
  const funnelDepth = p.crownHeight - meetHeight
  const funnel = vaultSurface(
    p.skylightRadius,
    flareFor(p.skylightRadius, p.funnelReach, funnelDepth),
    -funnelDepth,
    0,
    p.funnelReach,
    detail,
  )

  // Boss: throat at the springing, flaring up under the funnel's skirt.
  //
  // It is no longer sized to the cell. With the funnel covering its own
  // corners this surface has one job — to be the swelling where the branches
  // arrive, and to hide the join — so it is sized to the column it stands on
  // and stops well before it reaches anything else's airspace.
  const bossRise = meetHeight - p.springHeight
  const bossReach = Math.max(p.bossReach, p.bossRadius * 1.2)
  const boss = vaultSurface(
    p.bossRadius,
    flareFor(p.bossRadius, bossReach, bossRise),
    0,
    bossRise,
    bossReach,
    detail,
  )

  return {
    funnel,
    boss,
    cap: p.skylight ? null : crownDome(p.skylightRadius, detail),
    crownHeight: p.crownHeight,
    springHeight: p.springHeight,
    skylight: new THREE.Vector3(0, p.crownHeight, 0),
  }
}

/**
 * One hyperboloid, tessellated for the detail asked of it.
 *
 * Exported because the apse is the same two families of surfaces on a radial
 * plan rather than a rectangular one, and it has no business re-deriving how
 * finely to sample them.
 *
 * Counts come from the surface's own size — see `detail.ts` — rather than
 * from a parameter, so the same call serves the near view and the one
 * eighty metres down the nave.
 */
export function vaultSurface(
  throatRadius: number,
  flare: number,
  zBottom: number,
  zTop: number,
  reach: number,
  detail: number,
): VaultSurface {
  const profile = Math.hypot(zTop - zBottom, reach - throatRadius)
  // A multiple of 2·pleats, for the same reason shaftRadial is a multiple of
  // 2·order: it lands a sample on every ridge *and* every valley, so the
  // coarsest funnel in the building still has all twelve creases in the right
  // places rather than a drifting beat against them.
  const period = VAULT_PLEATS * 2
  const radialSegments = period * Math.max(1, Math.round(surfaceRadial(reach, detail) / period))
  const params: HyperboloidParams = {
    throatRadius,
    ellipticity: 1,
    flare,
    zBottom,
    zTop,
    radialSegments,
    heightSegments: surfaceRows(profile, detail),
    pleats: VAULT_PLEATS,
    pleatDepth: VAULT_PLEAT_DEPTH,
  }
  return {
    geometry: buildHyperboloidSurface(params),
    error: reach * (1 - Math.cos(Math.PI / radialSegments)),
  }
}

/**
 * The dome that closes an unlit cell.
 *
 * Shallow rather than flat, and for the same reason the knots are ellipsoids
 * rather than spheres: a disc at the top of a funnel reads as a lid set into
 * it, and a dome reads as the funnel closing.
 *
 * Built in the funnel's own frame — z along the axis — so it takes the same
 * placement as the surface it caps.
 */
function crownDome(radius: number, detail: number): VaultSurface {
  const segments = Math.max(8, surfaceRadial(radius, detail))
  const geometry = new THREE.SphereGeometry(
    radius * 1.02,
    segments,
    Math.max(3, Math.round(segments / 6)),
    0,
    Math.PI * 2,
    0,
    Math.PI / 2,
  )
  // Sphere stands on y; the funnel's axis is z, and the dome bulges up it.
  geometry.scale(1, 0.38, 1)
  geometry.rotateX(Math.PI / 2)
  return {
    geometry,
    error: radius * (1 - Math.cos(Math.PI / segments)),
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
