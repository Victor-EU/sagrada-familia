import * as THREE from 'three'
import { starProfile, type ColumnOrder } from './column.ts'

/**
 * The towers — eighteen of them, and the one part of this building most
 * people can draw from memory.
 *
 * The rule is published and it is a single curve. Gaudí's bell towers are
 * **paraboloids of revolution**: the silhouette is a parabola with its apex at
 * the top, which in a surface of revolution means the square of the radius
 * falls linearly with height,
 *
 *   r(y)² = r₀² · (1 − (1 − k²)·y/H)
 *
 * where k is what is left of the radius at the top. One expression, no
 * profile table, and it has the property the whole building is built on: it
 * carries its own weight in pure compression, which is why Gaudí used it and
 * why the towers can be as thin as they are. Carrying it *below* the foot
 * costs nothing and is what makes a tower spread onto the roof it grows out
 * of rather than ending in mid-air.
 *
 * The section is the same construction as the columns. A bell tower is a
 * twelve-pointed star in section low down, rounding off as it climbs — and
 * the twelve-pointed star is three squares superimposed at thirty degrees,
 * which is exactly `starProfile(12)` from `column.ts`. Nothing here needed
 * inventing; it needed sharing.
 *
 * The apertures are the third documented thing and the one that makes a
 * silhouette read as Sagrada Família rather than as a spire: the shaft is
 * pierced all the way up by rows of openings that drift round it as they
 * climb, so the bells sound and the tower is a lattice rather than a chimney.
 * There is **no boolean geometry** here any more than anywhere else in this
 * project — an opening is a cell the mesh declines to emit, and a short jamb
 * turned inward at its edges is what gives it a thickness of stone.
 *
 * Generated **y-up**, unlike every other generator here. Columns and vault
 * surfaces are built with z as their axis because their mathematics is
 * cleaner that way and the plan stands them upright. A tower has no
 * mathematics that cares: it is placed by the plan at an (x, z) and a height,
 * and generating it in the world's own frame makes that placement a
 * translation and nothing else.
 */

/**
 * How the shaft is pierced — and this is the part of these towers that
 * everybody can draw and the model was getting wrong.
 *
 * Counted off the reference crops, a bell tower carries somewhere between
 * twenty and forty rows of apertures, and three things about them decide
 * whether a silhouette reads as Sagrada Família or as a spire with holes in:
 *
 *  1. **The rows are level.** Not a helix. The first version drifted the
 *     pattern round by a whole bay from bottom to top, which is a spiral —
 *     and a spiral of big openings at that slenderness reads as a drill bit.
 *     What the photographs show is a ladder.
 *  2. **They live in the channels between the ribs.** The twelve-pointed
 *     star has twelve ridges and twelve valleys, the ribs run unbroken from
 *     the foot to the belfry, and every aperture is cut in a valley. That is
 *     what makes the tower read as *fluted and pierced* rather than as a
 *     perforated cone: the verticals survive.
 *  3. **Each one has a stone hood over it**, sloping out and down, standing
 *     the better part of a metre proud of the shaft. This is the whole of
 *     the effect. The hood catches sun on its top and throws a hard shadow
 *     into the slot beneath, so a row of them is a row of bright dashes over
 *     a row of black ones, repeated up the tower. Without it an aperture is
 *     a flat mark the colour of whatever stands behind it, which is what the
 *     model had, and at a hundred metres a hundred flat marks average out to
 *     a slightly mottled cone.
 *
 * The pitch is a length rather than a count, because the real one is: the
 * rows are a fixed distance apart and a taller tower simply has more of
 * them. Given a count instead, the 98.4 m towers and the 117 m towers came
 * out with identically spaced rows at different sizes, which is the one
 * thing that says a building was made in a modelling package.
 */
