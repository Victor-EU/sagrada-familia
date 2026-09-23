import * as THREE from 'three'
import type { Viewer } from '../camera/viewer.ts'
import { BODY_RADIUS, type Doorway } from '../camera/envelope.ts'
import { YEAR, dayLabel, sameLight } from '../light/sun.ts'

/**
 * The film.
 *
 * Everything else in this app asks something of the viewer: turn it, come
 * closer, find the door, walk. This asks nothing. Press play and the camera
 * goes round the building and in, the way a film would — and the sun moves
 * inside every shot, because the one thing nothing else in this building can
 * show is the light *changing*.
 *
 * It is one day. Dawn across the pond, the Glory front in the first sun, in
 * by the Nativity door as the morning arrives, the vault, the east glazing
 * lit mid-morning, the nave at noon, the west glazing in the late afternoon,
 * the crossing as the evening goes — from a camera that stands still for it,
 * because that is the shot where the light is the subject and a camera moving
 * across it was competing — and out under the Passion front in the last sun,
 * to rise away as it sets. The clock only ever goes forward. It used to jump:
 * nine shots from four seasons and seven jumps of the clock in forty-five
 * seconds, which was a film about the light changing in which the light
 * mostly teleported. Midsummer, and the second time round, midwinter, on the
 * same path at the same fraction of the day — this building's two glazings
 * face the summer sunrise and the winter sunset, and that is one argument
 * told on two days.
 *
 * A cut is a new exposure. The walker's pupil, which takes a second to catch
 * up when you cross a threshold, was running under these shots and turning
 * each interior one into a fade of a stop and a half; the film now sets the
 * stop at every cut, lets the meter take it where it wants under the
 * dissolve, and eases it only slowly after that — and looks two seconds
 * ahead through a door, so the pupil opens on the way in rather than in the
 * dark.
 *
 * The moment a hand touches anything it lets go, leaving the camera exactly
 * where the film had it — a walker if that is indoors, an orbit if it is not
 * — with the clock at whatever hour the shot had reached. A film that ended
 * by putting you back where you started would be a screensaver. This one
 * ends by handing you the building at the moment you reached for it. A
 * screen in a corner, started from the address, gets it back on its own.
 *
 * The shots are authored, dissolved, and looped. The coordinates are not
 * invented: every one is a frame verified in the harness (dev/viewpoints.ts)
 * or a move along one axis from one, because a camera placed by eye in a
 * building this shape ends up inside a pier.
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
  /**
   * The hour the shot opens on and the hour it closes on, on the summer day.
   * On the winter loop they are moved to the same fraction of that day's
   * light — see `sameLight`.
   */
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

export interface FilmOptions {
  /**
   * Started from the address, for a screen in a corner. Stopped by a hand,
   * it comes back on its own once the hand has been gone a while.
   */
  kiosk?: boolean
}

/** The day the film is set on, and the day it plays the second time round. */
export const SUMMER = 172
export const WINTER = 355
const DAYS = [SUMMER, WINTER]

/** How long one frame gives way to the next. */
const DISSOLVE_MS = 900
/** And how long the first one takes to arrive out of black. */
const OPEN_MS = 1600
/**
 * How far the hour moves before the sun is recomputed.
 *
 * A change of sun re-runs the shadow maps and rebuilds the sky probe, which
 * is not something to do sixty times a second. Two minutes of sun is a third
 * of a degree, which no shadow edge in the building shows, and at the pace
 * these shots run the clock it is a relight between three and eight times a
 * second. What that costs is now the pacer's business and the scene's — the
 * two shadow passes go on consecutive frames, and the pacer leaves those
 * frames out — rather than the film's.
 */
const SUN_STEP = 0.03
/** When the caption comes and goes, in seconds from either end of a shot. */
const CAPTION_IN = 0.7
const CAPTION_OUT = 1.0
/**
 * The caption's clock, in hours: ten minutes. The sun runs at eight minutes a
 * second here, and a counter turning over eight times a second under a serif
 * title is a flicker, not a time.
 */
const CLOCK_STEP = 10 / 60
/** How long the one instruction stays up. */
const HINT_MS = 7000
/** How far ahead the pupil looks, in seconds, for a door: the Nativity porch is ten metres deep. */
const LEAD = 3.5
/**
 * Seconds for the pupil to settle: onto the meter's reading of a new frame,
 * under the dissolve, where a jump cannot be seen; through a door; and
 * otherwise, which is a drift and not an adaptation.
 */
