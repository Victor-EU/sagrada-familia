import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildGlassPanel, type GlassSide } from '../geometry/glass.ts'

/**
 * A bay's side wall: stone frame, glass in the gaps.
 *
 * No holes are cut. A wall with windows in it is a frame around openings —
 * bands above and below, posts at the ends, mullions between the lights — and
 * building it that way keeps the project's no-boolean-geometry rule intact
 * while producing exactly the silhouette a cut wall would have.
 *
 * Two registers, because the nave has two: the aisle lights low down where the
 * glass is at its most saturated, and the clerestory up near the springing
 * where it has washed out almost to clear.
 */
export interface RegisterParams {
  /** Height of the sill above the floor. */
  sill: number
  /** Height of the head. */
  head: number
  /** Lights across the bay. */
  lights: number
  /** Panes across one light. */
  panesAcross: number
  /** Panes up one light. */
  panesUp: number
}

export interface ClerestoryParams {
  /** Wall length — one bay. */
  span: number
  /**
   * Where the wall starts.
   *
   * Zero for a wall standing on the floor. The nave's own clerestory starts
   * at the height of the aisle vaults it rises above, which is the whole
   * reason a basilica has one.
   */
  base: number
  /** Full height of the wall, normally the springing. */
  height: number
  /**
   * Height the colour grade is measured against — the crown of the nave.
   *
   * Not the wall's own height. Two windows at the same height in the building
   * must agree about what colour that height is, and an aisle wall and a
   * clerestory thirty metres above it do not share a top.
   */
  gradeHeight: number
  thickness: number
  side: GlassSide
  /** Stone left at each end of the wall. */
  margin: number
  /** Stone between two lights. */
  mullion: number
  registers: RegisterParams[]
  seed: number
  /** Where this bay stands along the nave: 0 at the Glory end, 1 at the crossing. */
  along: number
}

export function defaultClerestory(
  span: number,
  height: number,
  side: GlassSide,
): ClerestoryParams {
  return {
    span,
    base: 0,
    height,
    gradeHeight: height,
    thickness: 0.9,
    side,
    margin: 1.1,
    mullion: 0.55,
    seed: side === 'nativity' ? 11 : 29,
    along: 1,
    registers: [
      // Aisle lights: tall, deeply coloured, and the ones you stand next to.
      { sill: 3.2, head: 17, lights: 3, panesAcross: 4, panesUp: 12 },
      // Clerestory: shorter, higher, nearly clear — it is lighting the vault.
      { sill: 23, head: 33.5, lights: 3, panesAcross: 3, panesUp: 8 },
    ],
  }
}

export interface Clerestory {
  /** Plaster frame, one merged geometry. */
  stone: THREE.BufferGeometry
  /** Every pane in the wall, one merged geometry carrying vertex colours. */
  glass: THREE.BufferGeometry
}

/**
 * Builds in the local XY plane — x across the wall, y up, thickness on z — so
 * the caller decides which way it faces.
 */
export function buildClerestory(p: ClerestoryParams): Clerestory {
  const stonePieces: THREE.BufferGeometry[] = []
  const glassPieces: THREE.BufferGeometry[] = []

  const registers = [...p.registers].sort((a, b) => a.sill - b.sill)

  // Solid bands: below the first register, between consecutive ones, above the
  // last. Expressed as the gaps between openings so heights can never disagree.
  let y = p.base
  for (const register of registers) {
    if (register.sill > y) stonePieces.push(slab(p.span, register.sill - y, p.thickness, 0, y))
    y = register.head
  }
  if (p.height > y) stonePieces.push(slab(p.span, p.height - y, p.thickness, 0, y))

  for (const [index, register] of registers.entries()) {
    const tall = register.head - register.sill
    const lights = Math.max(1, Math.round(register.lights))
    const usable = p.span - 2 * p.margin - (lights - 1) * p.mullion
    const lightWidth = usable / lights
    if (lightWidth <= 0) continue

    // End posts.
    stonePieces.push(
      slab(p.margin, tall, p.thickness, -(p.span - p.margin) / 2, register.sill),
      slab(p.margin, tall, p.thickness, (p.span - p.margin) / 2, register.sill),
    )

    for (let k = 0; k < lights; k++) {
      const centre =
        -p.span / 2 + p.margin + k * (lightWidth + p.mullion) + lightWidth / 2

      if (k > 0) {
        stonePieces.push(
          slab(p.mullion, tall, p.thickness, centre - lightWidth / 2 - p.mullion / 2, register.sill),
        )
      }

      const panel = buildGlassPanel({
        width: lightWidth,
        height: tall,
        columns: register.panesAcross,
        rows: register.panesUp,
        jitter: 0.22,
        seed: p.seed * 131 + index * 17 + k,
        side: p.side,
        // Grade against the wall, so two registers on the same wall agree
        // about what colour a given height is.
        gradeBase: register.sill / p.gradeHeight,
        gradeTop: register.head / p.gradeHeight,
        along: p.along,
      })
      panel.translate(centre, register.sill, 0)
      glassPieces.push(panel)
    }
  }

  return {
    stone: mergeGeometries(stonePieces, false),
    glass: mergeGeometries(glassPieces, false),
  }
}

/** A box given by its width, height, depth and its bottom-centre position. */
function slab(
  width: number,
  height: number,
  depth: number,
  x: number,
  bottom: number,
): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(width, height, depth)
  geometry.translate(x, bottom + height / 2, 0)
  return geometry
}
