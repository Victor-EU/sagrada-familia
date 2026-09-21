import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32, paneColor, type GlassSide } from './glass.ts'

/**
 * A window, as opposed to a hole.
 *
 * Until now a window in this model was a rectangle: a gap left between two
 * slabs of wall, filled with a rectangle of coloured panes. That is a
 * defensible abstraction for a maquette and it is the reason the interior
 * did not read. Stand in the nave with a photograph and the thing that is
 * missing is not brightness and not colour — it is *shape*. Every opening in
 * this building has a round head. The wall between the openings is not a wall
 * with slots in it; it is a stone net, mostly hole, and the holes are of four
 * or five different sizes arranged in a figure that repeats up the elevation.
 * A rectangle has none of that, so a rectangle reads as a slot in a warehouse
 * wall however well it is coloured, and no amount of light fixes it.
 *
 * So the openings are composed here rather than divided out. Four figures,
 * which between them are every window in the nave:
 *
 *  - the **lancet**, a tall light with a semicircular head, about a metre
 *    wide and anywhere from four to nine tall, in rows of three or four;
 *  - the **oculus**, a plain circle, which fills the stone left over above a
 *    row of heads and is the reason that stone reads as a net rather than as
 *    a lintel;
 *  - the **daisy**, Gaudí's rose: a small disc at the middle with a ring of
 *    tapered petals round it, the spokes of stone between them left standing;
 *  - the **cusp**, the tall pointed light of the clerestory, which is a
 *    lancet whose head comes to a point instead of a curve.
 *
 * A figure produces two things: a closed ring, which becomes a hole in the
 * stone, and a set of panes that tile it, which become the glass. Both are in
 * the wall's own plane — x across, y up from the sill — so the wall decides
 * where they go and which way they face.
 *
 * The stone is then one extruded shape with those rings as holes. That is a
 * polygon triangulation and not a mesh boolean: the project's rule against
 * cutting geometry is a rule against CSG on triangle soup, which is fragile
 * and leaks; earcut on a closed planar ring is neither. Bevelling the holes
 * gives the splayed reveal that every photograph of this wall shows, and
 * which is most of what says the stone is a metre thick.
 */

export interface WindowFigure {
  /** The opening, counter-clockwise in the wall plane. */
  ring: THREE.Vector2[]
  /** Convex cells tiling it, each one pane of glass. */
  panes: THREE.Vector2[][]
}

/** How finely a curve is walked. A metre of arc in about eight steps. */
const ARC = 0.13

/**
 * A lancet: parallel sides to the springing, then a semicircular head.
 *
 * `rise` is the head's height as a multiple of the half-width — 1 is a true
 * semicircle, which is what the aisle lights are, and more than 1 stretches
 * it toward the pointed heads of the clerestory.
 */
