import * as THREE from 'three'
import { buildInscription, textWidth } from './letters.ts'
import { mergeOrEmpty } from './window.ts'

/**
 * The two porches, which are the two halves of the story.
 *
 * Gaudí built the Nativity front and left drawings for the Passion, and
 * Subirachs built the Passion to them; they are deliberately opposites and
 * the model had the same generic pier-and-portal slab standing in for both.
 * That is the single least faithful thing about the exterior, because these
 * are the two faces anybody has ever stood in front of.
 *
 *  - The **Passion** portico is six splayed legs shaped like bone — wide at
 *    the pavement, necked in the middle, knuckled where they meet what they
 *    carry — holding a flat canopy well clear of the wall, with a shallow
 *    raking gable of stone blades standing on it. It is skeletal and it is
 *    meant to be: the whole front is stripped of ornament on purpose.
 *  - The **Nativity** porch is the reverse: three deep portals, each under a
 *    steep gabled hood on brackets, and every surface between them crusted
 *    with growth. The sculpture is out of scope and would be a lie to fake,
 *    but the *encrustation* is not — from across the plaza what that front
 *    reads as is a stone cliff that has been rained on for a century, and a
 *    field of bosses says that far better than a flat plane does.
 *
 * Everything here is built in the porch's own frame: x across the front, y up
 * from the pavement, z out from the wall face. The caller turns it.
 */

export interface LegParams {
  /** Height at which the leg meets the canopy. */
  height: number
  /** How far out from the wall the foot stands. */
  reach: number
  /** Girth at the foot, at the neck, and at the knuckle. */
  foot: number
  neck: number
  knuckle: number
  /** How far the head is pulled back toward the wall, as a share of reach. */
  lean: number
  /** Sideways splay of the head, metres. Positive is outboard. */
  splay: number
}

/**
 * One leg of the Passion portico.
 *
 * A tapered polygonal shaft swept along a leaning axis, with the radius given
 * by a three-point profile rather than a taper — the shape is the point. A
 * plain cone reads as scaffolding; the neck and the knuckle are what make it
 * read as bone, which is the one thing everybody says about this front.
 */
export function buildLeg(p: LegParams, sides = 7): THREE.BufferGeometry {
  const rows = 14
  const positions: number[] = []

  const at = (t: number): { centre: THREE.Vector3; radius: number } => {
    // The axis: up, back toward the wall, and out to the side.
    const centre = new THREE.Vector3(
      t * p.splay,
      t * p.height,
      p.reach * (1 - t * p.lean),
    )
    // Girth: foot to neck over the first half, neck to knuckle over the
    // second, eased so the neck is a waist and not a corner.
    const radius =
      t < 0.55
        ? THREE.MathUtils.lerp(p.foot, p.neck, smooth(t / 0.55))
        : THREE.MathUtils.lerp(p.neck, p.knuckle, smooth((t - 0.55) / 0.45))
    return { centre, radius }
  }

  const ringAt = (t: number): THREE.Vector3[] => {
    const { centre, radius } = at(t)
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides
      return new THREE.Vector3(
        centre.x + Math.cos(a) * radius,
        centre.y,
        centre.z + Math.sin(a) * radius,
      )
    })
  }

  let lower = ringAt(0)
  for (let r = 1; r <= rows; r++) {
    const upper = ringAt(r / rows)
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides
      const a = lower[i]!
      const b = lower[j]!
      const c = upper[j]!
      const d = upper[i]!
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z)
    }
    lower = upper
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

export interface PorticoParams {
  /** Width of the front the portico stands across. */
  width: number
  /** Height of the underside of the canopy. */
  height: number
  /** How far the portico stands out from the wall. */
  reach: number
  /** Legs across the front. Six, on the real one. */
  legs: number
  /** Thickness of the canopy slab. */
  slab: number
  /** Blades standing on the canopy, and how tall they are. */
  blades: number
  bladeRise: number
}

/**
 * The Passion front: legs, canopy, and the raking gable of blades on it.
 */
