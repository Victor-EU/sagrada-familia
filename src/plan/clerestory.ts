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
  /**
   * Openings placed by the caller rather than shared out across the bay.
   *
   * A window divides the wall it is in: its lights are that wall's own
   * business, so `lights` and the margins are all it needs. A **door** is not
   * like that. A door has to line up with the gap between two piers of the
   * façade standing in front of it, and the façade is set out on the module
   * and knows nothing about which panel of wall is behind which gap. So a
   * register may instead be handed the openings it is to have, in the wall's
   * own coordinates, and the stone is whatever is left between them.
   */
  openings?: { centre: number; width: number }[]
  /**
   * Whether there is glass in it. A door is a window with no glass, and the
   * frame — jambs, lintel, threshold — is the same frame either way.
   */
  glazed?: boolean
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
    const openings = lay(p, register)
    if (openings.length === 0) continue

    // The stone is the gaps between the openings, which is the same statement
    // whether the register subdivides its own bay or was handed its openings
    // by the façade outside. End posts and mullions stop being two kinds of
    // thing: both are simply what is left.
    let edge = -p.span / 2
    for (const opening of openings) {
      const left = opening.centre - opening.width / 2
      if (left > edge + 1e-4) {
        stonePieces.push(slab(left - edge, tall, p.thickness, (edge + left) / 2, register.sill))
      }
      edge = opening.centre + opening.width / 2
    }
    if (p.span / 2 > edge + 1e-4) {
      const right = p.span / 2
      stonePieces.push(slab(right - edge, tall, p.thickness, (edge + right) / 2, register.sill))
    }

    if (register.glazed === false) continue

    for (const [k, opening] of openings.entries()) {
      const panel = buildGlassPanel({
        width: opening.width,
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
      panel.translate(opening.centre, register.sill, 0)
      glassPieces.push(panel)
    }
  }

  return {
    stone: mergeGeometries(stonePieces, false),
    // A wall that is all doors has no glass in it, and merging nothing throws.
    glass: glassPieces.length > 0 ? mergeGeometries(glassPieces, false) : new THREE.BufferGeometry(),
  }
}

/** Where this register's openings fall, in the wall's own coordinates. */
function lay(
  p: ClerestoryParams,
  register: RegisterParams,
): { centre: number; width: number }[] {
  if (register.openings) {
    return register.openings
      .filter((o) => o.width > 0 && Math.abs(o.centre) + o.width / 2 <= p.span / 2 + 1e-4)
      .sort((a, b) => a.centre - b.centre)
  }

  const lights = Math.max(1, Math.round(register.lights))
  const usable = p.span - 2 * p.margin - (lights - 1) * p.mullion
  const width = usable / lights
  if (width <= 0) return []

  return Array.from({ length: lights }, (_, k) => ({
    centre: -p.span / 2 + p.margin + k * (width + p.mullion) + width / 2,
    width,
  }))
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