export function lancet(
  width: number,
  height: number,
  options: { rise?: number; rows?: number; columns?: number; point?: number } = {},
): WindowFigure {
  const half = width / 2
  const rise = Math.min((options.rise ?? 1) * half, height * 0.75)
  const point = options.point ?? 0
  const spring = Math.max(0, height - rise)
  const columns = options.columns ?? Math.max(3, Math.round(width / 0.26))

  // Half-width at a height. Below the springing the sides are parallel; above
  // it the head closes as an ellipse, pulled toward a point by `point`.
  const halfAt = (y: number): number => {
    if (y <= spring) return half
    const t = THREE.MathUtils.clamp((y - spring) / rise, 0, 1)
    const round = Math.sqrt(Math.max(0, 1 - t * t))
    return half * THREE.MathUtils.lerp(round, 1 - t, point)
  }

  /**
   * Where the leading runs, up the light.
   *
   * Not evenly: the head is a tenth of the height and all of the shape, so
   * the shaft is divided by the eye's tolerance for a long pane and the head
   * by its angle. Divided evenly, the top row is a trapezoid that crosses the
   * springing, the round head is replaced by two straight chamfers, and every
   * window in the building comes out as a pencil — which is exactly what the
   * first build of this did.
   */
  const heads = Math.max(3, Math.ceil(rise / 0.22))
  const shaftRows = options.rows ?? Math.max(3, Math.round(spring / 0.55))
  const ys: number[] = []
  for (let j = 0; j <= shaftRows; j++) ys.push((spring * j) / shaftRows)
  for (let j = 1; j <= heads; j++) {
    // Sampled by angle, so the steps are short where the curve turns fastest.
    ys.push(spring + rise * Math.sin((Math.PI / 2) * (j / heads)))
  }

  // The ring is the same sampling read as an outline: up the right flank,
  // over the head, down the left. One apex vertex, shared.
  const ring: THREE.Vector2[] = [new THREE.Vector2(-half, 0), new THREE.Vector2(half, 0)]
  for (let j = 1; j < ys.length - 1; j++) ring.push(new THREE.Vector2(halfAt(ys[j]!), ys[j]!))
  ring.push(new THREE.Vector2(0, height))
  for (let j = ys.length - 2; j >= 1; j--) ring.push(new THREE.Vector2(-halfAt(ys[j]!), ys[j]!))

  /**
   * The leading, and why it is not a grid.
   *
   * Cut on a regular grid, a light is a run of identical rectangles, and a
   * wall of those reads as pixel art rather than as glass — which is
   * exactly what the interior frames were showing. Leaded glass is cut by
   * hand from sheets: the cames run roughly in rows and roughly up the
   * light, and every quarry is a slightly different quadrilateral.
   *
   * So the grid's interior nodes wander and its edge nodes do not. Sharing
   * one jittered node between the four panes that meet at it is what keeps
   * the leading a continuous net: jitter each pane's own corners instead
   * and the cames come apart into loose tiles with daylight between them.
   * Edges stay put because they are the opening's own outline, which the
   * stone was cut to.
   */
  const jitter = mulberry32(Math.round(width * 977 + height * 131) + columns)
  const nodes: THREE.Vector2[][] = []
  for (let j = 0; j < ys.length; j++) {
    const y = ys[j]!
    const w = halfAt(y)
    const row: THREE.Vector2[] = []
    const fixedRow = j === 0 || j === ys.length - 1
    for (let i = 0; i <= columns; i++) {
      const t = i / columns
      const edge = i === 0 || i === columns || fixedRow
      // A fifth of a cell across and a seventh of a course up. Past about a
      // quarter the quadrilaterals start to cross each other at the corners.
      const dx = edge ? 0 : (jitter() - 0.5) * 0.42
      const dy = edge ? 0 : (jitter() - 0.5) * 0.3
      const span = (ys[Math.min(ys.length - 1, j + 1)]! - ys[Math.max(0, j - 1)]!) / 2
      row.push(
        new THREE.Vector2(
          THREE.MathUtils.lerp(-w, w, t) + (dx * 2 * w) / columns,
          y + dy * span,
        ),
      )
    }
    nodes.push(row)
  }

  const panes: THREE.Vector2[][] = []
  for (let j = 0; j + 1 < ys.length; j++) {
    const w0 = halfAt(ys[j]!)
    const w1 = halfAt(ys[j + 1]!)
    if (w0 < 1e-4 && w1 < 1e-4) continue
    const low = nodes[j]!
    const high = nodes[j + 1]!
    for (let i = 0; i < columns; i++) {
      panes.push([low[i]!, low[i + 1]!, high[i + 1]!, high[i]!])
    }
  }
  // The apex row collapses to a fan of triangles rather than degenerate quads.
  const last = ys[ys.length - 1]!
  if (last < height - 1e-6) {
    const w = halfAt(last)
    for (let i = 0; i < columns; i++) {
      panes.push([
        new THREE.Vector2(THREE.MathUtils.lerp(-w, w, i / columns), last),
        new THREE.Vector2(THREE.MathUtils.lerp(-w, w, (i + 1) / columns), last),
        new THREE.Vector2(0, height),
      ])
    }
  }

  return { ring, panes }
}