export function buildPassionPortico(p: PorticoParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const legs = Math.max(2, Math.round(p.legs))
  const pitch = p.width / (legs + 0.6)

  for (let i = 0; i < legs; i++) {
    const x = (i - (legs - 1) / 2) * pitch
    // The outer legs splay hardest; the inner pair stand nearly upright,
    // which is what holds the middle of the canopy up.
    const away = (i - (legs - 1) / 2) / Math.max(1, (legs - 1) / 2)
    const leg = buildLeg({
      height: p.height,
      reach: p.reach,
      foot: 1.15,
      neck: 0.62,
      knuckle: 0.95,
      lean: 0.55,
      splay: away * 1.5,
    })
    leg.translate(x, 0, 0)
    pieces.push(leg)
  }

  // The canopy. Deeper than the legs reach, so it overhangs them, and canted
  // a little so its outer edge is the high one — the front reads as leaning
  // out over the steps, which is what the photographs show.
  const deck = new THREE.BoxGeometry(p.width, p.slab, p.reach * 1.35)
  deck.translate(0, p.height + p.slab / 2, p.reach * 0.5)
  deck.rotateX(-0.045)
  pieces.push(deck)

  // The charge, cut across the fascia of the canopy.
  //
  // The real front carries the titulus over the door in Latin capitals, and
  // this is the one band of writing on the Passion side that a person
  // standing on the steps reads without looking up. Sized to the fascia
  // rather than typed: the canopy is as wide as the front it stands across
  // and the front is a parameter.
  const titulus = 'IESUS NAZARENUS REX IUDAEORUM'
  const cap = (p.width * 0.84) / Math.max(1, textWidth(titulus, 0.2))
  // Lighter in the stroke than the tower bands: twenty-nine letters across
  // one fascia is a much smaller cap height, and a heavy cut at that size
  // closes every counter in the line.
  const charge = buildInscription({
    text: titulus,
    size: cap,
    tracking: 0.2,
    weight: 0.12,
    relief: 0.22,
  })
  charge.translate(
    (-textWidth(titulus, 0.2) * cap) / 2,
    p.height + p.slab * 0.28,
    p.reach * 1.17,
  )
  pieces.push(charge)

  // The blades: a row of slabs leaning back, their tops describing a shallow
  // gable, with a course of blocks along the rake carrying the inscription.
  const blades = Math.max(2, Math.round(p.blades))
  const top = p.height + p.slab
  for (let i = 0; i < blades; i++) {
    const t = (i + 0.5) / blades
    const x = (t - 0.5) * p.width * 0.97
    // Shallow gable: tallest in the middle.
    const rise = p.bladeRise * (0.55 + 0.45 * Math.cos((t - 0.5) * Math.PI))
    const blade = new THREE.BoxGeometry(p.width / blades * 0.42, rise, 0.5)
    blade.translate(0, rise / 2, 0)
    blade.rotateX(-0.5)
    blade.translate(x, top, p.reach * 0.92)
    pieces.push(blade)

    // The lintel block each blade carries, which is where the letters are.
    const block = new THREE.BoxGeometry(p.width / blades * 0.62, 0.7, 0.85)
    block.translate(x, top + rise * 0.92, p.reach * 0.92 - rise * 0.42)
    pieces.push(block)
  }

  return mergeOrEmpty(pieces)
}

export interface HoodParams {
  /** Width of the opening it shelters. */
  span: number
  /** How far the hood stands out from the wall. */
  reach: number
  /** Height of the eaves above the opening's head. */
  rise: number
  /** Height at which it is hung. */
  sill: number
}

/**
 * One gabled hood, for a Nativity portal.
 *
 * A steep tent on two brackets. The real ones are a forest of carved stone
 * and this is the shape under it: what the front does at a distance is throw
 * three deep triangular shadows, and nothing about the sculpture changes
 * that.
 */
export function buildHood(p: HoodParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const half = p.span / 2

  const positions: number[] = []
  const tri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
  ): void => {
    positions.push(...a, ...b, ...c)
  }

  const apex: [number, number, number] = [0, p.sill + p.rise, p.reach * 0.35]
  const left: [number, number, number] = [-half, p.sill, p.reach]
  const right: [number, number, number] = [half, p.sill, p.reach]
  const backL: [number, number, number] = [-half * 0.7, p.sill, 0]
  const backR: [number, number, number] = [half * 0.7, p.sill, 0]
  const backTop: [number, number, number] = [0, p.sill + p.rise * 1.25, 0]

  tri(left, right, apex)
  tri(backR, backL, backTop)
  tri(left, apex, backTop)
  tri(left, backTop, backL)
  tri(right, backR, backTop)
  tri(right, backTop, apex)
  tri(left, backL, backR)
  tri(left, backR, right)

  const tent = new THREE.BufferGeometry()
  tent.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  tent.computeVertexNormals()
  pieces.push(tent)

  // Two brackets under the eaves, so the hood is carried rather than glued.
  for (const side of [-1, 1]) {
    const bracket = new THREE.ConeGeometry(0.55, p.reach * 1.5, 5, 1)
    bracket.rotateZ(Math.PI / 2)
    bracket.rotateY(Math.PI / 2)
    bracket.translate(side * half * 0.82, p.sill - 0.4, p.reach * 0.45)
    pieces.push(bracket)
  }
  return mergeOrEmpty(pieces)
}

