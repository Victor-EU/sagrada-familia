import * as THREE from 'three'
import type { Relation, Viewer } from '../camera/viewer.ts'
import { YEAR, dayLabel, daylight, sameLight } from '../light/sun.ts'
import type { Film } from './film.ts'

/**
 * The interface, such as it is.
 *
 * One job: say what you can do here, and get out of the way. There is no
 * title card to dismiss, no tour to start or escape from, and no rail of
 * numbered stops — the building opens on the building, and everything below
 * is drawn over it and takes no pixel away from it.
 *
 * What is left is four things, each of which exists because the viewer would
 * otherwise have to be told something:
 *
 *  - the **way in**, pinned to an actual door, because a building you cannot
 *    find the door of is a photograph;
 *  - the **way out**, for the same reason in reverse;
 *  - a **line of controls** that says what the cursor does *here*, and
 *    changes when what it does changes;
 *  - the **clock**, because every photograph of this interior is a photograph
 *    of light at a particular moment, and the one thing worth handing
 *    somebody is the ability to move it. An hour on a scrubber, and a day on
 *    a press — this building's two glazings face the summer sunrise and the
 *    winter sunset, so a model with no winter in it is missing half its
 *    argument.
 *
 * And a fifth, which is the opposite of the other four: **the film**. Every
 * control above asks the viewer to do something. This one is for the viewer
 * who would rather be shown — press it and the camera goes round the
 * building and in on its own, the sun moving in every shot, until a hand
 * touches anything. See ui/film.ts. While it runs, the other four go, because
 * a film with a scrubber on it is a player and not a film.
 */
export interface SunSetting {
  dayOfYear: number
  hour: number
}

/** Where the day starts and ends on the scrubber, Barcelona wall clock. */
const FIRST_HOUR = 6
const LAST_HOUR = 21

/**
 * The four days worth standing in this building on.
 *
 * The hour has been a control since phase five and the day has only ever been
 * reachable by editing the link, which means that in practice nobody has ever
 * seen this building in winter. That is the half of the sun that matters most
 * here: Barcelona's solstices are 47 degrees apart in altitude, the Nativity
 * glazing faces the summer sunrise and the Passion glazing the winter sunset,
 * and the two are the whole argument of the plan. Four dates rather than a
 * second scrubber, because no one wants the fourteenth of August — they want
 * midsummer, midwinter, and the two days the sun rises due east.
 */
const DAYS = [80, 172, 264, 355]

/**
 * The same light on another day, on the scrubber's own terms: to a tenth of
 * an hour, and never off the track. The reasoning is with `sameLight` in
 * light/sun.ts — it lived here until the film wanted it too.
 */
function sameHour(hour: number, from: number, to: number): number {
  return THREE.MathUtils.clamp(
    Math.round(sameLight(hour, from, to) * 10) / 10,
    FIRST_HOUR,
    LAST_HOUR,
  )
}

/** How far over a door the way-in marker floats. */
const MARKER_HEIGHT = 8

/**
 * The mark on the floor where a click will walk to, in metres across and in
 * points round. About a stride near to: big enough to read as a place to
 * stand, small enough to say which flagstone. Further off it grows with the
 * distance — MARK_SPREAD of it — because a stride twenty metres away, seen
 * along the floor, is a sliver ten pixels wide.
 */
const MARK_RADIUS = 0.45
const MARK_SPREAD = 0.04
const MARK_POINTS = 36
const SVG = 'http://www.w3.org/2000/svg'

export class Controls {
  private readonly root: HTMLElement
  private readonly way: HTMLButtonElement
  private readonly out: HTMLButtonElement
  private readonly hint: HTMLElement
  private readonly clock: HTMLElement
  private readonly dial: HTMLInputElement
  private readonly hourLabel: HTMLElement
  private readonly dayButton: HTMLButtonElement
  private readonly play: HTMLButtonElement
  private readonly floorMark: SVGSVGElement
  private readonly floorRing: SVGPolygonElement

