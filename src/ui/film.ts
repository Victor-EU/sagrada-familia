import * as THREE from 'three'
import type { Viewer } from '../camera/viewer.ts'
import { BODY_RADIUS, type Doorway } from '../camera/envelope.ts'
import { dayLabel } from '../light/sun.ts'

/**
 * The film.
 *
 * Everything else in this app asks something of the viewer: turn it, come
 * closer, find the door, walk. This asks nothing. Press play and the camera
 * goes round the building and in, the way a film would — a slow dolly across
 * the pond as the morning arrives, a walk up to the Nativity front, the
 * approach through the door with the vault opening overhead, the shafts
 * sweeping across the crossing as the evening goes — and the sun moves
 * inside every shot, because the one thing nothing else in this building can
 * show is the light *changing*.
 *
 * It is not the guided visit that was here before. That had stops and a rail
 * and asked to be followed; this has cuts and asks to be watched, and the
 * moment a hand touches anything it lets go, leaving the camera exactly where
 * the film had it — a walker if that is indoors, an orbit if it is not — with
 * the clock at whatever hour the shot had reached. A film that ended by
 * putting you back where you started would be a screensaver. This one ends
 * by handing you the building at the moment you reached for it.
 *
 * The shots are authored, dissolved, and looped. The coordinates are not
 * invented: every one is a frame verified in the harness (dev/viewpoints.ts)
 * or a move along one axis from one, because a camera placed by eye in a
 * building this shape ends up inside a pier. The hours are the hours those
 * frames were chosen for, run on a little, so that each shot is a passage of
 * light and not a still.
 */
export interface SunSetting {
  dayOfYear: number
  hour: number
}

type Vec = [number, number, number]

/** Where the camera is and what it is looking at, at one instant. */
interface Frame {
  position: THREE.Vector3
  target: THREE.Vector3
}

export interface Shot {
  title: string
  day: number
  /** The hour the shot opens on and the hour it closes on. */
  hours: [number, number]
  seconds: number
  fov: number | [number, number]
  shift: number
  /**
   * Feet on the floor.
   *
   * Heights are then measured from the pavement under the camera rather than
   * from the world, so a walk climbs the steps at the door and the flight up
   * to the presbytery on its own, and the columns hold it the way they hold a
   * walker. Off, the camera goes exactly where it is told, which is what a
   * crane and an orbit want.
   */
  walk?: boolean
  /** The camera at `t`, from 0 to 1, written into `out`. */
  frame(t: number, out: Frame): void
}

/** Any year does; the sun repeats to well inside a pixel. */
const YEAR = 2026
/** How long one frame gives way to the next. */
const DISSOLVE_MS = 1500
/** And how long the first one takes to arrive out of black. */
const OPEN_MS = 2600
/**
 * How far the hour moves before the sun is recomputed.
 *
 * A change of sun rebuilds the sky probe and re-runs both shadow maps, which
 * is not something to do sixty times a second. Two minutes of sun is a third
 * of a degree, which no shadow edge in the building shows, and at the pace
 * these shots run the clock it is a relight every half second or so.
 */
const SUN_STEP = 0.03
/** When the caption comes and goes, in seconds from either end of a shot. */
const CAPTION_IN = 1.2
const CAPTION_OUT = 1.8
/** How long the one instruction stays up. */
const HINT_MS = 7000

/** Where the film's Nativity door is expected, for finding the real one. */
const NATIVITY_DOOR_Z = -26.3

/**
 * Nearly linear, with the ends taken off.
 *
 * A dolly moves at one speed; that is what makes it a dolly and not an
 * animation. But a move that starts at full speed on the frame after a cut
 * reads as a jolt under the dissolve, so a little of the smootherstep is
 * folded in — enough to soften both ends, not enough to make the middle
 * visibly faster than the ends.
 */
function soft(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  const s = x * x * x * (x * (x * 6 - 15) + 10)
  return THREE.MathUtils.lerp(x, s, 0.35)
}