export interface TowerOpenings {
  /** Where the ladder of apertures begins and ends, as fractions of the shaft. */
  from: number
  to: number
  /** Metres from one row of apertures to the next. */
  pitch: number
  /** How much of a row's height is open. */
  tall: number
  /** How much of a channel's width is open — a channel being one star valley. */
  wide: number
  /**
   * How far the stone hood over an aperture stands proud of the shaft,
   * metres. Zero leaves a bare slot, which is what the central towers have.
   */
  lintel: number
  /**
   * Where the raised inscription band sits, as a fraction of the shaft.
   *
   * *Sanctus, Sanctus, Sanctus* runs round every bell tower in raised
   * letters on a raised ring, and in a frame from the plaza the letters are
   * illegible and the ring is not: it is the one horizontal on an object
   * that is otherwise all verticals, and it is what tells the eye where the
   * belfry starts. Zero for none.
   */
  sanctus: number
  /**
   * Tall lancets in the solid shaft below the ladder, per channel.
   *
   * Below the inscription the shaft is not pierced with slots — it is solid
   * stone with a few long narrow windows in it, and that solid base is a
   * third of what anybody sees of a bell tower from the street.
   */
  lancets: number
}

export interface TowerParams {
  /** Foot to the top of the shaft. Whatever crowns it stands above this. */
  height: number
  /** Radius of the section's inscribed circle at the foot. */
  footRadius: number
  /** What is left of that radius at the top, as a fraction. */
  taper: number
  /** Points in section. Twelve for a bell tower, which is documented. */
  points: ColumnOrder
  /** How much star there is at the foot and at the top; 0 is a circle. */
  starFoot: number
  starTop: number
  /** Turn of the section between foot and top, degrees. */
  twistDeg: number
  /** How far the paraboloid is carried below its foot, metres. */
  skirt: number
  openings: TowerOpenings | null
  /** Stone shown at an aperture's edge. */
  reveal: number
  /** Rise of the cone that closes the top. 0 leaves it open. */
  cap: number
  /**
   * Flat normals, one per cell, instead of the surface's own.
   *
   * For the six towers over the crossing, which are not laid stone at all.
   * They are prefabricated panels craned into place, and what that looks
   * like is a *faceted* shaft — long flat planes meeting at visible seams,
   * with the light stepping from one to the next instead of running round a
   * curve. Shaded off the true paraboloid they came back as smooth cones
   * with a highlight sliding down them, which is the most plastic thing in
   * any exterior frame: a hundred-metre object with no facets at all.
   */
  faceted: boolean
  detail: number
}

export interface TowerSurface {
  geometry: THREE.BufferGeometry
  /** How far this tessellation strays from the true surface, in metres. */
  error: number
}

/**
 * Segments around a tower of the given order.
 *
 * A multiple of the order, for the same reason the columns use one: the star
 * has its points at fixed angles and a count that misses them turns a star
 * into a mush of near-misses. Eight per point at full detail puts the chord
 * error on the widest tower in the building at six millimetres.
 */
export function towerRadial(points: number, detail: number): number {
  return points * Math.max(2, Math.round(8 * detail))
}

/**
 * Mesh rows up a tower, keyed to its apertures rather than to its height.
 *
 * Four to a row of apertures, which is the least that can say what a row of
 * apertures is: one course of stone below, two of opening, one above. It was
 * eight, from when a tower carried eleven rows; at the pitch the photographs
 * actually show there are two or three times as many rows, and eight mesh
 * rows apiece is twenty-eight thousand cells a tower to resolve nothing that
 * four does not.
 */
export function towerRows(bands: number, detail: number): number {
  return Math.max(1, bands) * Math.max(2, Math.round(4 * detail))
}

/** One ring of the section: where it is, how wide, how much star, how turned. */
interface Ring {
  y: number
  radius: number
  star: number
  turn: number
}

/** How tall the raised inscription ring is, metres. */
const SANCTUS_HEIGHT = 2.2
/** How far it stands proud of the shaft, as a fraction of the local radius. */
const SANCTUS_RELIEF = 0.035