  private readonly point = new THREE.Vector3()
  private hintTimer = 0
  /** The day the scrubber's daylight was last drawn for. */
  private shaded = -1
  /** Where a mouse is resting over the stage, if one is. */
  private hover: { x: number; y: number } | null = null

  constructor(
    private readonly viewer: Viewer,
    private readonly host: HTMLElement,
    private readonly sun: SunSetting,
    private readonly applySun: () => void,
    private readonly film: Film,
  ) {
    this.root = el('div', 'ui')

    this.play = el('button', 'play') as HTMLButtonElement
    this.play.type = 'button'
    this.play.innerHTML = '<span class="mark"></span><span>Watch the film</span>'
    this.play.title =
      'Sit back: the camera goes round the building and in, and the sun moves. ' +
      'Any key or click stops it. (K)'
    this.play.addEventListener('click', () => {
      this.play.blur()
      this.film.play()
    })
    film.onChange = (playing) => {
      this.root.classList.toggle('film', playing)
      // Handed back: say what the cursor does wherever the film left you,
      // because it may be a different side of the wall from where it began.
      if (!playing) this.say(this.viewer.mode)
    }

    this.way = el('button', 'way') as HTMLButtonElement
    this.way.type = 'button'
    this.way.innerHTML = '<span class="ring"></span><span class="label">Go inside</span>'
    this.way.addEventListener('click', () => {
      this.way.blur()
      this.viewer.enter()
    })

    // The guaranteed one. The marker above is pinned to a door and therefore
    // only exists while a door is in shot — orbit round to the apse, which
    // has none, and the only way in would otherwise be to find your way back.
    // A control in the corner is never the delightful answer and is always
    // the findable one, so it is here whenever the delightful one is not.
    this.out = el('button', 'out') as HTMLButtonElement
    this.out.type = 'button'
    this.out.addEventListener('click', () => {
      this.out.blur()
      if (this.viewer.mode === 'inhabit') this.viewer.stepOut()
      else this.viewer.enter()
    })

    this.hint = el('div', 'hint-line')

    this.clock = el('div', 'clock')
    this.dayButton = el('button', 'day') as HTMLButtonElement
    this.dayButton.type = 'button'
    this.dayButton.title = 'Midsummer, midwinter, and the two equinoxes'
    this.dayButton.addEventListener('click', () => {
      // On round the four. From anywhere else — the panel can set any day of
      // the year — the next one after wherever it stands. And the hour with
      // it, to the same light on the new day — see `sameLight`.
      const here = this.sun.dayOfYear
      const next = DAYS.find((d) => d > here) ?? DAYS[0]!
      this.sun.hour = sameHour(this.sun.hour, here, next)
      this.sun.dayOfYear = next
      this.dayButton.blur()
      this.applySun()
      this.showHour()
    })
    this.hourLabel = el('span', 'hour')
    this.dial = document.createElement('input')
    this.dial.type = 'range'
    this.dial.min = String(FIRST_HOUR)
    this.dial.max = String(LAST_HOUR)
    this.dial.step = '0.1'
    this.dial.setAttribute('aria-label', 'Hour of the day')
    this.dial.addEventListener('input', () => {
      this.sun.hour = Number(this.dial.value)
      this.applySun()
      this.showHour()
    })
    // A range keeps the focus after a drag, and a focused input swallows the
    // keys: every letter goes to the field instead of the building, so the
    // one control a visitor is most likely to touch first was also the one
    // that silently stopped W A S D from walking. The buttons already give
    // the focus back the moment they are done with it; so does this.
    this.dial.addEventListener('change', () => this.dial.blur())
    this.clock.append(this.dayButton, this.hourLabel, this.dial)

    // The mark on the floor. Drawn, not rendered: it is the interface
    // saying where a click goes, like the ring on the door, and it has no
    // business in the shadow maps, the wash rig or the air.
    this.floorMark = document.createElementNS(SVG, 'svg')
    this.floorMark.classList.add('floor-mark')
    this.floorMark.setAttribute('aria-hidden', 'true')
    this.floorRing = document.createElementNS(SVG, 'polygon')
    this.floorMark.append(this.floorRing)
    // Only a mouse hovers. A finger is on the glass or it is not, so on a
    // touch screen the mark shows where a tap is walking to and nothing else.
    host.addEventListener('pointermove', (event) => {
      const over = event.target instanceof Element && event.target.closest('button')
      this.hover =
        event.pointerType === 'mouse' && !over ? { x: event.clientX, y: event.clientY } : null
    })
    host.addEventListener('pointerleave', () => {
      this.hover = null
    })

    this.root.append(this.floorMark, this.way, this.out, this.hint, this.clock, this.play)
    this.host.append(this.root)

    this.showHour()

    viewer.onRelation = (relation) => this.say(relation)
    viewer.onTravel = (travelling) => {
      this.root.classList.toggle('travelling', travelling)
      // The line is hidden for the length of a flight, and a flight in
      // through a door is most of the nine seconds it is given — so what the
      // cursor does in the room was on screen for about two seconds after
      // landing, which nobody read. Said again on arrival, with its full
      // time.
      if (!travelling) this.say(this.viewer.mode)
    }
  }