function lerp3(out: THREE.Vector3, a: Vec, b: Vec, t: number): THREE.Vector3 {
  return out.set(
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  )
}

interface ShotBase {
  title: string
  day: number
  hours: [number, number]
  seconds: number
  fov: number | [number, number]
  shift: number
  walk?: boolean
}

/** A straight move, looking at a point or sliding between two. */
function dolly(spec: ShotBase & { from: Vec; to: Vec; look: Vec | [Vec, Vec] }): Shot {
  const { from, to, look, ...base } = spec
  const pair = Array.isArray(look[0]) ? (look as [Vec, Vec]) : null
  return {
    ...base,
    frame(t, out) {
      lerp3(out.position, from, to, t)
      if (pair) lerp3(out.target, pair[0], pair[1], t)
      else out.target.fromArray(look as Vec)
    },
  }
}

/** A turn about the building at one height, in degrees of azimuth. */
function orbit(
  spec: ShotBase & {
    centre: [number, number]
    radius: number
    height: number
    from: number
    to: number
    look: Vec
  },
): Shot {
  const { centre, radius, height, from, to, look, ...base } = spec
  return {
    ...base,
    frame(t, out) {
      const a = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(from, to, t))
      out.position.set(centre[0] + Math.sin(a) * radius, height, centre[1] + Math.cos(a) * radius)
      out.target.fromArray(look)
    },
  }
}

/** Straight up, turning slowly, and rising. */
function spin(spec: ShotBase & { at: Vec; rise: number; yaw: [number, number] }): Shot {
  const { at, rise, yaw, ...base } = spec
  return {
    ...base,
    frame(t, out) {
      out.position.set(at[0], at[1] + rise * t, at[2])
      const a = THREE.MathUtils.lerp(yaw[0], yaw[1], t)
      // A point far overhead and a hair to one side, which is how a yaw is
      // said when the pitch is ninety degrees and the aim is a point.
      out.target.set(at[0] - Math.sin(a) * 10, out.position.y + 500, at[2] - Math.cos(a) * 10)
    },
  }
}

/**
 * The door the film goes in by.
 *
 * The Nativity transept's northern doorway, found on the envelope rather
 * than written down, because a plan number can move it. The fallback is
 * where it has stood since phase 5.
 */
function nativityDoor(viewer: Viewer): Doorway {
  let best: Doorway | null = null
  let near = Infinity
  for (const door of viewer.envelope?.doors ?? []) {
    if (door.nx < 0.5) continue
    const d = Math.abs(door.z - NATIVITY_DOOR_Z)
    if (d < near) {
      near = d
      best = door
    }
  }
  return best ?? { x: 32, z: NATIVITY_DOOR_Z, nx: 1, nz: 0, halfWidth: 2 }
}

/**
 * The shots, in the order you would walk it: from across the square, up to
 * the fronts, round from the air, onto the roof, in through the door, and
 * then the room at the hours the room was built for.
 */