/** A plain circular light. Leaded in rings and sectors, as a real one is. */
export function oculus(radius: number, rings = 2, sectors = 10): WindowFigure {
  const steps = Math.max(12, Math.ceil((2 * Math.PI * radius) / ARC))
  const ring: THREE.Vector2[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    ring.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius))
  }

  const panes: THREE.Vector2[][] = []
  for (let r = 0; r < rings; r++) {
    const r0 = (radius * r) / rings
    const r1 = (radius * (r + 1)) / rings
    // The middle is one disc, not a ring of slivers meeting at a point.
    const count = r === 0 ? Math.max(3, Math.round(sectors / 2)) : sectors
    for (let s = 0; s < count; s++) {
      const a0 = (s / count) * Math.PI * 2
      const a1 = ((s + 1) / count) * Math.PI * 2
      const cell: THREE.Vector2[] = []
      if (r0 < 1e-5) {
        cell.push(new THREE.Vector2(0, 0))
      } else {
        cell.push(new THREE.Vector2(Math.cos(a0) * r0, Math.sin(a0) * r0))
        cell.push(new THREE.Vector2(Math.cos(a1) * r0, Math.sin(a1) * r0))
      }
      cell.push(new THREE.Vector2(Math.cos(a1) * r1, Math.sin(a1) * r1))
      cell.push(new THREE.Vector2(Math.cos(a0) * r1, Math.sin(a0) * r1))
      panes.push(cell)
    }
  }
  return { ring, panes }
}

/**
 * The daisy.
 *
 * A disc at the middle and a ring of petals round it, each petal its own
 * opening so the stone spokes between them survive. The petal swells from its
 * inner end and closes to a blunt point at the rim, which is what makes the
 * figure read as a flower rather than as a cartwheel.
 */
export function daisy(
  radius: number,
  petals = 16,
  options: { gap?: number; eye?: number } = {},
): WindowFigure[] {
  const eye = (options.eye ?? 0.26) * radius
  const gap = options.gap ?? 0.34
  const figures: WindowFigure[] = [oculus(eye, 1, 8)]

  const inner = radius * 0.4
  const outer = radius * 0.98
  const span = ((Math.PI * 2) / petals) * (1 - gap)

  for (let k = 0; k < petals; k++) {
    const axis = (k / petals) * Math.PI * 2
    const steps = 9
    const ring: THREE.Vector2[] = []
    const at = (r: number, a: number): THREE.Vector2 =>
      new THREE.Vector2(Math.cos(axis + a) * r, Math.sin(axis + a) * r)
    // Out along one flank, back along the other; the half-angle is a lobe so
    // the petal is widest a third of the way out.
    const lobe = (t: number): number => (span / 2) * Math.sin(Math.PI * Math.pow(t, 0.62))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      ring.push(at(THREE.MathUtils.lerp(inner, outer, t), -lobe(t)))
    }
    for (let i = steps; i >= 0; i--) {
      const t = i / steps
      ring.push(at(THREE.MathUtils.lerp(inner, outer, t), lobe(t)))
    }

    const panes: THREE.Vector2[][] = []
    const cells = 3
    for (let i = 0; i < cells; i++) {
      const t0 = i / cells
      const t1 = (i + 1) / cells
      const r0 = THREE.MathUtils.lerp(inner, outer, t0)
      const r1 = THREE.MathUtils.lerp(inner, outer, t1)
      panes.push([
        at(r0, -lobe(t0)),
        at(r1, -lobe(t1)),
        at(r1, lobe(t1)),
        at(r0, lobe(t0)),
      ])
    }
    figures.push({ ring, panes })
  }
  return figures
}

/** A figure moved into place on the wall. */
export function placed(figure: WindowFigure, x: number, y: number): WindowFigure {
  const move = (p: THREE.Vector2): THREE.Vector2 => new THREE.Vector2(p.x + x, p.y + y)
  return { ring: figure.ring.map(move), panes: figure.panes.map((c) => c.map(move)) }
}

export interface WindowFieldParams {
  /** The wall this field fills. */
  width: number
  height: number
  /** Rows of lancets, bottom to top. */
  tiers: number
  /** Lancets in a row. */
  across: number
  /** Stone at the ends of a row, and between two lancets. */
  margin: number
  mullion: number
  /** Stone between one row's heads and the next row's sills. */
  transom: number
  /** Daisy diameter as a fraction of the wall's width. Zero for none. */
  rose: number
  /** Head shape: 0 is a semicircle, 1 a point. */
  point: number
  /** Oculi in the spandrels. */
  oculi: boolean
  seed: number
}