/** Rings and aperture mask — shared by the shaft and by what lines it. */
function towerFabric(p: TowerParams): {
  rings: Ring[]
  cols: number
  mask: Mask | null
} {
  const o = p.openings
  const cols = towerRadial(p.points, p.detail)

  // Rows come out of the building rather than out of a typed-in count. The
  // apertures are a fixed distance apart on the real towers, so a taller one
  // has more of them and not bigger ones — and `bands` fell out of the file
  // as a parameter the moment that was said out loud.
  const ladder = o ? Math.max(0.05, o.to - o.from) : 1
  const bands = o
    ? Math.max(1, Math.round((p.height * ladder) / Math.max(0.5, o.pitch)))
    : 1
  const shaftRows = Math.max(4, Math.round(towerRows(bands, p.detail) / ladder))
  const skirtRows = p.skirt > 0 ? Math.max(1, Math.round((shaftRows * p.skirt) / p.height)) : 0

  const k = Math.max(0.05, p.taper)
  const band = o && o.sanctus > 0 ? o.sanctus * p.height : -1
  const rings: Ring[] = []
  for (let i = -skirtRows; i <= shaftRows; i++) {
    const t = i / shaftRows
    const y = t * p.height
    // r² linear in height: the paraboloid, and the only curve the towers need.
    let radius = p.footRadius * Math.sqrt(Math.max(0.04, 1 - (1 - k * k) * t))
    // The inscription ring. A step in the radius grid, so the normals the
    // surface reads off it come back with a crease at each edge of the band
    // without anything here having to say which way the crease faces.
    if (band > 0 && Math.abs(y - band) < SANCTUS_HEIGHT / 2) radius *= 1 + SANCTUS_RELIEF
    rings.push({
      y,
      radius,
      // The star fades out as the tower climbs, which is what the photographs
      // show: a star low down where the ribs are, a circle by the belfry.
      star: p.starFoot + (p.starTop - p.starFoot) * Math.pow(Math.min(Math.max(t, 0), 1), 0.7),
      turn: THREE.MathUtils.degToRad(p.twistDeg) * t,
    })
  }

  // The apertures live in cell indices rather than in angles, so their edges
  // land on grid lines at every level of detail instead of crawling by a
  // fraction of a cell each time the tessellation changes.
  const first = skirtRows
  const mask = o ? apertureMask(o, cols, p.points, first, first + shaftRows, bands) : null

  return { rings, cols, mask }
}

/** Where an inscription stands on a shaft, and what surface it stands on. */
export interface TowerBand {
  /** Height of the middle of the band above the shaft's foot. */
  y: number
  /** The shaft's own section there, so letters follow the star into its valleys. */
  radiusAt: (alpha: number) => number
  /** Mean radius, which is what turns a length of writing into an angle. */
  meanRadius: number
  /** Height of the raised ring the letters are cut on. */
  height: number
}

/**
 * The inscription ring, as a surface rather than as a step in the radius.
 *
 * The ring itself has been here since the belfry was rebuilt — a band two
 * metres tall standing three and a half centimetres proud, which from the
 * plaza is a bright line round the tower and nothing more. What the building
 * has on that line is *writing*, a metre and a half high, and the letters
 * have to sit on the ring rather than near it: a stroke that floats a
 * centimetre off a shaft catches its own shadow and reads as a sticker, and
 * one that sinks into a star valley disappears for a third of its length.
 *
 * So this hands out the same section the shaft is built from, and the setter
 * in `letters.ts` bends the finished word onto it.
 */
export function towerBand(p: TowerParams): TowerBand | null {
  const o = p.openings
  if (!o || o.sanctus <= 0) return null

  const y = o.sanctus * p.height
  const t = y / p.height
  const k = Math.max(0.05, p.taper)
  const radius =
    p.footRadius * Math.sqrt(Math.max(0.04, 1 - (1 - k * k) * t)) * (1 + SANCTUS_RELIEF)
  const star = p.starFoot + (p.starTop - p.starFoot) * Math.pow(Math.min(Math.max(t, 0), 1), 0.7)
  const turn = THREE.MathUtils.degToRad(p.twistDeg) * t
  const profile = starProfile(p.points)

  return {
    y,
    radiusAt: (alpha: number) => radius * (1 + star * (profile(alpha + turn) - 1)),
    meanRadius: radius,
    height: SANCTUS_HEIGHT,
  }
}

export function buildTowerShaft(p: TowerParams): TowerSurface {
  const { rings, cols, mask } = towerFabric(p)
  return buildRings(
    rings,
    p.points,
    cols,
    mask,
    p.reveal,
    p.cap,
    'stone',
    p.openings?.lintel ?? 0,
    p.faceted,
  )
}