export function shots(viewer: Viewer): Shot[] {
  const door = nativityDoor(viewer)
  /** A point on the door's own axis, `d` metres outside it. */
  const axis = (d: number, y: number): Vec => [door.x + door.nx * d, y, door.z + door.nz * d]

  return [
    dolly({
      title: 'Across the pond',
      day: 172,
      hours: [7.4, 9.6],
      seconds: 24,
      fov: 56,
      shift: 0.45,
      // Along the strip the plaza keeps clear for the façade's own sightline
      // — see the planting in plan/city.ts — and out over the water at the
      // end of it, which is where the photograph is taken from.
      from: [160, 1.0, 0],
      to: [140, 1.0, -12],
      look: [
        [0, 60, -26],
        [0, 68, -26],
      ],
    }),
    dolly({
      title: 'The Nativity front',
      day: 172,
      hours: [9.6, 10.1],
      seconds: 18,
      fov: 72,
      shift: 0.35,
      walk: true,
      // The same clear strip, from the edge of the pond to the foot of the
      // steps. A head above eye height, to see over the water.
      from: [108, 3.0, -8],
      to: [94, 3.0, -12],
      look: [
        [10, 106, -26],
        [10, 92, -26],
      ],
    }),
    orbit({
      title: 'Round the building',
      day: 264,
      hours: [16.4, 17.6],
      seconds: 32,
      fov: 42,
      shift: 0.3,
      centre: [0, -19],
      radius: 270,
      height: 96,
      from: -60,
      to: 100,
      look: [0, 62, -19],
    }),
    dolly({
      title: 'The flank from the street, December',
      day: 352,
      hours: [15.4, 15.9],
      seconds: 14,
      fov: 46,
      shift: 0,
      from: [-177, 1.7, 80],
      to: [-170, 1.7, 73],
      look: [-18, 62, -12],
    }),
    dolly({
      title: 'Under the Passion front',
      day: 352,
      hours: [15.0, 15.5],
      seconds: 16,
      fov: 64,
      shift: 0,
      from: [-78, 1.6, -36],
      to: [-66, 1.6, -31],
      look: [
        [-44, 62, -30],
        [-44, 56, -30],
      ],
    }),
    dolly({
      title: 'On the terraces',
      day: 172,
      hours: [8.3, 8.8],
      seconds: 16,
      fov: 72,
      shift: 0.4,
      from: [18.5, 33.4, 15],
      to: [18.5, 33.4, 7],
      look: [3, 96, -36],
    }),
    dolly({
      title: 'The door',
      day: 172,
      hours: [9.5, 9.9],
      seconds: 26,
      fov: [66, 74],
      shift: 0.45,
      walk: true,
      from: axis(46, 1.65),
      to: axis(-30, 1.65),
      look: [axis(-8, 18), axis(-60, 30)],
    }),
    dolly({
      title: 'Down the nave',
      day: 262,
      hours: [15.9, 16.4],
      seconds: 24,
      fov: 64,
      shift: 0.9,
      walk: true,
      from: [3.4, 1.65, 20],
      to: [2.6, 1.65, -2],
      look: [
        [1.2, 9, -34],
        [1.2, 14, -42],
      ],
    }),
    dolly({
      title: 'The Passion glazing, four o’clock',
      day: 262,
      hours: [15.7, 16.3],
      seconds: 16,
      fov: 62,
      shift: 1,
      walk: true,
      from: [8.5, 1.65, 6.5],
      to: [5, 1.65, 3.4],
      look: [-9.4, 13, -2],
    }),
    dolly({
      title: 'The wash on the vault',
      day: 352,
      hours: [14.8, 15.2],
      seconds: 14,
      fov: 47,
      shift: 0,
      walk: true,
      from: [-1, 1.65, -4],
      to: [-3, 1.65, -4],
      look: [
        [-20, 34, -4],
        [-20, 52, -4],
      ],
    }),
    spin({
      title: 'The vault, from below',
      day: 172,
      hours: [9.8, 10.3],
      seconds: 20,
      fov: 74,
      shift: 0,
      walk: true,
      at: [1.18, 1.65, -26.25],
      rise: 6,
      yaw: [1.2, 1.9],
    }),
    dolly({
      title: 'Into the apse',
      day: 172,
      hours: [10, 10.4],
      seconds: 18,
      fov: 70,
      shift: 0.5,
      walk: true,
      from: [0, 1.65, -30],
      to: [0, 1.65, -40],
      look: [0, 44, -60],
    }),
    dolly({
      title: 'Evening at the crossing',
      day: 172,
      hours: [19.1, 20.3],
      seconds: 26,
      fov: 74,
      shift: 0.5,
      walk: true,
      from: [8, 1.65, -26.25],
      to: [4.5, 1.65, -26.25],
      look: [-24, 19, -26.25],
    }),
    dolly({
      title: 'The Glory front',
      day: 110,
      hours: [12.8, 13.5],
      seconds: 18,
      fov: 70,
      shift: 0.3,
      from: [30, 0.3, 124],
      to: [22, 7, 114],
      look: [
        [-4, 88, -10],
        [-4, 76, -10],
      ],
    }),
  ]
}

