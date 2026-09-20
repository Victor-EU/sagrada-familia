import * as THREE from 'three'

/**
 * The writing on the building.
 *
 * This was left out of the model and it should not have been. Sagrada
 * Família is a *written* building: `Sanctus Sanctus Sanctus` runs round every
 * bell tower in letters a metre and a half high, `Hosanna` and `Excelsis`
 * climb the shafts beside them, every gable on the apse carries a word —
 * `Amen`, `Honor`, `Poder`, `Acció de Gràcies` — and the Passion lintel
 * carries the charge nailed over the cross. In `reference/ex-plaza-nativity.jpg`
 * the word Sanctus is legible four times across one frame taken from the
 * pavement, and in `reference/ex-apse-flank-west.jpg` four separate words are
 * readable on one gable. A model of this building with no letters on it is
 * missing something a visitor reads before they read the sculpture.
 *
 * ## Why a stroke font and not outlines
 *
 * The obvious way to set type in three.js is `FontLoader` and a JSON font,
 * and that is an imported asset — this project has none, and a typeface is a
 * poor thing to smuggle in as one. The second way is to hand-author glyph
 * *outlines*, which is a closed contour per letter and a triangulator to go
 * with it.
 *
 * But look at what the building actually has. These letters are not printed,
 * they are **carved in relief**: a raised bar of stone of near-constant
 * width, standing seven or eight centimetres proud, catching sun along its
 * top and throwing a shadow down its right side. That is a *stroke*, not an
 * outline — the skeleton is the letter and the width is a property of the
 * chisel. So the font here is a skeleton: each glyph is a handful of
 * polylines through a unit em, and the builder sweeps a rectangular section
 * along each one. It costs a fifth of what an outline font costs to author,
 * it needs no triangulator, and it is the shape the mason actually cut.
 *
 * ## The em
 *
 * Cap height is 1, baseline is 0, x-height is 0.70, descenders reach -0.22.
 * Advance widths are per glyph and include no side bearing — tracking is
 * added by the setter, because an inscription cut round a tower is spaced
 * much wider than a line of text.
 */

/** A glyph: how far the pen moves, and the strokes to draw before it does. */
interface Glyph {
  /** Advance width, in ems. */
  w: number
  /** Polylines, each a flat run of x,y pairs in em units. */
  s: number[][]
}

/** x-height, as every lowercase glyph below is drawn to it. */
const X = 0.7

/**
 * A run of points along a circular arc, in degrees, inclusive of both ends.
 *
 * Angles increase anticlockwise, so `arc(cx, cy, r, 58, 302, n)` sweeps the
 * long way round the left — which is a C.
 */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): number[] {
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / n)
    out.push(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }
  return out
}

/** Join runs of points end to end into one polyline. */
function join(...runs: number[][]): number[] {
  return runs.flat()
}

/**
 * The alphabet.
 *
 * Only the letters the building actually uses, which is the whole of the
 * argument for authoring a font by hand: this one sets seven words and the
 * Passion lintel and nothing else, so it is forty lines rather than a
 * download. A geometric roman skeleton, which is what the workshop cut —
 * even stroke, open apertures, no serifs to speak of at the size these are
 * read from.
 */
