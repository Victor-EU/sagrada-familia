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
 *    carry — holding a gabled canopy well clear of the wall, and on the
 *    gable a crown of eighteen more bones carrying the charge on a cornice
 *    of hexagonal prisms, with the cross over all of it. It is skeletal and
 *    it is meant to be: the whole front is stripped of ornament on purpose.
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
  /**
   * How much wider the section is across the front than it is deep. The
   * legs photograph as broad prisms face-on and as blades from the side.
   */
  flat?: number
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
  const rows = 20
  const positions: number[] = []

  const at = (t: number): { centre: THREE.Vector3; radius: number } => {
    // The axis: up, back toward the wall, and out to the side.
    const centre = new THREE.Vector3(
      t * p.splay,
      t * p.height,
      p.reach * (1 - t * p.lean),
    )
    // Girth, as a bone has it: a flare at the foot that is over in the first
    // fifth, a long slender shaft, and a head that opens fast in the last
    // quarter into what it carries. It used to be foot to neck over the first
    // half and neck to knuckle over the second, which with the three girths
    // within half a metre of each other was a straight prism — and from the
    // steps under the Passion front six straight prisms are six planks. The
    // photographs of that porch are all neck and knuckle.
    const radius =
      t < 0.2
        ? THREE.MathUtils.lerp(p.foot, p.neck, smooth(t / 0.2))
        : t < 0.7
          ? p.neck
          : THREE.MathUtils.lerp(p.neck, p.knuckle, Math.pow((t - 0.7) / 0.3, 2))
    return { centre, radius }
  }

  const flat = p.flat ?? 1
  const ringAt = (t: number): THREE.Vector3[] => {
    const { centre, radius } = at(t)
    return Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides
      return new THREE.Vector3(
        centre.x + Math.cos(a) * radius * flat,
        centre.y,
        centre.z + (Math.sin(a) * radius) / flat,
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
  /** Height of the canopy's front edge at the middle of the span: the gable's apex. */
  eaves: number
  /** Height of the front edge at the two ends of the span. */
  hip: number
  /** Height of the canopy where it meets the wall. */
  ridge: number
  /** How far the front edge stands out from the wall. */
  reach: number
  /** Legs across the front. Six, on the real one. */
  legs: number
  /** Thickness of the canopy. */
  slab: number
  /** Bones in the crown standing on the gable, and how tall they stand. */
  bones: number
  crown: number
  /** The cross over the apex. */
  cross: number
}

/**
 * The Passion front: a tent, not a shelf.
 *
 * This was built as a flat slab on six thin stilts and it read from the
 * pavement as scaffolding — a shelf bolted to a cliff, with nothing under it
 * that the light could be dark in. `reference/ex-passion-front.jpg` is
 * unambiguous about what it actually is:
 *
 *  - The legs **splay**. Their feet stand wider apart and further out than
 *    their heads, so the six of them lean inward as they rise and the whole
 *    thing reads as a tent pitched against the façade. They are heavy at the
 *    foot, waisted at mid height and flared where they meet the roof, which
 *    is the bone everybody describes.
 *  - The canopy is a **roof**, not a deck: it rises from a low leading edge
 *    to a ridge against the wall, and its leading edge is an arc that dips at
 *    the ends rather than a straight line. That slope is what gives the
 *    front a lit surface above a dark one.
 *  - Under it is the thing that matters, which is **a cave**. Twelve metres
 *    of overhang with a ten-metre drop from ridge to eaves puts everything
 *    behind it out of the sky's way. The old version projected far enough to
 *    cast a shadow and then held nothing in it, because the roof was a metre
 *    and a bit thick and the wall stood a couple of metres back.
 *  - The leading edge is a **gable**, not a shelf. It was built as an arc
 *    eighteen metres up with a comb of four-metre blades along it, which is
 *    what the porch was before 2016 and not quite even then. What stands
 *    there now is the pediment: eighteen bones of nine metres raking up off
 *    the gable to a cornice of hexagonal prisms that carries the charge a
 *    letter to a prism, and a cross of seven and a half metres over the
 *    apex — both figures published. Measured off the author's own
 *    `ex-passion-front-up-dec2025` at the lens it was taken with: the tower
 *    axes put the camera sixty-two degrees up, the cross then stands
 *    twenty-five metres out and runs from about 45 to 53 m, and the gable's
 *    apex is about twelve metres under it. From the same camera the old
 *    porch was not in the frame at all.
 */
export function buildPassionPortico(p: PorticoParams): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const legs = Math.max(2, Math.round(p.legs))
  const half = p.width / 2

  /** The leading edge, as a gable: straight rakes from the hips to the apex. */
  const eavesAt = (u: number): number => THREE.MathUtils.lerp(p.eaves, p.hip, Math.min(1, Math.abs(u)))

  for (let i = 0; i < legs; i++) {
    const u = legs === 1 ? 0 : (i / (legs - 1)) * 2 - 1
    // Head just inside the leading edge; foot wider and further out, so the
    // leg leans inward as it climbs. The outer pair lean in by about twenty
    // degrees, which is what `ex-passion-front` shows from the pavement — at
    // eleven, where this stood, the six read as a colonnade and not as a
    // tent's poles.
    const headX = u * half * 0.86
    const headZ = p.reach * 0.88
    const footX = u * half * 1.28
    const footZ = p.reach * 1.04
    const height = eavesAt(u * 0.86) - p.slab * 0.4
    // Under a gable the middle pair stand half as tall again as the outer
    // pair, and a bone that long at the girth of a short one is a stick.
    const girth = Math.sqrt(height / 18)
    const leg = buildLeg({
      height,
      reach: footZ,
      // Heavy at the foot and flared at the knuckle, slender between: a
      // pier at each end and a bone in the middle. The head opens to twice
      // the neck and more, so it meets the soffit as a spread and not as a
      // post under a shelf.
      foot: 2.1 * girth,
      neck: 0.95 * girth,
      knuckle: 2.3 * girth,
      lean: 1 - headZ / footZ,
      splay: headX - footX,
      flat: 1.3,
    })
    leg.translate(footX, 0, 0)
    pieces.push(leg)
  }

  pieces.push(canopy(p, eavesAt))
  pieces.push(crown(p, eavesAt))
  return mergeOrEmpty(pieces)
}