export class Film {
  /** Told when the film starts and when it lets go. */
  onChange: ((playing: boolean) => void) | null = null

  private list: Shot[] = []
  private index = 0
  private elapsed = 0
  private on = false

  private readonly layer: HTMLElement
  private readonly dissolve: HTMLCanvasElement
  private readonly caption: HTMLElement
  private readonly title: HTMLElement
  private readonly when: HTMLElement
  private readonly hint: HTMLElement
  private hintTimer = 0

  private readonly frame: Frame = { position: new THREE.Vector3(), target: new THREE.Vector3() }
  /** The walker's standing height, eased, so a step is climbed and not hit. */
  private standing = 0
  private lastHour = Number.NaN
  private captionOn = false
  private said = ''

  /** Any hand on anything, and the film lets go. */
  private readonly interrupt = (): void => {
    if (this.on) this.stop()
  }

  constructor(
    private readonly viewer: Viewer,
    private readonly host: HTMLElement,
    private readonly sun: SunSetting,
    private readonly applySun: () => void,
    /**
     * Draw the frame as it stands and hand back the canvas it was drawn to.
     * The drawing buffer does not survive to the next task, so the copy the
     * dissolve takes has to be made in the same breath as the render.
     */
    private readonly capture: () => HTMLCanvasElement | null,
  ) {
    this.layer = el('div', 'film-layer')
    this.layer.append(el('div', 'film-bar top'), el('div', 'film-bar bottom'))
    this.dissolve = document.createElement('canvas')
    this.dissolve.className = 'film-dissolve'
    this.dissolve.width = 2
    this.dissolve.height = 2
    this.caption = el('div', 'film-caption')
    this.title = el('h2', 'film-title')
    this.when = el('p', 'film-when')
    this.caption.append(this.title, this.when)
    this.hint = el('div', 'film-hint')
    this.hint.innerHTML = '<strong>click</strong>, or press any key, to stop'
    this.layer.append(this.dissolve, this.caption, this.hint)
    this.host.append(this.layer)
  }

  get playing(): boolean {
    return this.on
  }

  get shot(): Shot {
    return this.list[this.index]!
  }

  /** The shots as they will play, for the harness. */
  get shots(): readonly Shot[] {
    return this.list
  }