/**
 * One bay's worth of openings.
 *
 * The figure is read off the elevation photographs and is the same one from
 * the Glory end to the crossing: rows of lancets with their heads all at a
 * height, an oculus standing in the stone over every mullion, and a daisy in
 * the head of the bay. What changes up the building is the count and the
 * scale, which is what the parameters are for.
 */
export function windowField(p: WindowFieldParams): WindowFigure[] {
  const random = mulberry32(p.seed)
  const figures: WindowFigure[] = []

  const across = Math.max(1, Math.round(p.across))
  const tiers = Math.max(1, Math.round(p.tiers))
  const lightWidth = (p.width - 2 * p.margin - (across - 1) * p.mullion) / across
  if (lightWidth <= 0.12) return figures

  // The rose takes the head of the bay; the lancets share what is left.
  const roseR = (p.rose * p.width) / 2
  const roseRoom = roseR > 0.05 ? roseR * 2 + p.transom : 0
  const body = p.height - roseRoom
  if (body <= 0.5) return figures

  const tierHeight = (body - (tiers - 1) * p.transom) / tiers
  if (tierHeight <= 0.4) return figures

  for (let t = 0; t < tiers; t++) {
    const sill = t * (tierHeight + p.transom)
    for (let i = 0; i < across; i++) {
      const x = -p.width / 2 + p.margin + lightWidth / 2 + i * (lightWidth + p.mullion)
      figures.push(
        placed(
          lancet(lightWidth, tierHeight, {
            rise: 1,
            point: p.point,
            rows: Math.max(4, Math.round(tierHeight / 0.55)),
            columns: Math.max(3, Math.round(lightWidth / 0.26)),
          }),
          x,
          sill,
        ),
      )
    }

    // The stone over a row of round heads is a band pierced by circles: one
    // over each mullion, where the two heads fall away from each other and
    // leave the most stone, and a smaller one at each end.
    if (!p.oculi) continue
    const band = t === tiers - 1 ? Math.min(p.transom, roseRoom > 0 ? p.transom : 0) : p.transom
    if (band < 0.45) continue
    const y = sill + tierHeight + band / 2
    for (let i = 0; i <= across; i++) {
      const edge = i === 0 || i === across
      const x =
        -p.width / 2 +
        p.margin +
        i * (lightWidth + p.mullion) -
        p.mullion / 2 +
        (i === 0 ? -p.margin / 2 + p.mullion / 2 : 0) +
        (i === across ? p.margin / 2 - p.mullion / 2 : 0)
      // As wide as the band will take. These were sized off the mullion and
      // came out as buttons: at a quarter of a metre across, a splayed reveal
      // is deeper than the hole is wide and every one of them read as a blind
      // dish with a speck of glass at the bottom. In the photographs an
      // oculus is the width of a light.
      const r = Math.min(band * 0.46, (edge ? p.margin : p.mullion + lightWidth) * 0.46)
      if (r < 0.14) continue
      figures.push(placed(oculus(r * (0.82 + random() * 0.34), 3, 12), x, y))
    }
  }

  if (roseR > 0.05) {
    figures.push(...daisy(roseR, roseR > 1.3 ? 18 : 12).map((f) => placed(f, 0, p.height - roseR)))
  }

  return figures
}

/**
 * Widen a closed ring by `d`, along its own outward bisectors.
 *
 * Offsetting a polygon properly is a hard problem; offsetting these is not.
 * Every ring here is a lancet, a circle or a petal — smooth, near-convex, and
 * sampled finely enough that a vertex bisector is a good normal. The one real
 * hazard is a small ring swallowing itself, so the offset is capped against
 * the ring's own inradius rather than trusted.
 */