export interface CrustParams {
  /**
   * The vertical strips of stone the crust may grow on.
   *
   * Not the whole front. A façade here is piers standing proud with bays
   * recessed behind them, and a boss scattered at the pier plane over a bay
   * is a boss floating in mid-air a metre in front of the wall — which is
   * exactly how the first pass of this read, as bubbles rather than growth.
   * Each band is a centre and a width in the front's own coordinates, and the
   * crust stays inside them.
   */
  bands: { centre: number; width: number }[]
  /** Vertical band the crust covers. */
  from: number
  to: number
  /** How far it stands off the wall. */
  depth: number
  /** Roughly how many bosses. */
  count: number
  seed: number
}

/**
 * The encrustation on the Nativity front.
 *
 * Not sculpture — the *texture* of sculpture. From the width of the plaza
 * that front is not read as figures; it is read as a surface that has broken
 * out in growth, dense at the portals and thinning as it climbs, and the
 * difference between that and a flat wall is most of what makes it the
 * Nativity front rather than a wall with three holes in it.
 *
 * Bosses on a jittered lattice, sized and spaced by height, is a cheap and
 * honest way to say so — and it is the same claim the grain shader makes
 * about the stone, one scale up.
 */
export function buildCrust(p: CrustParams): THREE.BufferGeometry {
  const random = mulberry(p.seed)
  const pieces: THREE.BufferGeometry[] = []
  const count = Math.max(8, Math.round(p.count))

  if (p.bands.length === 0) return mergeOrEmpty(pieces)
  for (let i = 0; i < count; i++) {
    const t = random()
    // Denser low down: the growth starts at the portals and thins upward.
    const y = THREE.MathUtils.lerp(p.from, p.to, Math.pow(t, 0.62))
    const band = p.bands[Math.min(p.bands.length - 1, Math.floor(random() * p.bands.length))]!
    const x = band.centre + (random() - 0.5) * band.width * 0.9
    const scale = THREE.MathUtils.lerp(0.34, 0.13, Math.pow(t, 0.8)) * (0.7 + random() * 0.7)
    const boss = new THREE.SphereGeometry(scale, 6, 4)
    boss.scale(1, 1.3 + random() * 0.6, 0.62)
    boss.translate(x, y, p.depth + scale * 0.3)
    pieces.push(boss)
  }
  return mergeOrEmpty(pieces)
}

