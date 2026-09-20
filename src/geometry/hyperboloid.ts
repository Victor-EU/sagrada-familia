import * as THREE from 'three'

/**
 * Hyperboloid of one sheet — the vault funnels, skylights and window screens.
 *
 *   x²/a² + y²/b² − z²/c² = 1
 *
 * The surface is doubly curved yet swept by a straight line, which is why Gaudí
 * could cast it against straight timber formwork. `buildRulings` returns those
 * straight generators, so the "every curve here is made of straight lines" view
 * costs us nothing extra.
 *
 * z = 0 is the throat (the narrowest ring). Truncation is expressed relative to
 * it, so a funnel is asymmetric about its own waist.
 *
 * Dimensions here are placeholders: the real funnel sizes are still an open
 * question in the design doc, and belong in a parameter file once photo-matched.
 */
export interface HyperboloidParams {
  /** a — throat radius on the x axis, metres. */
  throatRadius: number
  /** b / a. 1 is a surface of revolution; anything else makes it elliptical. */
  ellipticity: number
  /** c — flare. Larger values open out more slowly. */
  flare: number
  /** Truncation below the throat, metres (negative). */
  zBottom: number
  /** Truncation above the throat, metres. */
  zTop: number
  radialSegments: number
  heightSegments: number
  /**
   * Ribs around the surface. 0 leaves it smooth.
   *
   * The funnels are not smooth. Every photograph looking up into one shows a
   * pleated surface — narrow flats meeting along sharp radial creases that
   * run from the throat out to the rim, so the star around a boss is made of
   * light and shade rather than drawn on. Smooth, the funnel has one tone
   * across its whole width and reads as a plastic horn.
   */
  pleats?: number
  /** How deep the pleats cut, as a fraction of the local radius. */
  pleatDepth?: number
}

export const defaultHyperboloid: HyperboloidParams = {
  throatRadius: 0.9,
  ellipticity: 1,
  flare: 1.6,
  zBottom: -2.4,
  zTop: 2.4,
  radialSegments: 128,
  heightSegments: 96,
  pleats: 0,
  pleatDepth: 0,
}

/** Radius multiplier at height z — 1 at the throat, growing hyperbolically. */
export function radiusFactor(z: number, flare: number): number {
  const k = z / flare
  return Math.sqrt(1 + k * k)
}

/**
 * The pleat profile and its slope, as a multiplier on the radius.
 *
 * A triangle wave, not a cosine: a cosine gives a corrugation with no edges
 * anywhere, and the whole point is the crease. This is flat between creases
 * and turns a corner at each one, so dg/dθ steps between two constants and
 * the shading breaks where the stone does.
 */
function pleat(theta: number, pleats: number, depth: number): { g: number; slope: number } {
  if (pleats <= 0 || depth <= 0) return { g: 1, slope: 0 }
  const turns = (theta * pleats) / (Math.PI * 2)
  let frac = turns % 1
  if (frac < 0) frac += 1
  // +1 at a ridge, −1 in a valley, straight between.
  const wave = 4 * Math.abs(frac - 0.5) - 1
  const rising = frac > 0.5 ? 1 : -1
  return {
    g: 1 + depth * wave,
    slope: depth * rising * 4 * (pleats / (Math.PI * 2)),
  }
}

/**
 * Triangulated surface. Normals are exact — the cross of the two parametric
 * derivatives, which for a smooth surface agrees with the implicit gradient
 * and for a pleated one keeps the creases the gradient would have lost.
 */
export function buildHyperboloidSurface(p: HyperboloidParams): THREE.BufferGeometry {
  const a = p.throatRadius
  const b = p.throatRadius * p.ellipticity
  const radial = Math.max(3, Math.floor(p.radialSegments))
  const rows = Math.max(1, Math.floor(p.heightSegments))

  const cols = radial + 1 // duplicate seam column so UVs wrap cleanly
  const vertexCount = cols * (rows + 1)

  const positions = new Float32Array(vertexCount * 3)
  const normals = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const indices = new Uint32Array(radial * rows * 6)

  const span = p.zTop - p.zBottom
  const c2 = p.flare * p.flare
  const pleats = p.pleats ?? 0
  const pleatDepth = p.pleatDepth ?? 0

  let v = 0
  let t = 0
  for (let row = 0; row <= rows; row++) {
    const vFrac = row / rows
    const z = p.zBottom + span * vFrac
    const rf = radiusFactor(z, p.flare)
    // d(rf)/dz for rf = √(1 + (z/c)²).
    const rfZ = z / (c2 * rf)

    for (let col = 0; col < cols; col++) {
      const uFrac = col / radial
      const theta = uFrac * Math.PI * 2
      const { g, slope } = pleat(theta, pleats, pleatDepth)
      const ct = Math.cos(theta)
      const st = Math.sin(theta)
      const A = a * rf
      const B = b * rf

      positions[v * 3] = A * g * ct
      positions[v * 3 + 1] = B * g * st
      positions[v * 3 + 2] = z

      // N = ∂P/∂θ × ∂P/∂z for P = (A·g·cos θ, B·g·sin θ, z). With g ≡ 1 this
      // is the implicit gradient again, up to a positive factor.
      const aZ = a * rfZ
      const bZ = b * rfZ
      let nx = B * (slope * st + g * ct)
      let ny = -A * (slope * ct - g * st)
      let nz =
        A * (slope * ct - g * st) * bZ * g * st - B * (slope * st + g * ct) * aZ * g * ct
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len

      normals[v * 3] = nx
      normals[v * 3 + 1] = ny
      normals[v * 3 + 2] = nz

      uvs[v * 2] = uFrac
      uvs[v * 2 + 1] = vFrac
      v++
    }
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < radial; col++) {
      const i0 = row * cols + col
      const i1 = i0 + 1
      const i2 = i0 + cols
      const i3 = i2 + 1
      indices[t++] = i0
      indices[t++] = i2
      indices[t++] = i1
      indices[t++] = i1
      indices[t++] = i2
      indices[t++] = i3
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeBoundingSphere()
  return geometry
}

export type RulingFamily = 'left' | 'right' | 'both'

/**
 * The straight generators.
 *
 *   P±(θ, t) = ( a(cos θ ∓ t sin θ), b(sin θ ± t cos θ), c·t )
 *
 * Each θ gives one straight line lying entirely in the surface. Two families
 * exist, mirror images of each other; drawing both gives the woven look of the
 * formwork Gaudí's builders actually used.
 */
export function buildHyperboloidRulings(
  p: HyperboloidParams,
  count: number,
  family: RulingFamily,
): THREE.BufferGeometry {
  const a = p.throatRadius
  const b = p.throatRadius * p.ellipticity
  const n = Math.max(3, Math.floor(count))
  const signs = family === 'both' ? [1, -1] : family === 'left' ? [1] : [-1]

  const t0 = p.zBottom / p.flare
  const t1 = p.zTop / p.flare
  const positions = new Float32Array(n * signs.length * 2 * 3)

  let i = 0
  for (const s of signs) {
    for (let k = 0; k < n; k++) {
      const theta = (k / n) * Math.PI * 2
      const ct = Math.cos(theta)
      const st = Math.sin(theta)
      for (const t of [t0, t1]) {
        positions[i++] = a * (ct - s * t * st)
        positions[i++] = b * (st + s * t * ct)
        positions[i++] = p.flare * t
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.computeBoundingSphere()
  return geometry
}