function dilate(ring: THREE.Vector2[], d: number): THREE.Vector2[] {
  const n = ring.length
  if (n < 3 || d <= 0) return ring.map((p) => p.clone())

  // Twice the area, and the perimeter: their ratio is the inradius of the
  // disc of the same shape, which is the most a ring can be grown by before
  // it starts turning inside out.
  let twiceArea = 0
  let perimeter = 0
  for (let i = 0; i < n; i++) {
    const a = ring[i]!
    const b = ring[(i + 1) % n]!
    twiceArea += a.x * b.y - b.x * a.y
    perimeter += a.distanceTo(b)
  }
  const inradius = Math.abs(twiceArea) / Math.max(perimeter, 1e-6)
  const grow = Math.min(d, inradius * 0.55)
  if (grow <= 1e-4) return ring.map((p) => p.clone())

  // Which way is out depends on which way the ring is wound.
  const sign = twiceArea > 0 ? 1 : -1
  const out: THREE.Vector2[] = []
  const e0 = new THREE.Vector2()
  const e1 = new THREE.Vector2()
  const bisector = new THREE.Vector2()
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n]!
    const here = ring[i]!
    const next = ring[(i + 1) % n]!
    // Edge normals, rotated out of the ring.
    e0.set(here.y - prev.y, prev.x - here.x).multiplyScalar(sign).normalize()
    e1.set(next.y - here.y, here.x - next.x).multiplyScalar(sign).normalize()
    bisector.addVectors(e0, e1)
    if (bisector.lengthSq() < 1e-10) bisector.copy(e1)
    bisector.normalize()
    // A corner has to travel further than a flat does to keep the offset
    // even, and the reciprocal blows up at a spike — so it is clamped.
    const miter = Math.min(2.5, 1 / Math.max(0.4, bisector.dot(e1)))
    out.push(new THREE.Vector2(here.x + bisector.x * grow * miter, here.y + bisector.y * grow * miter))
  }
  return out
}

/** A flat cap with holes in it, facing +z or −z. */
function cap(
  outline: THREE.Vector2[],
  holes: THREE.Vector2[][],
  z: number,
  facing: 1 | -1,
): THREE.BufferGeometry {
  const shape = new THREE.Shape(outline)
  for (const hole of holes) shape.holes.push(new THREE.Path(hole))
  const geometry = new THREE.ShapeGeometry(shape, 1)
  if (facing < 0) {
    // Flip first, translate second: scaling z after the move would send the
    // back face straight through to the front.
    geometry.scale(1, 1, -1)
    const index = geometry.getIndex()
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const b = index.getX(i + 1)
        index.setX(i + 1, index.getX(i + 2))
        index.setX(i + 2, b)
      }
      index.needsUpdate = true
    }
  }
  geometry.translate(0, 0, z)
  geometry.computeVertexNormals()
  return geometry
}

/** A figure's extent in the wall plane, which is all the spacing test needs. */
interface Extent {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * How far each opening may be widened before it runs into its neighbour.
 *
 * The splay is a number somebody chose and the stone between two lancets is a
 * number the bay arithmetic produced, and when the first is larger than half
 * the second the two widened rings overlap. Earcut's answer to overlapping
 * holes is not an error — it is a triangulation, an arbitrary one, and what
 * comes back is a wall with triangular tears across it. That is what a 0.55 m
 * splay between 0.42 m mullions did, and it is not the kind of thing that
 * should depend on getting a parameter right.
 *
 * So the splay asks the bay how much room it has. Extents rather than radii,
 * because a lancet is eight times taller than it is wide and its bounding
 * circle would claim most of the panel; the separation of two boxes is the
 * larger of their two axis gaps, which for a field laid out on rows and
 * columns is exact.
 */
function headroom(figures: WindowFigure[], width: number, height: number): number[] {
  /** Stone left standing between two widened openings, and at the panel edge. */
  const RIDGE = 0.07

  const extents: Extent[] = figures.map((f) => {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const p of f.ring) {
      if (p.x < x0) x0 = p.x
      if (p.x > x1) x1 = p.x
      if (p.y < y0) y0 = p.y
      if (p.y > y1) y1 = p.y
    }
    return { x0, y0, x1, y1 }
  })