/**
 * What is behind an opening.
 *
 * The apertures were the one part of these towers that was built right and
 * did not read. A cell the mesh declines to emit is a genuine hole, and the
 * shaft is a closed tube of `DoubleSide` plaster — so looking through an
 * opening you saw the *inside of the far wall*, in the same stone, lit by the
 * same sky. A hole came back as a slightly different shade of tower, and at
 * a hundred metres the whole belfry read as faintly mottled rather than as
 * pierced. Every photograph of these towers has the opposite: the openings
 * are the darkest thing in the frame by a long way, which is what makes the
 * shaft read as a lattice instead of a chimney.
 *
 * The honest fix is also the cheap one, and it is what the building does.
 * These openings are not empty: they are fitted with sloping stone louvres
 * that let the bells out and the rain not in. So a panel is set a reveal's
 * depth inside each aperture, in a stone dark enough to stand for a hundred
 * metres of unlit masonry tube behind it, and the jambs already emitted by
 * the shaft become the sides of a real recess rather than the lip of a hole.
 *
 * Same rings, same mask, same tessellation — it is generated from the same
 * call, so the two can never drift out of register at any level of detail.
 */
export function buildTowerLouvres(p: TowerParams): TowerSurface {
  const { rings, cols, mask } = towerFabric(p)
  return buildRings(rings, p.points, cols, mask, p.reveal, 0, 'louvre', 0, p.faceted)
}

type Mask = (row: number, col: number) => boolean

function apertureMask(
  o: TowerOpenings,
  cols: number,
  points: number,
  rowFirst: number,
  rowLast: number,
  bands: number,
): Mask {
  const span = rowLast - rowFirst
  const from = rowFirst + Math.round(span * o.from)
  const to = rowFirst + Math.round(span * o.to)
  const perBand = Math.max(1, Math.floor((to - from) / Math.max(1, bands)))
  const openRows = Math.min(perBand - 1, Math.max(1, Math.round(perBand * o.tall)))
  const pad = Math.max(0, Math.floor((perBand - openRows) / 2))

  /**
   * Cells to a channel, and where the channel's middle is.
   *
   * The twelve-pointed star has a ridge at every multiple of 2π/12 and a
   * valley exactly half way between — checked rather than assumed: sampled
   * at ninety-six angles the profile peaks at cells 0, 8, 16 … and bottoms
   * at 4, 12, 20 … So a channel's centre line is at (k + ½)·bay, and an
   * aperture is what is open within a given width of it.
   *
   * Measured from the valley rather than counted from a bay's first cell,
   * which is what the old version did: with an odd number of open cells the
   * opening sat half a cell off its own channel, and at low detail — where a
   * bay is four cells and an opening is one — it climbed onto the rib.
   */
  const bay = cols / points
  const half = (bay * Math.min(1, Math.max(0.02, o.wide))) / 2

  /** How far this cell's middle is from the nearest channel centre, in cells. */
  const offChannel = (col: number): number => {
    const t = (col + 0.5) / bay - 0.5
    return Math.abs(t - Math.round(t)) * bay
  }

  // The lancets: the long windows in the solid stone below the ladder. They
  // are much narrower than a belfry slot and much taller, which is the whole
  // difference between a window and a sound hole.
  const lancetTo = from - Math.max(1, Math.round(perBand * 0.5))
  const lancetFrom = rowFirst + Math.round(span * 0.12)
  const lancetPitch =
    o.lancets > 0 ? Math.max(2, Math.floor((lancetTo - lancetFrom) / o.lancets)) : 0
  const lancetOpen = Math.max(1, Math.round(lancetPitch * 0.62))
  const lancetHalf = half * 0.42

  return (row, col) => {
    if (row >= from && row < from + perBand * bands) {
      const up = (row - from) % perBand
      if (up < pad || up >= pad + openRows) return false
      return offChannel(col) <= half
    }
    if (lancetPitch > 0 && row >= lancetFrom && row < lancetFrom + lancetPitch * o.lancets) {
      const up = (row - lancetFrom) % lancetPitch
      if (up >= lancetOpen) return false
      return offChannel(col) <= lancetHalf
    }
    return false
  }
}

