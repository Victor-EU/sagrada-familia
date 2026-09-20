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

  const panes: THREE.Vector2[][] = []
  for (let j = 0; j + 1 < ys.length; j++) {
    const y0 = ys[j]!
    const y1 = ys[j + 1]!
    const w0 = halfAt(y0)
    const w1 = halfAt(y1)
    if (w0 < 1e-4 && w1 < 1e-4) continue
    for (let i = 0; i < columns; i++) {
      const a = i / columns
      const b = (i + 1) / columns
      const cell = [
        new THREE.Vector2(THREE.MathUtils.lerp(-w0, w0, a), y0),
        new THREE.Vector2(THREE.MathUtils.lerp(-w0, w0, b), y0),
        new THREE.Vector2(THREE.MathUtils.lerp(-w1, w1, b), y1),
        new THREE.Vector2(THREE.MathUtils.lerp(-w1, w1, a), y1),
      ]
      panes.push(cell)
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
 * The stone of a pierced wall: one extruded rectangle with the figures as
 * holes in it, bevelled so every opening has a splay.
 *
 * The outer rectangle is grown by the bevel before extrusion, because the
 * bevel eats into whatever contour it is applied to and the wall's own edges
 * have to land where the wall was asked to be. Holes want the opposite and
 * get it for free: a bevelled hole opens out toward both faces, which is a
 * reveal cut from both sides — near enough what the fabric does, and the
 * shadow it throws across the jamb is the whole reason for having it.
 */
export function pierced(
  width: number,
  height: number,
  thickness: number,
  figures: WindowFigure[],
  splay = 0.16,
): THREE.BufferGeometry {
  const bevel = Math.min(splay, thickness * 0.45)
  const shape = new THREE.Shape([
    new THREE.Vector2(-width / 2 - bevel, -bevel),
    new THREE.Vector2(width / 2 + bevel, -bevel),
    new THREE.Vector2(width / 2 + bevel, height + bevel),
    new THREE.Vector2(-width / 2 - bevel, height + bevel),
  ])
  for (const figure of figures) shape.holes.push(new THREE.Path(figure.ring))

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, thickness - 2 * bevel),
    bevelEnabled: bevel > 1e-3,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: 0,
    bevelSegments: 1,
    curveSegments: 1,
  })
  geometry.translate(0, 0, -thickness / 2)
  geometry.computeVertexNormals()
  return geometry
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

  const merged = mergeGeometries(real, false)
  if (!merged) {
    const shapes = real.map((g) => Object.keys(g.attributes).sort().join('+'))
    throw new Error(`geometry merge refused: attributes differ — ${[...new Set(shapes)].join(' / ')}`)
  }
  return merged
}