  return extents.map((a, i) => {
    let room = Math.min(
      a.x0 + width / 2,
      width / 2 - a.x1,
      a.y0,
      height - a.y1,
    ) - RIDGE
    for (const [j, b] of extents.entries()) {
      if (i === j) continue
      const gap = Math.max(
        Math.max(b.x0 - a.x1, a.x0 - b.x1),
        Math.max(b.y0 - a.y1, a.y0 - b.y1),
      )
      // Already touching: this pair gets no splay at all rather than a
      // negative one.
      room = Math.min(room, (gap - RIDGE) / 2)
    }
    return Math.max(0, room)
  })
}

/**
 * The stone of a pierced wall, with the splay built rather than bevelled.
 *
 * `ExtrudeGeometry`'s bevel runs the wrong way through a hole: it makes the
 * opening *narrower* at the two faces and full size in the middle, which is a
 * reveal turned inside out. Pushed far enough to be visible it closes the
 * window altogether, which is what a 0.55 m bevel on a 1.08 m lancet did —
 * an entire nave of blind sockets.
 *
 * So the wall is three surfaces instead of one extrusion: a face at either
 * side carrying the openings widened by the splay, the true opening at the
 * middle of the thickness, and a throat stitching each widened ring to it.
 * Every opening is then a funnel from both sides, narrowest where the glass
 * sits — which is how the fabric is actually cut, and it gives the wall
 * something a flat slab can never have: at this depth the splays of two
 * neighbouring lancets flare until they nearly touch, so what is left between
 * them is a *ridge*. That ridge, repeated across a bay, is the faceted,
 * folded surface in every interior photograph of this building.
 */
export function pierced(
  width: number,
  height: number,
  thickness: number,
  figures: WindowFigure[],
  splay = 0.16,
): THREE.BufferGeometry {
  const outline = [
    new THREE.Vector2(-width / 2, 0),
    new THREE.Vector2(width / 2, 0),
    new THREE.Vector2(width / 2, height),
    new THREE.Vector2(-width / 2, height),
  ]
  const half = thickness / 2
  const reach = Math.min(splay, thickness * 0.45)
  const room = headroom(figures, width, height)

  const rings = figures.map((f) => f.ring)
  const wide = rings.map((r, i) => dilate(r, Math.min(reach, room[i]!)))

  const pieces: THREE.BufferGeometry[] = [
    cap(outline, wide, half, 1),
    cap(outline, wide, -half, -1),
  ]

  // The throats. Two strips per opening, mirrored about the middle, so a
  // pane sits in the waist of the funnel and the stone falls away from it
  // both ways.
  const positions: number[] = []
  for (const [k, ring] of rings.entries()) {
    const lip = wide[k]!
    const n = ring.length
    if (lip.length !== n) continue
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const a = ring[i]!
      const b = ring[j]!
      const p = lip[i]!
      const q = lip[j]!
      for (const side of [1, -1]) {
        const z = side * half
        // Wound so the throat faces into the opening from either side.
        if (side > 0) {
          positions.push(p.x, p.y, z, a.x, a.y, 0, b.x, b.y, 0)
          positions.push(p.x, p.y, z, b.x, b.y, 0, q.x, q.y, z)
        } else {
          positions.push(a.x, a.y, 0, p.x, p.y, z, q.x, q.y, z)
          positions.push(a.x, a.y, 0, q.x, q.y, z, b.x, b.y, 0)
        }
      }
    }
  }
  if (positions.length > 0) {
    const throat = new THREE.BufferGeometry()
    throat.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    // The caps come from ShapeGeometry and carry a uv; nothing samples it,
    // but a merge is refused unless every input agrees about which
    // attributes exist. One in the wall's own plane costs nothing and means
    // the throat is never the reason a wall fails to build.
    const uv: number[] = []
    for (let i = 0; i < positions.length; i += 3) {
      uv.push(positions[i]! / Math.max(width, 1e-3) + 0.5, positions[i + 1]! / Math.max(height, 1e-3))
    }
    throat.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
    throat.computeVertexNormals()
    pieces.push(throat)
  }

  return mergeOrEmpty(pieces)
}