/**
 * Turn a stack of rings into a surface.
 *
 * Positions come off the ring's own radial function; normals come from finite
 * differences on the radius grid rather than from averaging faces, so the
 * ribs stay crisp and the apertures do not drag the shading around with them.
 * Where a cell is open it is simply not emitted, and every edge it shares
 * with a closed cell gets a jamb turned inward — which is the whole of the
 * "no boolean geometry" rule applied to a hole.
 */
function buildRings(
  rings: Ring[],
  points: ColumnOrder,
  cols: number,
  mask: Mask | null,
  reveal: number,
  cap: number,
  /**
   * 'stone' is the shaft: everything the mask leaves standing, plus a jamb
   * turned inward at every edge of an opening and a hood standing over it.
   * 'louvre' is the complement — only what closes the openings, a reveal's
   * depth in. Two passes over one fabric, so they are in register by
   * construction.
   */
  what: 'stone' | 'louvre' = 'stone',
  /** How far the hood over an aperture projects. 0 leaves a bare slot. */
  lintel = 0,
  /** One normal per cell rather than the surface's own — see TowerParams. */
  faceted = false,
): TowerSurface {
  const star = starProfile(points)
  const rows = rings.length - 1
  const dAlpha = (Math.PI * 2) / cols

  // Radius grid first — normals are read off it, and the aperture test and
  // the jambs both need to look at neighbours.
  const grid: Float64Array[] = []
  let widest = 0
  for (const ring of rings) {
    const row = new Float64Array(cols)
    for (let col = 0; col < cols; col++) {
      const alpha = col * dAlpha
      const s = ring.star
      row[col] = ring.radius * (1 + s * (star(alpha + ring.turn) - 1))
      if (row[col]! > widest) widest = row[col]!
    }
    grid.push(row)
  }

  const positions: number[] = []
  const normals: number[] = []

  const point = (row: number, col: number, inset = 0): THREE.Vector3 => {
    const alpha = (col % cols) * dAlpha
    const r = Math.max(0.01, grid[row]![col % cols]! - inset)
    return new THREE.Vector3(r * Math.cos(alpha), rings[row]!.y, r * Math.sin(alpha))
  }

  /** Outward normal from the parametrisation, by central differences. */
  const normal = (row: number, col: number): THREE.Vector3 => {
    const c = col % cols
    const alpha = c * dAlpha
    const rHere = grid[row]![c]!
    const rNext = grid[row]![(c + 1) % cols]!
    const rPrev = grid[row]![(c - 1 + cols) % cols]!
    const dR = (rNext - rPrev) / (2 * dAlpha)

    const above = Math.min(row + 1, rows)
    const below = Math.max(row - 1, 0)
    const dY = rings[above]!.y - rings[below]!.y
    const dRdY = dY > 1e-6 ? (grid[above]![c]! - grid[below]![c]!) / dY : 0

    const cos = Math.cos(alpha)
    const sin = Math.sin(alpha)
    // dP/dα and dP/dy of P = (r cos α, y, r sin α); their cross product,
    // ordered so it points away from the axis.
    const a = new THREE.Vector3(dR * cos - rHere * sin, 0, dR * sin + rHere * cos)
    const b = new THREE.Vector3(dRdY * cos, 1, dRdY * sin)
    return b.cross(a).normalize()
  }

  /** Straight out from the axis at this cell edge, horizontally. */
  const outward = (col: number): THREE.Vector3 => {
    const alpha = ((col % cols) + cols) % cols * dAlpha
    return new THREE.Vector3(Math.cos(alpha), 0, Math.sin(alpha))
  }

  const push = (p: THREE.Vector3, n: THREE.Vector3): void => {
    positions.push(p.x, p.y, p.z)
    normals.push(n.x, n.y, n.z)
  }

  /**
   * Emit a quad, wound to agree with the normals it was given.
   *
   * The plaster is `DoubleSide`, and three flips a fragment's normal when the
   * triangle under it faces away — so a quad whose winding disagrees with its
   * own normals is lit from exactly the wrong side, with nothing in the
   * geometry to say so. Deriving the order from the normal rather than
   * getting it right by hand makes that impossible instead of unlikely: the
   * first version of this file had the shaft inside out and it took a sun
   * ablation to see it, because an unlit white tower looks like a shadowed
   * one.
   */
  const quad = (
    corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
    ns: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3],
  ): void => {
    const facing = new THREE.Vector3()
      .subVectors(corners[1], corners[0])
      .cross(new THREE.Vector3().subVectors(corners[2], corners[0]))
    const order = facing.dot(ns[0]) >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]
    for (const i of order) push(corners[i]!, ns[i]!)
  }

  const open = (row: number, col: number): boolean =>
    mask !== null && row >= 0 && row < rows && mask(row, ((col % cols) + cols) % cols)

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (what === 'louvre') {
        // Only the backs, and only where there is an opening to back.
        if (!open(row, col)) continue
        const a = point(row, col, reveal)
        const b = point(row, col + 1, reveal)
        const c = point(row + 1, col + 1, reveal)
        const d = point(row + 1, col, reveal)
        const n = normal(row, col)
        quad([a, b, c, d], [n, n, n, n])
        continue
      }

      if (open(row, col)) {
        if (reveal <= 0) continue
        // Jambs: one for each edge this aperture shares with standing stone.
        for (const side of [-1, 1] as const) {
          if (open(row, col + side)) continue
          const edge = side < 0 ? col : col + 1
          const outerA = point(row, edge)
          const outerB = point(row + 1, edge)
          const innerA = point(row, edge, reveal)
          const innerB = point(row + 1, edge, reveal)
          // A jamb looks into the opening, which is away from the stone it
          // was cut from: the tangent at this edge, turned against the side
          // the standing stone is on.
          const alpha = ((edge % cols) + cols) % cols * dAlpha
          const face = new THREE.Vector3(Math.sin(alpha), 0, -Math.cos(alpha))
            .multiplyScalar(side)
          quad([outerA, outerB, innerB, innerA], [face, face, face, face])
        }
        for (const dir of [-1, 1]) {
          if (open(row + dir, col)) continue
          const edge = dir < 0 ? row : row + 1
          const outerA = point(edge, col)
          const outerB = point(edge, col + 1)
          const innerA = point(edge, col, reveal)
          const innerB = point(edge, col + 1, reveal)
          const face = new THREE.Vector3(0, -dir, 0)
          quad([outerA, outerB, innerB, innerA], [face, face, face, face])
        }

        /**
         * The hood, and it is the reason any of this reads.
         *
         * A slot cut flush in a shaft is a flat mark the colour of whatever
         * stands behind it, and a hundred of them up a tower average out to
         * a faint mottling — which is what the first version of these towers
         * came back as. The real ones are roofed: a stone slab over every
         * aperture, sloping out and down and standing the better part of a
         * metre proud, so the top of it takes the sun and the underside
         * throws a hard shadow across the opening beneath. Bright dash over
         * dark dash, twelve to a row and twenty rows up the shaft, is the
         * pattern people recognise.
         *
         * It is emitted here rather than with the louvres because it is
         * *stone* and the louvre is the dark behind the hole; putting it in
         * the other pass would have crowned every opening in the building
         * with a slab of unlit masonry tube.
         */
        if (lintel > 0 && !open(row + 1, col)) {
          const head = row + 1
          const a = point(head, col)
          const b = point(head, col + 1)
          const drop = lintel * 0.55
          const thick = lintel * 0.34
          const a2 = a.clone().addScaledVector(outward(col), lintel)
          const b2 = b.clone().addScaledVector(outward(col + 1), lintel)
          a2.y = a.y - drop
          b2.y = b.y - drop

          const top = new THREE.Vector3()
            .subVectors(b, a)
            .cross(new THREE.Vector3().subVectors(a2, a))
            .normalize()
          if (top.y < 0) top.negate()
          quad([a, b, b2, a2], [top, top, top, top])

          const a3 = a2.clone()
          const b3 = b2.clone()
          a3.y -= thick
          b3.y -= thick
          const out = outward(col).add(outward(col + 1)).normalize()
          quad([a2, b2, b3, a3], [out, out, out, out])
        }
        continue
      }

      const corners: [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
        point(row, col),
        point(row, col + 1),
        point(row + 1, col + 1),
        point(row + 1, col),
      ]
      if (faceted) {
        // One plane, one normal. Derived from the cell's own corners and then
        // turned to agree with the surface it approximates, so a facet can
        // never end up lit from inside the tower.
        const flat = new THREE.Vector3()
          .subVectors(corners[1], corners[0])
          .cross(new THREE.Vector3().subVectors(corners[3], corners[0]))
          .normalize()
        if (flat.dot(normal(row, col)) < 0) flat.negate()
        quad(corners, [flat, flat, flat, flat])
      } else {
        quad(corners, [
          normal(row, col),
          normal(row, col + 1),
          normal(row + 1, col + 1),
          normal(row + 1, col),
        ])
      }
    }
  }

  if (cap > 0) {
    const apex = new THREE.Vector3(0, rings[rows]!.y + cap, 0)
    for (let col = 0; col < cols; col++) {
      const a = point(rows, col)
      const b = point(rows, col + 1)
      const n = new THREE.Vector3()
        .subVectors(b, a)
        .cross(new THREE.Vector3().subVectors(apex, a))
        .normalize()
      if (n.y < 0) n.negate()
      quad([a, b, apex, apex], [n, n, n, n])
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.computeBoundingSphere()

  return { geometry, error: widest * (1 - Math.cos(Math.PI / cols)) }
}

/**
 * The pinnacle on a bell tower.
 *
 * The real ones are stacked geometric solids finished in Venetian glass
 * mosaic — the most coloured thing on the building, and in a white plaster
 * maquette they are white like everything else. What survives that is their
 * profile, which is a sequence of collars and swellings rather than a spire,
 * and at a hundred metres up the profile is all anybody sees of them anyway.
 *
 * Stated as fractions of the shaft's top radius and of the pinnacle's own
 * height, so one table serves every tower whatever size it is.
 */
const PINNACLE_PROFILE: [number, number][] = [
  [0, 1],
  [0.08, 0.74],
  [0.14, 1.3],
  [0.28, 1.42],
  [0.36, 1.12],
  [0.44, 0.7],
  [0.5, 1.04],
  [0.62, 0.92],
  [0.7, 0.42],
  [0.84, 0.5],
  [0.92, 0.22],
  [1, 0.04],
]

export interface PinnacleParams {
  height: number
  /** The radius it stands on — the top of the shaft. */
  radius: number
  points: ColumnOrder
  star: number
  detail: number
  /**
   * The mosaic, if this pinnacle is one of the twelve that carry it.
   *
   * `base` is the stone of the shaft it stands on, which is what the lowest
   * band still is, and `tesserae` are the glass colours banded above it. Given
   * this the surface comes back with a `color` attribute and must be cut from
   * a stone that reads one — see PAINTED in render/materials.ts.
   */
  mosaic?: { base: number; tesserae: readonly number[] } | undefined
}

/**
 * Band a pinnacle up its own height.
 *
 * The crowns of the bell towers are the one coloured thing on this building
 * and they are *striped*: a stone foot, then rings of Venetian glass — red,
 * gold, white, a little green — picked out by the swellings and necks of the
 * profile, with the finial white. One colour over the whole of it is a hat.
 *
 * Written straight onto the vertices from their own y, which is exact here
 * because a pinnacle is generated in its own frame standing on zero. Linear,
 * because three multiplies `diffuseColor` by this without converting.
 */
function bandMosaic(
  geometry: THREE.BufferGeometry,
  height: number,
  base: number,
  tesserae: readonly number[],
): void {
  // Stone for the lowest seventh — the pinnacle grows out of the shaft and
  // the join is not a colour change.
  const FOOT = 0.14
  // What the bands run through. Not a plain cycle of the palette: white is
  // the commonest tessera on these crowns and the sequence has to say so.
  const order = [0, 1, 2, 0, 1, 2, 0, 3, 2]
  const position = geometry.getAttribute('position')
  const colour = new Float32Array(position.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const t = THREE.MathUtils.clamp(position.getY(i) / Math.max(height, 1e-4), 0, 1)
    if (t < FOOT) {
      c.setHex(base)
    } else {
      const band = Math.min(order.length - 1, Math.floor(((t - FOOT) / (1 - FOOT)) * order.length))
      c.setHex(tesserae[order[band]! % tesserae.length] ?? 0xffffff)
    }
    c.convertSRGBToLinear()
    colour[i * 3] = c.r
    colour[i * 3 + 1] = c.g
    colour[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
}

export function buildPinnacle(p: PinnacleParams): TowerSurface {
  const cols = towerRadial(p.points, p.detail)
  const perSegment = Math.max(1, Math.round(3 * p.detail))

  const rings: Ring[] = []
  for (let i = 0; i + 1 < PINNACLE_PROFILE.length; i++) {
    const [y0, r0] = PINNACLE_PROFILE[i]!
    const [y1, r1] = PINNACLE_PROFILE[i + 1]!
    for (let s = 0; s < perSegment; s++) {
      const f = s / perSegment
      rings.push({
        y: (y0 + (y1 - y0) * f) * p.height,
        radius: (r0 + (r1 - r0) * f) * p.radius,
        // The star runs out through the pinnacle, so the finial is round.
        star: p.star * (1 - (y0 + (y1 - y0) * f)),
        turn: 0,
      })
    }
  }
  const [lastY, lastR] = PINNACLE_PROFILE[PINNACLE_PROFILE.length - 1]!
  rings.push({ y: lastY * p.height, radius: lastR * p.radius, star: 0, turn: 0 })

  const built = buildRings(rings, p.points, cols, null, 0, p.radius * 0.12, 'stone', 0, false)
  if (p.mosaic) bandMosaic(built.geometry, p.height, p.mosaic.base, p.mosaic.tesserae)
  return built
}

/**
 * The four-armed cross on the tower of Jesus Christ.
 *
 * Arms on both horizontal axes as well as the vertical, which is why the
 * published description calls it four-armed and why it reads as a cross from
 * every direction rather than only from two. Three boxes crossing at a point
 * is the whole of it; opaque plaster hides the joins, the same as everywhere
 * else in this model.
 */
export function buildCross(height: number, width: number): THREE.BufferGeometry[] {
  // Four-armed and three-dimensional: two horizontal limbs crossing at right
  // angles through one upright, which is why it reads as a cross from every
  // side of the city rather than edge-on from two of them.
  const limb = width * 0.155
  const upright = new THREE.BoxGeometry(limb, height, limb)
  upright.translate(0, height / 2, 0)
  // The arms cross where the upright is a little over half way up, which is
  // where the Basilica's own photographs of the assembly put them.
  const armY = height * 0.6
  const across = new THREE.BoxGeometry(width, limb, limb)
  across.translate(0, armY, 0)
  const through = new THREE.BoxGeometry(limb, limb, width)
  through.translate(0, armY, 0)
  return [upright, across, through]
}

/**
 * The twelve-pointed star on the tower of the Virgin Mary.
 *
 * Twelve spikes on the vertices of a regular arrangement about a small core —
 * six in a horizontal ring, three up and three down — which is the reading
 * that makes it a solid star rather than a flat one, and the one the
 * photographs of the installed piece support.
 */
export function buildStar(span: number, points = 12): THREE.BufferGeometry {
  const core = span * 0.18
  const reach = span / 2
  const positions: number[] = []

  const spikes: THREE.Vector3[] = []
  const ring = Math.max(4, points - Math.floor(points / 3) * 2)
  const upper = Math.floor((points - ring) / 2)
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2
    spikes.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
  }
  for (const tilt of [1, -1]) {
    for (let i = 0; i < upper; i++) {
      const a = ((i + 0.5) / upper) * Math.PI * 2
      spikes.push(
        new THREE.Vector3(Math.cos(a) * 0.55, tilt * 0.84, Math.sin(a) * 0.55).normalize(),
      )
    }
  }

  for (const dir of spikes) {
    const tip = dir.clone().multiplyScalar(reach)
    // A square collar about the axis of the spike, then four faces to the tip.
    const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
    const u = new THREE.Vector3().crossVectors(up, dir).normalize().multiplyScalar(core)
    const v = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(core)
    const base = dir.clone().multiplyScalar(core * 0.6)
    const collar = [
      base.clone().add(u),
      base.clone().add(v),
      base.clone().sub(u),
      base.clone().sub(v),
    ]
    for (let i = 0; i < 4; i++) {
      const a = collar[i]!
      const b = collar[(i + 1) % 4]!
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, tip.x, tip.y, tip.z)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}
