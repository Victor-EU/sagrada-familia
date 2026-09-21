/**
 * The cover.
 *
 * Gaudí found the shape of this building by hanging chains from a board,
 * letting gravity draw the curves, and turning the photograph upside down.
 * For the seconds the stone takes to cut there is nothing else to show, so
 * the page does what he did: seven anchors, an arch of chain between each
 * pair, a weight hung from every crown with the middle ones hanging longest,
 * and then the whole drawing turned over — at which point the arches stand,
 * the weights are the towers, and the building fades in beneath the lines
 * where they have already put it.
 *
 * The main thread is busy for the whole of the build, so everything that
 * happens during it has to be something the compositor can carry alone. The
 * drop is simulated and drawn *before* the build starts; the turn and every
 * fade are a CSS transform and opacities, started a frame before the thread
 * goes away (see the wait in main.ts). Nothing here runs while the model is
 * being generated.
 */

interface Point {
  x: number
  y: number
  px: number
  py: number
  pinned: boolean
  /** Relative mass — the weights are heavier than the chain. */
  m: number
}

interface Rod {
  a: number
  b: number
  len: number
}

/** How long the chains take to find their shape, wall-clock. */
const DROP_MS = 1600
/** Gravity, in drawing units per second squared. */
const G = 0.9
const DAMP = 0.992
const DT = 1 / 60
const SOLVER_PASSES = 10

/** The board, and the arches hung from it, in a space one drawing unit wide. */
const BOARD_Y = 0.1
const ANCHORS = 7
const SPAN_LEFT = 0.14
const SPAN_RIGHT = 0.86
/** Chain length as a multiple of its span: how deep the arches hang. */
const SAG = 1.28
const ARCH_SEGMENTS = 22
/**
 * How far the weight hangs below each crown. Turned over these are the
 * towers, so the middle ones are longest — the tallest are over the crossing.
 */
const DROPS = [0.1, 0.19, 0.3, 0.34, 0.24, 0.13]
const DROP_SEGMENTS = 10
/** The bridge between the two tallest towers, which the Nativity front has. */
const BRIDGE = 0.06
/** The drawing's height in units of its width — a 16:10 box, centred. */
const BOX = 0.625

const LINE = 'rgba(216, 195, 154, 0.9)'
const BOARD = 'rgba(216, 195, 154, 0.35)'

export class Cover {
  private readonly ctx: CanvasRenderingContext2D
  private pts: Point[] = []
  private rods: Rod[] = []
  /** Simulated time reached so far, in seconds. */
  private simulated = 0
  private readonly reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

  private readonly canvas: HTMLCanvasElement

  /** `cover` is the dark ground; the drawing inside it is what turns. */
  constructor(private readonly cover: HTMLElement) {
    this.canvas = cover.querySelector('canvas')!
    this.ctx = this.canvas.getContext('2d')!
    this.build()
  }