/**
 * The glass for a set of figures, graded by height in the building.
 *
 * One geometry, flat-shaded per pane, colour in a vertex attribute — the same
 * contract the transmittance pass has always read, so nothing downstream has
 * to learn that windows have shapes now.
 */
export function glazing(
  figures: WindowFigure[],
  p: {
    /** Height in the building of y = 0 and of y = `height`, normalised. */
    gradeBase: number
    gradeTop: number
    height: number
    side: GlassSide
    along: number
    seed: number
  },
): THREE.BufferGeometry {
  const random = mulberry32(p.seed)
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const color = new THREE.Color()
  const centre = new THREE.Vector2()

  let left = Infinity
  let right = -Infinity
  for (const figure of figures) {
    for (const point of figure.ring) {
      if (point.x < left) left = point.x
      if (point.x > right) right = point.x
    }
  }
  const span = Math.max(1e-3, right - left)

  for (const figure of figures) {
    for (const cell of figure.panes) {
      if (cell.length < 3) continue
      centre.set(0, 0)
      for (const point of cell) centre.add(point)
      centre.multiplyScalar(1 / cell.length)

      const v = THREE.MathUtils.clamp(centre.y / Math.max(1e-3, p.height), 0, 1)
      const grade = THREE.MathUtils.lerp(p.gradeBase, p.gradeTop, v)
      paneColor(color, p.side, (centre.x - left) / span, grade, p.along, random)

      const base = positions.length / 3
      for (const point of cell) {
        positions.push(point.x, point.y, 0)
        colors.push(color.r, color.g, color.b)
      }
      for (let i = 1; i + 1 < cell.length; i++) indices.push(base, base + i, base + i + 1)
    }
  }

  const geometry = new THREE.BufferGeometry()
  if (positions.length === 0) return geometry
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

/**
 * Merge, tolerating an empty list and a disagreement about indexing.
 *
 * `mergeGeometries` returns **null** rather than throwing when the inputs do
 * not match, and a null coalesced to an empty geometry is a wall that simply
 * is not there. That is exactly what happened the first time this ran: a
 * pierced register is an `ExtrudeGeometry`, which is not indexed, and the
 * solid bands above and below it are `BoxGeometry`, which is — so every
 * exterior wall in the building merged to nothing and the nave was glazed
 * onto open sky. Nothing warned, because nothing was asked.
 *
 * So the disagreement is settled here before the merge rather than discovered
 * after it: anything unindexed is given the identity index, which costs one
 * array and makes the inputs comparable. A merge that still fails throws,
 * because at that point something is wrong that a silent empty wall would
 * only hide.
 */
export function mergeOrEmpty(pieces: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const real = pieces.filter((g) => (g.getAttribute('position')?.count ?? 0) > 0)
  if (real.length === 0) return new THREE.BufferGeometry()
  if (real.length === 1) return real[0]!

  for (const geometry of real) {
    if (geometry.getIndex()) continue
    const count = geometry.getAttribute('position')!.count
    geometry.setIndex(Array.from({ length: count }, (_, i) => i))
  }

  // And the same for the attribute set. Three's own primitives all carry a
  // uv; anything built by hand here mostly does not, and a merge of the two
  // is refused. Nothing in this project samples a uv — the grain is in world
  // space and the stones have no maps — so the honest fix is to give the
  // hand-built pieces the attribute they are missing rather than to strip it
  // from the primitives and find out later which chunk wanted it.
  const attributes = new Set<string>()
  for (const geometry of real) for (const name of Object.keys(geometry.attributes)) attributes.add(name)
  for (const geometry of real) {
    for (const name of attributes) {
      if (geometry.getAttribute(name)) continue
      const count = geometry.getAttribute('position')!.count
      const size = real.find((g) => g.getAttribute(name))!.getAttribute(name)!.itemSize
      geometry.setAttribute(name, new THREE.Float32BufferAttribute(new Float32Array(count * size), size))
    }
  }

  const merged = mergeGeometries(real, false)
  if (!merged) {
    const shapes = real.map((g) => Object.keys(g.attributes).sort().join('+'))
    throw new Error(`geometry merge refused: attributes differ — ${[...new Set(shapes)].join(' / ')}`)
  }
  return merged
}