  play(): void {
    if (this.on) return
    this.list = shots(this.viewer)
    if (this.list.length === 0) return
    this.on = true
    this.viewer.possess(true)
    this.host.classList.add('film')
    // Capture, so a press anywhere — the canvas, the panel, a control the
    // interface has not yet hidden — reaches this before it reaches anything
    // that would act on it; and then it is still delivered, so the drag that
    // stopped the film is also the drag that turns the building.
    window.addEventListener('pointerdown', this.interrupt, true)
    window.addEventListener('wheel', this.interrupt, true)
    this.black()
    this.begin(0)
    this.hint.classList.add('on')
    window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hint.classList.remove('on'), HINT_MS)
    this.onChange?.(true)
  }

  stop(): void {
    if (!this.on) return
    this.on = false
    window.removeEventListener('pointerdown', this.interrupt, true)
    window.removeEventListener('wheel', this.interrupt, true)
    this.host.classList.remove('film')
    this.caption.classList.remove('on')
    this.captionOn = false
    this.hint.classList.remove('on')
    window.clearTimeout(this.hintTimer)
    this.dissolve.style.transition = 'none'
    this.dissolve.style.opacity = '0'
    this.viewer.possess(false)
    // Handed over where it stands. The viewer works out from the position
    // whether this is a room to walk or a building to turn, and takes the
    // lens the shot had as its own — the same as arriving by a link.
    this.viewer.setState(this.viewer.getState())
    this.onChange?.(false)
  }

  /** Cut straight to a shot. The harness's way of looking at one. */
  go(index: number): void {
    if (!this.on) this.play()
    this.hold()
    this.begin(index)
  }

  update(dt: number): void {
    if (!this.on) return
    this.elapsed += dt
    const shot = this.shot
    if (this.elapsed >= shot.seconds) {
      this.hold()
      this.begin(this.index + 1)
      return
    }
    const t = this.elapsed / shot.seconds
    this.pose(t, dt)

    const show = this.elapsed > CAPTION_IN && shot.seconds - this.elapsed > CAPTION_OUT
    if (show !== this.captionOn) {
      this.captionOn = show
      this.caption.classList.toggle('on', show)
    }
    const line = `${dayLabel(YEAR, shot.day)} · ${clock(this.sun.hour)}`
    if (line !== this.said) {
      this.said = line
      this.when.textContent = line
    }
  }

  /** Start a shot from its first frame, with its own day on the clock. */
  private begin(index: number): void {
    this.index = ((index % this.list.length) + this.list.length) % this.list.length
    this.elapsed = 0
    this.lastHour = Number.NaN
    const shot = this.shot
    this.sun.dayOfYear = shot.day
    this.title.textContent = shot.title
    this.caption.classList.remove('on')
    this.captionOn = false
    this.pose(0, null)
  }

  /**
   * Put the camera and the clock where the shot has them at `t`.
   *
   * `dt` is null on the first frame of a shot, which is the one frame where
   * the standing height snaps and the sun is set regardless of how far it
   * moved: a cut is a cut.
   */
  private pose(t: number, dt: number | null): void {
    const shot = this.shot
    const rig = this.viewer.rig
    shot.frame(soft(t), this.frame)
    const p = this.frame.position

    const hour = THREE.MathUtils.lerp(shot.hours[0], shot.hours[1], t)
    if (dt === null || Math.abs(hour - this.lastHour) >= SUN_STEP) {
      this.sun.hour = hour
      this.lastHour = hour
      this.applySun()
    }

    if (shot.walk) {
      const e = this.viewer.envelope
      const floor = e?.floorAt(p.x, p.z)
      const wanted = (floor ?? 0) + p.y
      this.standing =
        dt === null ? wanted : THREE.MathUtils.lerp(this.standing, wanted, 1 - Math.exp(-dt * 6))
      p.y = this.standing
      e?.resolve(p, BODY_RADIUS)
    }

    const fov = Array.isArray(shot.fov)
      ? THREE.MathUtils.lerp(shot.fov[0], shot.fov[1], t)
      : shot.fov
    rig.fov = this.viewer.widen(fov)
    rig.shiftCorrection = shot.shift
    rig.position.copy(p)
    rig.lookAt(this.frame.target)
  }

  /** Keep the frame just drawn, and let it go over the next one. */
  private hold(): void {
    const src = this.capture()
    if (!src || src.width === 0 || src.height === 0) return
    const c = this.dissolve
    if (c.width !== src.width || c.height !== src.height) {
      c.width = src.width
      c.height = src.height
    }
    c.getContext('2d')?.drawImage(src, 0, 0)
    this.fade(DISSOLVE_MS)
  }

  /** Open from black. */
  private black(): void {
    const c = this.dissolve
    c.width = 2
    c.height = 2
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, 2, 2)
    }
    this.fade(OPEN_MS)
  }

  private fade(ms: number): void {
    const c = this.dissolve
    c.style.transition = 'none'
    c.style.opacity = '1'
    // A reflow between the two, so the jump to opaque is not itself eased.
    void c.offsetWidth
    c.style.transition = `opacity ${ms}ms ease`
    c.style.opacity = '0'
  }
}

function clock(hour: number): string {
  const h = Math.floor(hour)
  const m = Math.floor((hour - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}