const GLYPHS: Record<string, Glyph> = {
  ' ': { w: 0.3, s: [] },

  A: { w: 0.74, s: [[0.02, 0, 0.37, 1, 0.72, 0], [0.155, 0.4, 0.585, 0.4]] },
  C: { w: 0.7, s: [arc(0.37, 0.5, 0.33, 58, 302, 9)] },
  D: { w: 0.8, s: [join([0.08, 1, 0.28, 1], arc(0.28, 0.5, 0.5, 90, -90, 7), [0.08, 0])] },
  E: { w: 0.62, s: [[0.58, 1, 0.08, 1, 0.08, 0, 0.58, 0], [0.08, 0.5, 0.46, 0.5]] },
  G: { w: 0.76, s: [join(arc(0.37, 0.5, 0.33, 58, 330, 10), [0.7, 0.5, 0.44, 0.5])] },
  H: { w: 0.74, s: [[0.08, 0, 0.08, 1], [0.66, 0, 0.66, 1], [0.08, 0.5, 0.66, 0.5]] },
  I: { w: 0.28, s: [[0.14, 0, 0.14, 1]] },
  J: { w: 0.46, s: [[0.38, 1, 0.38, 0.2, 0.29, 0.04, 0.14, 0.03, 0.05, 0.14]] },
  N: { w: 0.76, s: [[0.08, 0, 0.08, 1, 0.68, 0, 0.68, 1]] },
  O: { w: 0.78, s: [arc(0.39, 0.5, 0.35, 0, 360, 14)] },
  P: { w: 0.68, s: [[0.1, 0, 0.1, 1], join([0.1, 1, 0.32, 1], arc(0.32, 0.735, 0.265, 90, -90, 6), [0.1, 0.47])] },
  R: { w: 0.72, s: [[0.1, 0, 0.1, 1], join([0.1, 1, 0.32, 1], arc(0.32, 0.735, 0.265, 90, -90, 6), [0.1, 0.47]), [0.3, 0.47, 0.68, 0]] },
  S: { w: 0.64, s: [[0.57, 0.8, 0.47, 0.96, 0.26, 0.99, 0.11, 0.88, 0.12, 0.72, 0.28, 0.6, 0.46, 0.5, 0.57, 0.36, 0.54, 0.15, 0.36, 0.03, 0.16, 0.05, 0.06, 0.18]] },
  T: { w: 0.64, s: [[0.02, 1, 0.62, 1], [0.32, 1, 0.32, 0]] },
  U: { w: 0.76, s: [join([0.08, 1], arc(0.38, 0.3, 0.3, 180, 360, 7), [0.68, 1])] },
  X: { w: 0.68, s: [[0.04, 1, 0.64, 0], [0.64, 1, 0.04, 0]] },
  Z: { w: 0.66, s: [[0.06, 1, 0.6, 1, 0.06, 0, 0.62, 0]] },

  b: { w: 0.62, s: [[0.08, 1, 0.08, 0], arc(0.34, 0.35, 0.26, 0, 360, 12)] },
  h: { w: 0.6, s: [[0.09, 1, 0.09, 0], [0.09, 0.5, 0.17, 0.66, 0.32, X, 0.45, 0.62, 0.5, 0.48, 0.5, 0]] },
  a: { w: 0.62, s: [arc(0.3, 0.35, 0.26, 0, 360, 12), [0.56, X, 0.56, 0]] },
  c: { w: 0.54, s: [arc(0.29, 0.35, 0.26, 55, 305, 8)] },
  d: { w: 0.62, s: [arc(0.3, 0.35, 0.26, 0, 360, 12), [0.56, 1, 0.56, 0]] },
  e: { w: 0.58, s: [arc(0.29, 0.35, 0.26, 0, 320, 11), [0.03, 0.37, 0.55, 0.37]] },
  i: { w: 0.28, s: [[0.14, X, 0.14, 0], [0.14, 0.86, 0.14, 0.95]] },
  l: { w: 0.26, s: [[0.13, 1, 0.13, 0]] },
  m: { w: 0.92, s: [[0.08, 0, 0.08, X], [0.08, 0.5, 0.16, 0.66, 0.3, X, 0.42, 0.62, 0.46, 0.48, 0.46, 0], [0.46, 0.5, 0.54, 0.66, 0.68, X, 0.8, 0.62, 0.84, 0.48, 0.84, 0]] },
  n: { w: 0.62, s: [[0.09, 0, 0.09, X], [0.09, 0.5, 0.17, 0.66, 0.32, X, 0.45, 0.62, 0.5, 0.48, 0.5, 0]] },
  o: { w: 0.64, s: [arc(0.32, 0.35, 0.27, 0, 360, 12)] },
  r: { w: 0.44, s: [[0.1, 0, 0.1, X], [0.1, 0.48, 0.19, 0.64, 0.36, X]] },
  s: { w: 0.5, s: [[0.43, 0.57, 0.34, 0.69, 0.17, X, 0.07, 0.61, 0.1, 0.5, 0.24, 0.43, 0.38, 0.36, 0.43, 0.25, 0.38, 0.08, 0.22, 0.02, 0.07, 0.1]] },
  t: { w: 0.4, s: [[0.18, 0.95, 0.18, 0.14, 0.3, 0.02, 0.38, 0.06], [0.02, X, 0.36, X]] },
  u: { w: 0.62, s: [join([0.09, X], arc(0.3, 0.22, 0.21, 180, 360, 6), [0.51, X]), [0.51, 0.36, 0.51, 0]] },
  x: { w: 0.56, s: [[0.04, X, 0.52, 0], [0.52, X, 0.04, 0]] },

  // Catalan takes its accents and the gables are in Catalan.
  'à': { w: 0.62, s: [arc(0.3, 0.35, 0.26, 0, 360, 12), [0.56, X, 0.56, 0], [0.42, 0.98, 0.24, 0.84]] },
  'ó': { w: 0.64, s: [arc(0.32, 0.35, 0.27, 0, 360, 12), [0.26, 0.84, 0.44, 0.98]] },
}

