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
}

export const defaultHyperboloid: HyperboloidParams = {
  throatRadius: 0.9,
  ellipticity: 1,
  flare: 1.6,
  zBottom: -2.4,
  zTop: 2.4,
  radialSegments: 128,
  heightSegments: 96,
}

/** Radius multiplier at height z — 1 at the throat, growing hyperbolically. */
export function radiusFactor(z: number, flare: number): number {
  const k = z / flare
  return Math.sqrt(1 + k * k)
}

/**
 * Triangulated surface. Normals come from the implicit gradient rather than
 * from averaging face normals — exact, and it matters on a white model where
 * shading *is* the form.
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
  const invA2 = 1 / (a * a)
  const invB2 = 1 / (b * b)
  const invC2 = 1 / (p.flare * p.flare)

  let v = 0
  let t = 0
  for (let row = 0; row <= rows; row++) {
    const vFrac = row / rows
    const z = p.zBottom + span * vFrac
    const rf = radiusFactor(z, p.flare)

    for (let col = 0; col < cols; col++) {
      const uFrac = col / radial
      const theta = uFrac * Math.PI * 2
      const x = a * rf * Math.cos(theta)
      const y = b * rf * Math.sin(theta)

      positions[v * 3] = x
      positions[v * 3 + 1] = y
      positions[v * 3 + 2] = z

      // ∇F = (2x/a², 2y/b², −2z/c²), normalised.
      let nx = x * invA2
      let ny = y * invB2
      let nz = -z * invC2
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