const PUPIL_CUT = 0.12
const PUPIL_FRESH = 0.8
const PUPIL_CROSS = 0.8
const PUPIL_DRIFT = 1.5
/** A kiosk untouched for this long after being stopped goes back to the film. */
const RESUME_MS = 75_000
const ACTIVITY = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

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

function span(v: number | [number, number], t: number): number {
  return Array.isArray(v) ? THREE.MathUtils.lerp(v[0], v[1], t) : v
}

interface ShotBase {
  title: string
  hours: [number, number]
  seconds: number
  fov: number | [number, number]
  shift: number
  walk?: boolean
}

/** A straight move, looking at a point or sliding between two. Or a stand. */
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

/** A turn about the building, in degrees of azimuth, at a radius and a height that may each change. */
function orbit(
  spec: ShotBase & {
    centre: [number, number]
    radius: number | [number, number]
    height: number | [number, number]
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
      const r = span(radius, t)
      out.position.set(centre[0] + Math.sin(a) * r, span(height, t), centre[1] + Math.cos(a) * r)
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
 * The shots: one day, in the order the day has them.
 *
 * Seventy seconds, ten shots. A little over a minute is where a loop that
 * anybody can leave stops needing to hurry; what it needs instead is for
 * nothing in it to be dead. So no shot moves slower than a walk and none of
 * the walks is a sprint — the door is taken at three metres a second, which
 * is a hurry and not a run, where it was taken at nine — the sun crosses
 * every shot fast enough to be watched moving, the crossing at evening is
 * given eleven seconds and a camera that does not move, and the whole thing
 * ends rising away from the building as the sun goes down.
 *
 * The orbit is lower and closer than it was — it framed two thirds flat
 * Eixample with the building a model in the middle of it, which is the
 * least finished part of the model given the widest shot — and the Passion
 * front is aimed lower, for the porch rather than the sky over it. The
 * approach to the door starts sixteen metres out rather than twenty-eight
 * with the aim already up the portal, so the carving is passed under the
 * frame and the threshold is the vault opening, not a black porch.
 */
export function shots(viewer: Viewer): Shot[] {
  const door = nativityDoor(viewer)
  /** A point on the door's own axis, `d` metres outside it. */
  const axis = (d: number, y: number): Vec => [door.x + door.nx * d, y, door.z + door.nz * d]

  return [
    dolly({
      title: 'Across the pond',
      hours: [6.8, 8.4],
      seconds: 6,
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
      title: 'The door',
      hours: [9.5, 9.85],
      seconds: 8,
      fov: [64, 76],
      shift: 0.45,
      walk: true,
      from: axis(22, 1.65),
      to: axis(-10, 1.65),
      look: [axis(-6, 24), axis(-60, 32)],
    }),
    dolly({
      title: 'The Nativity glazing, mid-morning',
      hours: [9.9, 10.3],
      seconds: 5,
      fov: 62,
      shift: 0.4,
      // A head above the floor, on the harness's own frame of the cool half
      // of the building answering — midsummer is the best incidence the
      // year offers this glazing, which faces the sunrise at forty-five
      // degrees and never takes a square sun.
      from: [-6.5, 5, 7.5],
      to: [-6.5, 5, 1.5],
      look: [9.4, 2, -1],
    }),
    spin({
      title: 'The vault, from below',
      hours: [10.3, 10.8],
      seconds: 5,
      fov: 74,
      shift: 0,
      walk: true,
      at: [1.18, 1.65, -26.25],
      rise: 6,
      yaw: [1.2, 1.9],
    }),
    dolly({
      title: 'The Glory front, midday',
      hours: [12.4, 13.0],
      seconds: 5,
      fov: 70,
      shift: 0.3,
      // Out for the middle of the day, which the room spends flat: swept
      // hour by hour, the nave is grey from eleven to one and only warms
      // when the Passion side takes the sun. The front that faces south-east
      // is square to it now.
      from: [30, 0.3, 124],
      to: [22, 7, 114],
      look: [
        [-4, 88, -10],
        [-4, 76, -10],
      ],
    }),
    dolly({
      title: 'Down the nave, afternoon',
      hours: [15.0, 16.0],
      seconds: 6,
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
      title: 'The Passion glazing, late afternoon',
      hours: [16.6, 17.6],
      seconds: 5,
      fov: 62,
      shift: 1,
      walk: true,
      from: [8.5, 1.65, 6.5],
      to: [5, 1.65, 3.4],
      look: [-9.4, 13, -2],
    }),
    dolly({
      title: 'Evening at the crossing',
      hours: [19.0, 20.5],
      seconds: 10,
      fov: 74,
      shift: 0.5,
      walk: true,
      // Still. Ninety minutes of the sun going down through the Passion
      // glass, from the spot both visits called the best thing in the model.
      from: [5.5, 1.65, -26.25],
      to: [5.5, 1.65, -26.25],
      look: [-24, 19, -26.25],
    }),
    dolly({
      title: 'Under the Passion front',
      hours: [20.5, 20.95],
      seconds: 5,
      fov: 64,
      shift: 0,
      // The author's own frame of this front, walked up to, in the last of
      // the sun — which is low in the north-west by now and rakes it.
      from: [-76, 1.6, -33],
      to: [-68, 1.6, -30],
      look: [-44, 58, -30],
    }),
    orbit({
      title: 'Round the building, sunset',
      hours: [20.95, 21.6],
      seconds: 8,
      fov: 46,
      shift: 0.3,
      centre: [0, -19],
      radius: [190, 250],
      height: [58, 92],
      from: -60,
      to: 100,
      look: [0, 66, -19],
    }),
  ]
}

export class Film {
  /** Told when the film starts and when it lets go. */
  onChange: ((playing: boolean) => void) | null = null

  private list: Shot[] = []
  private index = 0
  /** How many times round: even is summer, odd is winter. */
  private loop = 0
  private elapsed = 0
  private on = false
  private readonly kiosk: boolean
  private resumeTimer = 0

  private readonly layer: HTMLElement
  private readonly dissolve: HTMLCanvasElement
  private readonly caption: HTMLElement
  private readonly title: HTMLElement
  private readonly when: HTMLElement
  private readonly hint: HTMLElement
  private hintTimer = 0

  private readonly frame: Frame = { position: new THREE.Vector3(), target: new THREE.Vector3() }
  /** The same shot a couple of seconds on, for the pupil. */
  private readonly next: Frame = { position: new THREE.Vector3(), target: new THREE.Vector3() }
  /** The walker's standing height, eased, so a step is climbed and not hit. */
  private standing = 0
  private lastHour = Number.NaN
  /** Seconds left in which the pupil is still finding the new frame's stop. */
  private fresh = 0
  /** The meter's count at the cut; its reading is of the new frame two on. */
  private cutReadings = 0
  private captionOn = false
  private said = ''

  /** Any hand on anything, and the film lets go. */
  private readonly interrupt = (): void => {
    if (this.on) this.stop()
  }

  /** A hand on the kiosk: the wait starts again. */
  private readonly touched = (): void => {
    if (this.resumeTimer) this.armResume()
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
    options: FilmOptions = {},
  ) {
    this.kiosk = options.kiosk ?? false
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
    this.hint.innerHTML =
      '<span class="pointer"><strong>click</strong>, or press any key, to stop</span>' +
      '<span class="touch"><strong>tap</strong> to stop</span>'
    this.layer.append(this.dissolve, this.caption, this.hint)
    this.host.append(this.layer)
    if (this.kiosk) {
      for (const type of ACTIVITY) window.addEventListener(type, this.touched, { passive: true })
    }
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

  /** The day this time round is on. */
  get day(): number {
    return DAYS[this.loop % DAYS.length]!
  }

  play(): void {
    if (this.on) return
    this.list = shots(this.viewer)
    if (this.list.length === 0) return
    this.on = true
    window.clearTimeout(this.resumeTimer)
    this.resumeTimer = 0
    this.loop = 0
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
    // lens the shot had as its own — the same as arriving by a link. The
    // stop stays where the film had it too, and the walker's own pupil
    // takes it from there, rather than the frame jumping under the hand.
    const stop = this.viewer.eyeStop
    this.viewer.setState(this.viewer.getState())
    this.viewer.eyeStop = stop
    this.onChange?.(false)
    this.armResume()
  }

  /** Cut straight to a shot, on the summer or the winter loop. The harness's way of looking at one. */
  go(index: number, loop?: number): void {
    if (!this.on) this.play()
    if (loop !== undefined) this.loop = loop
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
    const line = `${dayLabel(YEAR, this.day)} · ${clock(this.sun.hour)}`
    if (line !== this.said) {
      this.said = line
      this.when.textContent = line
    }
  }

  /** Start a shot from its first frame. Past the last one, it is the next time round. */
  private begin(index: number): void {
    const n = this.list.length
    if (index >= n) this.loop += Math.floor(index / n)
    this.index = ((index % n) + n) % n
    this.elapsed = 0
    this.lastHour = Number.NaN
    this.sun.dayOfYear = this.day
    this.title.textContent = this.shot.title
    this.caption.classList.remove('on')
    this.captionOn = false
    this.pose(0, null)
  }

  /** The clock at `t` through the current shot, on the day this loop is on. */
  private hourAt(t: number): number {
    const shot = this.shot
    const h = THREE.MathUtils.lerp(shot.hours[0], shot.hours[1], t)
    return this.day === SUMMER ? h : sameLight(h, SUMMER, this.day)
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

    const hour = this.hourAt(t)
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

    rig.fov = this.viewer.widen(span(shot.fov, t))
    rig.shiftCorrection = shot.shift
    rig.position.copy(p)
    rig.lookAt(this.frame.target)

    this.pupil(t, dt)
  }

  /**
   * The stop.
   *
   * A cut is a new exposure: the stop for this side of the wall at once, and
   * the meter's opinion of the new frame within a few frames after, under
   * the dissolve, where the jump cannot be seen. After that it drifts, over
   * a second and a half, which on a shot where the sun goes down is a ramp
   * and not a flicker. And it looks ahead: where a walk will be in two
   * seconds is the other side of a door, the pupil opens now, on the way
   * through the porch, not in the dark on the far side of it.
   */
  private pupil(t: number, dt: number | null): void {
    const viewer = this.viewer
    const here = viewer.indoors
    if (dt === null) {
      viewer.eyeStop = viewer.stopFor(here)
      this.fresh = PUPIL_FRESH
      this.cutReadings = viewer.meterReadings
      return
    }
    let ahead = here
    const e = viewer.envelope
    const shot = this.shot
    if (e && shot.walk) {
      shot.frame(soft(Math.min(1, t + LEAD / shot.seconds)), this.next)
      const q = this.next.position
      ahead = e.inside(q.x, q.z) && (e.floorAt(q.x, q.z) ?? 0) + q.y < e.ceiling
    }
    let target: number
    let rate: number
    if (ahead !== here) {
      target = viewer.stopFor(ahead)
      rate = PUPIL_CROSS
    } else if (this.fresh > 0) {
      // Under the dissolve. The meter's first reading after a cut is still
      // of the frame before it — it was asked for before the cut and came
      // back after — so the stop holds until a reading of this frame is in,
      // and then goes straight to it.
      this.fresh -= dt
      if (viewer.meterReadings < this.cutReadings + 2) return
      target = viewer.pupilTarget(true)
      rate = PUPIL_CUT
    } else {
      target = viewer.pupilTarget(true)
      rate = PUPIL_DRIFT
    }
    viewer.eyeStop += (target - viewer.eyeStop) * (1 - Math.exp(-dt / rate))
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

  /**
   * The kiosk's way back. Stopped by a hand, wait until the hand has been
   * gone a while, then play again — unless a flight is under way, in which
   * case wait again; somebody is still there.
   */
  private armResume(): void {
    if (!this.kiosk) return
    window.clearTimeout(this.resumeTimer)
    this.resumeTimer = window.setTimeout(() => {
      this.resumeTimer = 0
      if (this.on) return
      if (this.viewer.travelling) this.armResume()
      else this.play()
    }, RESUME_MS)
  }
}

/** A wall clock, to the step the caption keeps. */
function clock(hour: number): string {
  const shown = Math.floor(hour / CLOCK_STEP + 1e-6) * CLOCK_STEP
  const h = Math.floor(shown)
  const m = Math.round((shown - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}
