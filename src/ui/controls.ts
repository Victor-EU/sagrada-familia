import * as THREE from 'three'
import type { Relation, Viewer } from '../camera/viewer.ts'

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
 *  - the **hour**, because every photograph of this interior is a photograph
 *    of light at a particular time of day, and the one thing worth handing
 *    somebody is the ability to move it.
 */
export interface SunSetting {
  dayOfYear: number
  hour: number
}

/** Where the day starts and ends on the scrubber, Barcelona wall clock. */
const FIRST_HOUR = 6
const LAST_HOUR = 21

/** How far over a door the way-in marker floats. */
const MARKER_HEIGHT = 8

export class Controls {
  private readonly root: HTMLElement
  private readonly title: HTMLElement
  private readonly way: HTMLButtonElement
  private readonly out: HTMLButtonElement
  private readonly hint: HTMLElement
  private readonly clock: HTMLElement
  private readonly dial: HTMLInputElement
  private readonly hourLabel: HTMLElement

  private readonly point = new THREE.Vector3()
  private hintTimer = 0

  constructor(
    private readonly viewer: Viewer,
    private readonly host: HTMLElement,
    private readonly sun: SunSetting,
    private readonly applySun: () => void,
  ) {
    this.root = el('div', 'ui')

    this.title = el('div', 'title')
    this.title.innerHTML =
      '<h1>Sagrada Fam&iacute;lia</h1>' +
      '<p>Barcelona &middot; begun 1882 &middot; every surface generated from ' +
      'Gaud&iacute;&rsquo;s own rules, lit by the real sun</p>'

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
    this.clock.append(this.hourLabel, this.dial)

    this.root.append(this.title, this.way, this.out, this.hint, this.clock)
    this.host.append(this.root)

    this.showHour()
    this.say('regard')
    // The title is an introduction, not a caption: it says what this is and
    // then stops saying it.
    window.setTimeout(() => this.title.classList.add('gone'), 7000)

    viewer.onRelation = (relation) => this.say(relation)
    viewer.onTravel = (travelling) => this.root.classList.toggle('travelling', travelling)
  }

  /** Put the hour the sun is actually at back on the dial. */
  showHour(): void {
    const h = Math.floor(this.sun.hour)
    const m = Math.round((this.sun.hour - h) * 60)
    this.hourLabel.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    if (document.activeElement !== this.dial) this.dial.value = String(this.sun.hour)
  }

  /**
   * Follow the door round the building.
   *
   * Called every frame because it has to be: the marker is pinned to a place
   * in the world, and in an orbit the world is what moves.
   */
  update(): void {
    // The dial is not the only thing that moves the sun — a shared link and
    // the parameter panel both set the hour directly — so the reading is
    // refreshed from the sun rather than remembered from the last drag.
    this.showHour()
    const inside = this.viewer.mode === 'inhabit'
    const outside = !inside && !this.viewer.travelling
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

  /** Say what the cursor does here. It is different on each side of the wall. */
  private say(relation: Relation): void {
    document.body.classList.toggle('walking', relation === 'inhabit')
    this.hint.innerHTML =
      relation === 'regard'
        ? '<strong>drag</strong> to turn it &middot; ' +
          '<strong>scroll</strong> to come closer &middot; ' +
          '<strong>double-click</strong> a door to go in'
        : '<strong>drag</strong> to look &middot; ' +
          '<strong>click the floor</strong> to walk there &middot; ' +
          '<strong>space</strong> to rise &middot; ' +
          '<strong>esc</strong> to step out'
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