/**
 * The pediment: eighteen bones on the gable, the cornice they carry, the
 * charge cut into it and the cross on top.
 *
 * The bones fan — each leans out from the middle a little more than the one
 * inside it, and back toward the wall by a metre and a half — so the row
 * reads as ribs rather than as a fence. The cornice is a prism to a letter,
 * each standing at the height of the gable under it plus the bones, which
 * steps the top edge the way the photographs show it rather than drawing it
 * as a line. The apex prism carries no letter; the cross stands on it.
 */
function crown(p: PorticoParams, eavesAt: (u: number) => number): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const half = p.width / 2
  const front = p.reach * 0.97
  const bones = Math.max(2, Math.round(p.bones))
  for (let i = 0; i < bones; i++) {
    const u = ((i + 0.5) / bones) * 2 - 1
    const bone = buildLeg({
      height: p.crown,
      reach: front,
      foot: 0.62,
      neck: 0.34,
      knuckle: 0.8,
      lean: 1.5 / front,
      splay: u * 1.4,
      flat: 1.15,
    })
    bone.translate(u * half * 0.94, eavesAt(u) - p.slab * 0.2, 0)
    pieces.push(bone)
  }

  // IESUS NAZARENUS up the left rake, REX IUDAEORUM down the right, the apex
  // between them — padded so the two rakes carry the same number of prisms.
  const left = 'IESUS NAZARENUS '
  const right = ' REX IUDAEORUM'.padEnd(left.length, ' ')
  const cells = [...left, '', ...right]
  const radius = (p.width / cells.length) * 0.62
  const depth = 1.9
  const back = front - 1.5
  const cap = radius * 1.05
  for (const [k, ch] of cells.entries()) {
    const u = (k / (cells.length - 1)) * 2 - 1
    const x = u * half * 0.96
    const y = eavesAt(u) + p.crown + radius * 0.55
    const prism = new THREE.CylinderGeometry(radius, radius, depth, 6)
    prism.rotateX(Math.PI / 2)
    prism.translate(x, y, back)
    pieces.push(prism)
    if (ch.trim()) {
      const w = textWidth(ch, 0) * cap
      const letter = buildInscription({ text: ch, size: cap, tracking: 0, weight: 0.16, relief: 0.2 })
      letter.translate(x - w / 2, y - cap / 2, back + depth / 2)
      pieces.push(letter)
    }
  }

  // The cross, square in section, its arms a little over half its height.
  const foot = eavesAt(0) + p.crown + radius * 1.4
  const post = new THREE.BoxGeometry(0.9, p.cross, 0.9)
  post.translate(0, foot + p.cross / 2, back)
  const arm = new THREE.BoxGeometry(p.cross * 0.52, 0.9, 0.9)
  arm.translate(0, foot + p.cross * 0.68, back)
  pieces.push(post, arm)
  return mergeOrEmpty(pieces)
}

/**
 * The roof: a ruled surface from the leading edge back to the ridge, given a
 * thickness and closed round its rim.
 *
 * Ruled rather than a box because the leading edge is an arc and the ridge is
 * straight, and a box cannot be both. The soffit is the half of it that does
 * the work — it is what every frame taken from the steps is looking at.
 */
function canopy(p: PorticoParams, eavesAt: (u: number) => number): THREE.BufferGeometry {
  const cols = 24
  const rows = 6
  const half = p.width / 2
  const positions: number[] = []
  const at = (i: number, j: number, under: boolean): THREE.Vector3 => {
    const u = (i / cols) * 2 - 1
    const v = j / rows
    // Narrowing a little as it runs back, and rising from eaves to ridge on
    // a slight curve so the slope is steepest where it leaves the wall.
    const y =
      THREE.MathUtils.lerp(eavesAt(u), p.ridge, Math.pow(v, 0.85)) - (under ? p.slab : 0)
    return new THREE.Vector3(u * half * (1 - 0.06 * v), y, p.reach * (1 - v))
  }
  const quad = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3): void => {
    for (const q of [a, b, c, a, c, d]) positions.push(q.x, q.y, q.z)
  }
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      quad(at(i, j, false), at(i, j + 1, false), at(i + 1, j + 1, false), at(i + 1, j, false))
      quad(at(i, j, true), at(i + 1, j, true), at(i + 1, j + 1, true), at(i, j + 1, true))
    }
    // The leading edge's own face, which is what catches the low sun.
    quad(at(i, 0, true), at(i + 1, 0, true), at(i + 1, 0, false), at(i, 0, false))
  }
  // And the two ends, so the slab is closed where it is cut off.
  for (const [i, flip] of [[0, true], [cols, false]] as const) {
    for (let j = 0; j < rows; j++) {
      const a = at(i, j, false)
      const b = at(i, j + 1, false)
      const c = at(i, j + 1, true)
      const d = at(i, j, true)
      if (flip) quad(a, b, c, d)
      else quad(d, c, b, a)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
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