function smooth(x: number): number {
  const t = THREE.MathUtils.clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The cypress: the Tree of Life, over the central portal of the Nativity
 * front.
 *
 * Not a decoration on that façade — it is the top of it, a green shaft
 * standing between the two middle bell towers with twenty-one white doves on
 * it and a cross above. In every photograph taken from Plaça de Gaudí it is
 * the one piece of *colour* in a hundred metres of blackened stone, and its
 * absence is why the middle of that front read as a gap.
 *
 * It is made of exactly what the model can honestly claim: green ceramic and
 * white ceramic. A tapered shaft of foliage cut into tiers — the real one is
 * a stack of cypress-green scallops — with the doves as small white knots
 * scattered over it. Colour rides on the vertices, so one geometry carries
 * both.
 */
export function buildCypress(height: number, radius: number, seed = 31): THREE.BufferGeometry {
  const random = mulberry(seed)
  const positions: number[] = []
  const colours: number[] = []
  const rows = 22
  const cols = 14

  const green = new THREE.Color(0x4f6f46).convertSRGBToLinear()
  const deep = new THREE.Color(0x35502f).convertSRGBToLinear()
  const shade = new THREE.Color()

  const at = (row: number, col: number): THREE.Vector3 => {
    const t = row / rows
    // A cypress: widest a third of the way up, closing to a point.
    const profile = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.92) * (1 - t * 0.12)
    // Tiers, so the silhouette is scalloped rather than a smooth cone. The
    // real one is a stack of foliage and reads as a saw against the sky.
    const tier = 1 + 0.16 * Math.cos(t * rows * 0.9)
    const a = (col / cols) * Math.PI * 2
    const r = radius * profile * tier
    return new THREE.Vector3(Math.cos(a) * r, t * height, Math.sin(a) * r)
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const quad = [at(row, col), at(row, col + 1), at(row + 1, col + 1), at(row + 1, col)]
      // Darker low down and inside the scallops, which is where the light
      // does not get in.
      shade.copy(deep).lerp(green, 0.35 + 0.65 * (row / rows) + (random() - 0.5) * 0.3)
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const p = quad[i]!
        positions.push(p.x, p.y, p.z)
        colours.push(shade.r, shade.g, shade.b)
      }
    }
  }

  // The doves. Twenty-one is the published count and they are the whole
  // reason the tree reads white-flecked from the plaza.
  const white = new THREE.Color(0xf2efe6).convertSRGBToLinear()
  for (let i = 0; i < 21; i++) {
    const t = 0.12 + random() * 0.84
    const a = random() * Math.PI * 2
    const profile = Math.sin(Math.pow(t, 0.72) * Math.PI * 0.92) * (1 - t * 0.12)
    const r = radius * profile * 1.04
    const centre = new THREE.Vector3(Math.cos(a) * r, t * height, Math.sin(a) * r)
    const size = radius * 0.11
    const dove = new THREE.SphereGeometry(size, 5, 3)
    dove.scale(1.5, 0.8, 0.9)
    dove.translate(centre.x, centre.y, centre.z)
    const flat = dove.toNonIndexed()
    dove.dispose()
    const p = flat.getAttribute('position')
    for (let v = 0; v < p.count; v++) {
      positions.push(p.getX(v), p.getY(v), p.getZ(v))
      colours.push(white.r, white.g, white.b)
    }
    flat.dispose()
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

/**
 * The bridge between the two middle towers of a front.
 *
 * Both finished fronts have one — the Passion's carries the Ascension and
 * the Nativity's carries the cypress — and from the pavement it is the thing
 * that turns four separate spires into one façade. Without it the towers
 * read as four objects that happen to stand in a row, which is how this
 * model has read from every street-level frame.
 *
 * A shallow arch, because the photographs show a curve and not a lintel: the
 * soffit rises to the middle and the deck over it is flat.
 */
export function buildFrontBridge(span: number, width: number, rise: number): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const steps = 14
  const thick = rise * 0.34

  const positions: number[] = []
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
  }
  // The arch band: an extruded strip following the soffit.
  const soffit = (t: number): number => Math.sin(t * Math.PI) * rise
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps
    const t1 = (i + 1) / steps
    const x0 = (t0 - 0.5) * span
    const x1 = (t1 - 0.5) * span
    const y0 = soffit(t0)
    const y1 = soffit(t1)
    for (const z of [-width / 2, width / 2]) {
      const a = new THREE.Vector3(x0, y0, z)
      const b = new THREE.Vector3(x1, y1, z)
      const c = new THREE.Vector3(x1, y1 + thick, z)
      const d = new THREE.Vector3(x0, y0 + thick, z)
      tri(a, b, c)
      tri(a, c, d)
    }
    // Soffit and back, so the band is a solid seen from below.
    const la = new THREE.Vector3(x0, y0, -width / 2)
    const lb = new THREE.Vector3(x1, y1, -width / 2)
    const ra = new THREE.Vector3(x0, y0, width / 2)
    const rb = new THREE.Vector3(x1, y1, width / 2)
    tri(la, lb, rb)
    tri(la, rb, ra)
    const ta = new THREE.Vector3(x0, y0 + thick, -width / 2)
    const tb = new THREE.Vector3(x1, y1 + thick, -width / 2)
    const tc = new THREE.Vector3(x1, y1 + thick, width / 2)
    const td = new THREE.Vector3(x0, y0 + thick, width / 2)
    tri(ta, tb, tc)
    tri(ta, tc, td)
  }
  const band = new THREE.BufferGeometry()
  band.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  band.computeVertexNormals()
  pieces.push(band)

  // The deck standing on it.
  const deck = new THREE.BoxGeometry(span * 0.92, thick * 0.8, width * 1.15)
  deck.translate(0, rise + thick * 1.3, 0)
  pieces.push(deck)

  return mergeOrEmpty(pieces)
}

/**
 * The fringe under an archivolt.
 *
 * What a deep Gothic portal does at a distance is hang a row of small dark
 * shapes over the way in, and on this front they are stalactites of carved
 * stone. Cones on the arc of the ring, each one throwing its own shadow onto
 * the one behind, is the honest reading of that at the scale anybody sees it:
 * not sculpture, but the *shadow* sculpture casts.
 */
export function buildArchFringe(clear: number, rise: number, count: number, drop: number): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const half = clear / 2
  for (let i = 0; i <= count; i++) {
    const t = i / count
    // The same ogival soffit the archivolts use, so the fringe hangs on it.
    const x = half * Math.pow(1 - Math.abs(t * 2 - 1), 0.55) * (t < 0.5 ? -1 : 1)
    const y = rise * (1 - Math.abs(t * 2 - 1))
    const size = drop * (0.55 + 0.45 * Math.sin(t * Math.PI))
    const cone = new THREE.ConeGeometry(size * 0.34, size, 5, 1)
    cone.rotateX(Math.PI)
    cone.translate(x, y - size / 2, 0)
    pieces.push(cone)
  }
  return mergeOrEmpty(pieces)
}