/** Width of a set line, in ems, tracking included. */
export function textWidth(text: string, tracking = 0.12): number {
  let w = 0
  for (const ch of text) w += (GLYPHS[ch]?.w ?? 0.5) + tracking
  return Math.max(0, w - tracking)
}

export interface InscriptionParams {
  text: string
  /** Cap height, metres. */
  size: number
  /** Width of the cut stroke, as a fraction of the cap height. */
  weight?: number
  /**
   * How far the letter stands proud of its ground, as a fraction of size.
   *
   * Deeper than a first guess wants. These are read at sixty to a hundred
   * metres and what carries that distance is not the shape of the stroke but
   * the *shadow beside it* — at a tenth of the cap height the first attempt
   * came back as a flat mark the colour of the shaft, legible only where the
   * sun happened to rake it. A sixth throws a shadow as wide as the stroke
   * at any sun above twenty degrees, which is every hour these frames use.
   */
  relief?: number
  /** Extra space between letters, in ems. */
  tracking?: number
  /** Tessellation, as everywhere else: 1 is what you see from the terrace. */
  detail?: number
}

/**
 * A line of raised letters, in its own frame.
 *
 * x runs right along the baseline from zero, y up from it, and z stands out
 * of the ground — so the caller places the ground and the letters arrive on
 * it. Nothing here knows whether it is writing on a flat gable or round a
 * hundred-metre tower; `wrapAroundY` does that afterwards, on the finished
 * geometry, which is why one setter serves both.
 */
export function buildInscription(p: InscriptionParams): THREE.BufferGeometry {
  const size = p.size
  const half = (size * (p.weight ?? 0.17)) / 2
  const depth = size * (p.relief ?? 0.17)
  const tracking = p.tracking ?? 0.12
  const detail = p.detail ?? 1

  // How much of a curve survives at this level of detail. A letter is a
  // metre and a half on a tower a hundred metres up; from the plaza the
  // difference between a twelve-sided o and a four-sided one is a third of a
  // pixel, and there are several thousand letters on this building.
  const stride = detail >= 0.5 ? 1 : detail >= 0.25 ? 2 : 3

  const position: number[] = []
  const normal: number[] = []
  let pen = 0

  for (const ch of p.text) {
    const glyph = GLYPHS[ch]
    if (!glyph) {
      pen += 0.5 + tracking
      continue
    }
    for (const stroke of glyph.s) {
      const pts = sample(stroke, stride)
      if (pts.length >= 4) ribbon(pts, pen, size, half, depth, position, normal)
    }
    pen += glyph.w + tracking
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  return geometry
}

/** Thin a polyline, always keeping both ends. */
function sample(stroke: number[], stride: number): number[] {
  if (stride <= 1) return stroke
  const n = stroke.length / 2
  const out: number[] = []
  for (let i = 0; i < n; i += stride) out.push(stroke[i * 2]!, stroke[i * 2 + 1]!)
  const lastX = stroke[(n - 1) * 2]!
  const lastY = stroke[(n - 1) * 2 + 1]!
  if (out[out.length - 2] !== lastX || out[out.length - 1] !== lastY) out.push(lastX, lastY)
  return out
}

/**
 * Sweep a rectangular section along one polyline.
 *
 * Three faces and two ends: the top of the cut, which is what takes the sun,
 * and the two sides, one of which is the shadow that makes the letter
 * legible. There is no back — it is buried in the wall — and leaving it off
 * is a quarter of the triangles on every inscription in the building.
 *
 * Interior corners are mitred, with the usual clamp so that a letter like `s`
 * folding back on itself does not throw a spike across the frame.
 */
function ribbon(
  pts: number[],
  penEm: number,
  size: number,
  half: number,
  depth: number,
  position: number[],
  normal: number[],
): void {
  const n = pts.length / 2
  const px = (i: number): number => (penEm + pts[i * 2]!) * size
  const py = (i: number): number => pts[i * 2 + 1]! * size

  // Per-vertex offset direction, to the left of travel.
  const nx = new Float64Array(n)
  const ny = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1)
    const b = Math.min(n - 1, i + 1)
    let tx = px(b) - px(a)
    let ty = py(b) - py(a)
    const len = Math.hypot(tx, ty) || 1
    tx /= len
    ty /= len
    let ox = -ty
    let oy = tx
    // Mitre: lengthen the offset so the outer edge of a corner closes.
    if (i > 0 && i < n - 1) {
      let ax = px(i) - px(i - 1)
      let ay = py(i) - py(i - 1)
      const al = Math.hypot(ax, ay) || 1
      ax /= al
      ay /= al
      // Clamped hard. A right-angled corner — the top left of an E, say —
      // asks for an offset two and a half times the stroke, which at these
      // weights closes the counter of the letter and turns an E into a B.
      const scale = 1 / Math.max(0.62, ox * -ay + oy * ax)
      ox *= scale
      oy *= scale
    }
    nx[i] = ox
    ny[i] = oy
  }

  const quad = (
    a: number[], b: number[], c: number[], d: number[],
    nrm: number[],
  ): void => {
    for (const v of [a, b, c, a, c, d]) position.push(v[0]!, v[1]!, v[2]!)
    for (let i = 0; i < 6; i++) normal.push(nrm[0]!, nrm[1]!, nrm[2]!)
  }
  const L = (i: number, z: number): number[] => [px(i) + nx[i]! * half, py(i) + ny[i]! * half, z]
  const R = (i: number, z: number): number[] => [px(i) - nx[i]! * half, py(i) - ny[i]! * half, z]

  for (let i = 0; i < n - 1; i++) {
    let tx = px(i + 1) - px(i)
    let ty = py(i + 1) - py(i)
    const len = Math.hypot(tx, ty)
    if (len < 1e-6) continue
    tx /= len
    ty /= len
    const side = [-ty, tx, 0]
    quad(L(i, depth), R(i, depth), R(i + 1, depth), L(i + 1, depth), [0, 0, 1])
    quad(L(i, 0), L(i, depth), L(i + 1, depth), L(i + 1, 0), side)
    quad(R(i, 0), R(i + 1, 0), R(i + 1, depth), R(i, depth), [-side[0]!, -side[1]!, 0])
  }

  // The two ends, so a stroke does not read as an open tube from the side.
  const t0x = px(1) - px(0)
  const t0y = py(1) - py(0)
  const l0 = Math.hypot(t0x, t0y) || 1
  quad(L(0, 0), R(0, 0), R(0, depth), L(0, depth), [-t0x / l0, -t0y / l0, 0])
  const tex = px(n - 1) - px(n - 2)
  const tey = py(n - 1) - py(n - 2)
  const le = Math.hypot(tex, tey) || 1
  quad(L(n - 1, 0), L(n - 1, depth), R(n - 1, depth), R(n - 1, 0), [tex / le, tey / le, 0])
}