  /**
   * Start saying things.
   *
   * Called on the first frame that is actually drawn, not when the interface
   * is built: the building takes seconds to generate, the page is blank
   * while it does, and a line of controls whose nine seconds ran out under a
   * blank page was never seen by anybody.
   */
  begin(): void {
    this.say(this.viewer.mode)
  }

  /** Put the hour the sun is actually at back on the dial. */
  showHour(): void {
    this.dayButton.textContent = dayLabel(YEAR, this.sun.dayOfYear)
    const h = Math.floor(this.sun.hour)
    const m = Math.round((this.sun.hour - h) * 60)
    this.hourLabel.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    if (document.activeElement !== this.dial) this.dial.value = String(this.sun.hour)
    if (this.shaded !== this.sun.dayOfYear) this.shadeDaylight()
  }

  /**
   * Draw the day on the scrubber: bright between sunrise and sunset, dim
   * outside it.
   *
   * The track was one even line from six to nine, which says nothing about
   * where the light is — and in December six of those fifteen hours are dark.
   * A viewer dragging into the night should see that they are about to, not
   * find out when the building goes black.
   */
  private shadeDaylight(): void {
    this.shaded = this.sun.dayOfYear
    const { rise, set } = daylight(YEAR, this.sun.dayOfYear)
    const at = (hour: number): string =>
      `${(THREE.MathUtils.clamp((hour - FIRST_HOUR) / (LAST_HOUR - FIRST_HOUR), 0, 1) * 100).toFixed(1)}%`
    this.dial.style.setProperty('--rise', at(rise))
    this.dial.style.setProperty('--set', at(set))
  }

  /**
   * Follow the door round the building.
   *
   * Called every frame because it has to be: the marker is pinned to a place
   * in the world, and in an orbit the world is what moves.
   */
  update(): void {
    // The dial is not the only thing that moves the sun — the parameter
    // panel sets the hour directly — so the reading is
    // refreshed from the sun rather than remembered from the last drag.
    this.showHour()
    this.markFloor()
    const inside = this.viewer.mode === 'inhabit'
    const outside = !inside && !this.viewer.travelling && !this.film.playing
    this.root.classList.toggle('inside', inside)
    this.out.textContent = inside ? 'Step outside' : 'Go inside'
    if (!outside) {
      this.way.classList.remove('on')
      this.root.classList.toggle('stranded', false)
      return
    }

    const door = this.viewer.bestDoor()
    if (!door) {
      this.way.classList.remove('on')
      this.root.classList.toggle('stranded', true)
      return
    }

    const rect = this.host.getBoundingClientRect()
    this.point.set(door.x, MARKER_HEIGHT, door.z).project(this.viewer.rig.camera)
    // Behind the camera, or outside the frame with a margin for the label.
    // A generous margin across, because the label hangs off the ring to the
    // right and a door near the edge of a narrow window is still a door.
    if (this.point.z > 1 || Math.abs(this.point.x) > 0.94 || Math.abs(this.point.y) > 0.9) {
      this.way.classList.remove('on')
      this.root.classList.toggle('stranded', true)
      return
    }
    this.way.style.left = `${(this.point.x * 0.5 + 0.5) * rect.width}px`
    this.way.style.top = `${(-this.point.y * 0.5 + 0.5) * rect.height}px`
    this.way.classList.add('on')
    this.root.classList.toggle('stranded', false)
  }