  /**
   * The chains drop and find their shape. Resolves once they have — on a
   * hidden tab, which gets no frames, the drop is stepped through at once so
   * the page never waits on a frame that is not coming.
   */
  settle(): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false
      const finish = (): void => {
        if (done) return
        done = true
        this.stepTo(DROP_MS / 1000)
        this.draw(this.reduced ? 1 : 0)
        resolve()
      }
      if (this.reduced) {
        finish()
        return
      }
      const start = performance.now()
      const frame = (now: number): void => {
        if (done) return
        const t = Math.min(now - start, DROP_MS)
        this.stepTo(t / 1000)
        this.draw(0)
        if (t >= DROP_MS) finish()
        else requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
      window.setTimeout(finish, DROP_MS + 400)
    })
  }

  /**
   * The photograph, turned over. A CSS transition on the canvas, so that it
   * plays while the main thread is building — provided a frame is given for
   * the style to take before the build starts.
   */
  turn(): void {
    if (this.reduced) return
    this.cover.classList.add('turned')
  }

  /** The first frame is drawn: the lines go, and the canvas with them. */
  reveal(): void {
    this.cover.classList.add('gone')
    window.setTimeout(() => this.cover.remove(), 1600)
  }

  // ------------------------------------------------------------- the model --

  private build(): void {
    this.pts = []
    this.rods = []
    const pts = this.pts
    const P = (x: number, y: number, pinned = false, m = 1): number => {
      pts.push({ x, y, px: x, py: y, pinned, m })
      return pts.length - 1
    }
    const R = (a: number, b: number, len: number): void => {
      this.rods.push({ a, b, len })
    }

    const anchors: number[] = []
    for (let i = 0; i < ANCHORS; i++) {
      anchors.push(P(SPAN_LEFT + ((SPAN_RIGHT - SPAN_LEFT) * i) / (ANCHORS - 1), BOARD_Y, true))
    }

    // An arch of chain between each pair of anchors, laid out along the
    // board with the slightest bow so it visibly drops rather than sits.
    const crowns: number[] = []
    for (let i = 0; i < ANCHORS - 1; i++) {
      const a = anchors[i]!
      const b = anchors[i + 1]!
      const span = pts[b]!.x - pts[a]!.x
      const chain = [a]
      for (let k = 1; k < ARCH_SEGMENTS; k++) {
        const t = k / ARCH_SEGMENTS
        chain.push(P(pts[a]!.x + span * t, BOARD_Y + 0.004 * Math.sin(t * Math.PI)))
      }
      chain.push(b)
      const seg = (span * SAG) / ARCH_SEGMENTS
      for (let k = 0; k < chain.length - 1; k++) R(chain[k]!, chain[k + 1]!, seg)
      crowns.push(chain[Math.floor(chain.length / 2)]!)
    }

    // A weight hung from every crown.
    const weights: number[] = []
    crowns.forEach((crown, i) => {
      let prev = crown
      for (let k = 1; k <= DROP_SEGMENTS; k++) {
        const last = k === DROP_SEGMENTS
        const id = P(pts[crown]!.x + 0.002 * k, pts[crown]!.y + 0.006 * k, false, last ? 6 : 1)
        R(prev, id, DROPS[i]! / DROP_SEGMENTS)
        prev = id
      }
      weights.push(prev)
    })
    R(weights[2]!, weights[3]!, BRIDGE)
  }

  /** Advance the simulation to `t` seconds, in fixed steps. */
  private stepTo(t: number): void {
    let steps = 0
    while (this.simulated + DT <= t && steps < 400) {
      this.step()
      this.simulated += DT
      steps++
    }
  }

  private step(): void {
    const pts = this.pts
    for (const p of pts) {
      if (p.pinned) continue
      const vx = (p.x - p.px) * DAMP
      const vy = (p.y - p.py) * DAMP
      p.px = p.x
      p.py = p.y
      p.x += vx
      p.y += vy + G * p.m * DT * DT
    }
    for (let pass = 0; pass < SOLVER_PASSES; pass++) {
      for (const r of this.rods) {
        const a = pts[r.a]!
        const b = pts[r.b]!
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d = Math.hypot(dx, dy) || 1e-6
        const diff = (d - r.len) / d
        const wa = a.pinned ? 0 : b.pinned ? 1 : b.m / (a.m + b.m)
        const wb = b.pinned ? 0 : a.pinned ? 1 : a.m / (a.m + b.m)
        a.x += dx * diff * wa
        a.y += dy * diff * wa
        b.x -= dx * diff * wb
        b.y -= dy * diff * wb
      }
    }
  }

  // --------------------------------------------------------------- drawing --

  /**
   * Draw the model into a 16:10 box centred in the window, at whichever of
   * the window's two dimensions is the tighter fit. Centred, because the turn
   * is a rotation about the window's centre, and a drawing that is centred
   * before it is still on screen after.
   */
  private draw(turn: number): void {
    const canvas = this.canvas
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = window.innerWidth
    const H = window.innerHeight
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr
      canvas.height = H * dpr
    }
    const s = Math.min(W, H / BOX)
    const ox = (W - s) / 2
    const oy = (H - s * BOX) / 2

    const ctx = this.ctx
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    if (turn > 0) {
      ctx.translate(W / 2, H / 2)
      ctx.rotate(Math.PI * turn)
      ctx.translate(-W / 2, -H / 2)
    }
    ctx.translate(ox, oy)
    ctx.lineWidth = 1
    ctx.lineCap = 'round'

    ctx.strokeStyle = BOARD
    ctx.beginPath()
    ctx.moveTo(0.08 * s, BOARD_Y * s)
    ctx.lineTo(0.92 * s, BOARD_Y * s)
    ctx.stroke()

    ctx.strokeStyle = LINE
    ctx.beginPath()
    for (const r of this.rods) {
      const a = this.pts[r.a]!
      const b = this.pts[r.b]!
      ctx.moveTo(a.x * s, a.y * s)
      ctx.lineTo(b.x * s, b.y * s)
    }
    ctx.stroke()

    ctx.fillStyle = LINE
    for (const p of this.pts) {
      if (p.pinned) {
        ctx.fillRect(p.x * s - 1, p.y * s - 3, 2, 6)
      } else if (p.m > 1) {
        ctx.beginPath()
        ctx.arc(p.x * s, p.y * s, 3.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }
}