/**
 * Bend a flat inscription round a vertical axis.
 *
 * The letters are set flat and then wrapped, rather than placed one at a time
 * on a tangent plane, because a word set round a five-metre shaft covers
 * thirty degrees and a per-letter tangent frame leaves each one chording its
 * own arc — visible as a row of flat plates at the distance these are read
 * from. Wrapping the finished geometry costs one rotation per vertex and the
 * letter lies on the surface.
 *
 * `radiusAt` is the shaft's own section, so the letters follow a star profile
 * into its valleys instead of floating over them. x becomes arc length and z
 * becomes height above the surface.
 *
 * Arc length runs *clockwise* from `angle0`, which is the direction that
 * reads left to right to somebody standing outside the tower. Anticlockwise
 * is the natural way to write the formula and it puts the whole building's
 * writing in mirror image — which is exactly what the first attempt did, and
 * it is not a subtle failure: Sanctus came back as sutcnaS on all twelve
 * towers at once.
 */
export function wrapAroundY(
  geometry: THREE.BufferGeometry,
  radiusAt: (alpha: number) => number,
  angle0: number,
  meanRadius: number,
): THREE.BufferGeometry {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute
  const nor = geometry.getAttribute('normal') as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) {
    const alpha = angle0 - pos.getX(i) / meanRadius
    const r = radiusAt(alpha) + pos.getZ(i)
    const cos = Math.cos(alpha)
    const sin = Math.sin(alpha)
    pos.setXYZ(i, r * cos, pos.getY(i), r * sin)
    // The section turns with the vertex: what pointed along x now points
    // along the tangent, and what pointed out of the page points outward.
    const ux = nor.getX(i)
    const uz = nor.getZ(i)
    nor.setXYZ(i, ux * sin + uz * cos, nor.getY(i), -ux * cos + uz * sin)
  }
  pos.needsUpdate = true
  nor.needsUpdate = true
  geometry.computeBoundingSphere()
  return geometry
}