  /**
   * Where a click on the floor goes.
   *
   * Clicking the floor is the main way across this room, and the only one a
   * phone has, and the line saying so is on screen for nine seconds after you
   * land. Past that the cursor was a plain arrow over a plain floor and
   * nothing anywhere said the floor would do anything. So the floor answers
   * the cursor: a ring where the walk would end — pulled back to the wall
   * under a window, absent over the vault — and, once clicked, the same ring
   * staying where you are going until you are there.
   */
  private markFloor(): void {
    const v = this.viewer
    let at: THREE.Vector3 | null = null
    let going = false
    if (v.mode === 'inhabit' && !v.travelling && !this.film.playing) {
      at = v.destination
      going = at !== null
      if (!at && this.hover && !this.host.classList.contains('dragging')) {
        at = v.walkTarget(this.hover.x, this.hover.y)
      }
    }
    if (!at) {
      this.floorMark.classList.remove('on')
      return
    }

    const rect = this.host.getBoundingClientRect()
    const camera = v.rig.camera
    const eye = v.rig.position
    const radius = Math.max(MARK_RADIUS, Math.hypot(at.x - eye.x, at.z - eye.z) * MARK_SPREAD)
    const points: string[] = []
    for (let i = 0; i < MARK_POINTS; i++) {
      const a = (i / MARK_POINTS) * Math.PI * 2
      this.point
        .set(at.x + Math.cos(a) * radius, at.y + 0.02, at.z + Math.sin(a) * radius)
        .project(camera)
      // Any of it behind the eye and the ring is not a ring on screen.
      if (this.point.z > 1) {
        this.floorMark.classList.remove('on')
        return
      }
      const x = (this.point.x * 0.5 + 0.5) * rect.width
      const y = (-this.point.y * 0.5 + 0.5) * rect.height
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
    }
    this.floorRing.setAttribute('points', points.join(' '))
    this.floorMark.classList.toggle('going', going)
    this.floorMark.classList.add('on')
  }

  /** Say again what the cursor does here — the H key, for whoever missed it. */
  remind(): void {
    if (!this.film.playing) this.say(this.viewer.mode)
  }

  /**
   * Say what the cursor does here. It is different on each side of the wall,
   * and different under a finger — see `.pointer` and `.touch` in style.css,
   * which show one or the other by what the device has, not how wide it is.
   */
  private say(relation: Relation): void {
    document.body.classList.toggle('walking', relation === 'inhabit')
    this.hint.innerHTML =
      relation === 'regard'
        ? '<strong>drag</strong> to turn it &middot; ' +
          '<span class="pointer"><strong>scroll</strong></span>' +
          '<span class="touch"><strong>pinch</strong></span> to come closer &middot; ' +
          '<span class="pointer"><strong>double-click</strong> a door to go in</span>' +
          '<span class="touch"><strong>go inside</strong> at a door</span>'
        : '<strong>drag</strong> to look &middot; ' +
          '<span class="pointer"><strong>click the floor</strong></span>' +
          '<span class="touch"><strong>tap the floor</strong></span> to walk there &middot; ' +
          '<span class="pointer"><strong>space</strong> to rise &middot; ' +
          '<strong>esc</strong> to step out</span>' +
          '<span class="touch"><strong>two fingers</strong> to rise</span>'
    this.hint.classList.add('on')
    window.clearTimeout(this.hintTimer)
    this.hintTimer = window.setTimeout(() => this.hint.classList.remove('on'), 9000)
  }
}

function el(tag: string, cls: string): HTMLElement {
  const node = document.createElement(tag)
  node.className = cls
  return node
}
