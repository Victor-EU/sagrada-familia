import type { CameraState } from './camera/freecam.ts'

/**
 * A link to a moment.
 *
 * Phase 5's bar is one sentence: *someone can send a link to a specific
 * moment of light.* That is the whole feature, and it is a small one only
 * because everything it needs is already a number — where the camera stands,
 * where it looks, what lens it is using, and the day and hour the sun is
 * computed from. Nothing about this building's light is authored, so nothing
 * about it has to be stored.
 *
 * Three decisions, each of which could have gone the other way:
 *
 *  - **The hash, not the query string.** This is a static site. A hash never
 *    reaches a server, never splits a cache, and never turns one page into a
 *    thousand.
 *  - **Readable, not packed.** `sun=262,16` would compress to four characters
 *    of base64 and be unreadable and un-editable. The entire project is about
 *    numbers a person can check; a link that says which day of the year it is
 *    belongs to it, and a link that says `AqZ3` does not.
 *  - **`replaceState`, not `pushState`.** Flying the length of a cathedral
 *    should not leave three hundred entries in the back button.
 *
 * The rounding is chosen so that two people opening the same link see the
 * same frame: a centimetre of position, and 1/10000 of a radian of aim, which
 * is 0.006° — under a fifth of a pixel at the widest lens this app offers.
 */

export interface Moment {
  camera: CameraState
  /** Day of the year, 1–365. */
  day: number
  /** Barcelona wall-clock hour, fractional. */
  hour: number
}

/** `#at=x,y,z&look=yaw,pitch&lens=fov,shift&sun=day,hour` */
export function encodeMoment(m: Moment): string {
  const [x, y, z] = m.camera.position
  return [
    `at=${num(x, 2)},${num(y, 2)},${num(z, 2)}`,
    `look=${num(m.camera.yaw, 4)},${num(m.camera.pitch, 4)}`,
    `lens=${num(m.camera.fov, 1)},${num(m.camera.shiftCorrection, 2)}`,
    `sun=${Math.round(m.day)},${num(m.hour, 2)}`,
  ].join('&')
}

/**
 * Read a moment back, or null if there is not a whole one there.
 *
 * Deliberately all-or-nothing. A half-applied link — the right hour at the
 * wrong place — is a worse answer than no link at all, and this is a hand-
 * editable format, so half of one is a thing that will genuinely arrive.
 */
export function decodeMoment(hash: string): Moment | null {
  const fields = new Map<string, number[]>()
  for (const part of hash.replace(/^#/, '').split('&')) {
    const [key, value] = part.split('=')
    if (!key || value === undefined) continue
    const numbers = value.split(',').map(Number)
    if (numbers.some((n) => !Number.isFinite(n))) return null
    fields.set(key, numbers)
  }

  const at = fields.get('at')
  const look = fields.get('look')
  const lens = fields.get('lens')
  const sun = fields.get('sun')
  if (at?.length !== 3 || look?.length !== 2 || lens?.length !== 2 || sun?.length !== 2) {
    return null
  }

  return {
    camera: {
      position: [at[0]!, at[1]!, at[2]!],
      yaw: look[0]!,
      pitch: look[1]!,
      fov: clamp(lens[0]!, 10, 140),
      shiftCorrection: clamp(lens[1]!, 0, 1),
    },
    day: clamp(Math.round(sun[0]!), 1, 366),
    hour: clamp(sun[1]!, 0, 24),
  }
}

/** How long the address bar is allowed to lag the camera, milliseconds. */
const SETTLE = 400

export class ShareLink {
  private written = ''
  private writtenAt = 0
  /** Set while the URL is being applied, so following it does not echo. */
  private restoring = false

  constructor(
    private readonly read: () => Moment,
    private readonly apply: (moment: Moment) => void,
  ) {}

  /** The link as it stands right now. */
  href(): string {
    const { origin, pathname } = window.location
    return `${origin}${pathname}#${encodeMoment(this.read())}`
  }

  /**
   * Take the state out of the address bar, if there is one there.
   *
   * @returns whether anything was applied, so the caller can fall back to its
   *          own opening shot.
   */
  restore(): boolean {
    const moment = decodeMoment(window.location.hash)
    if (!moment) return false
    this.restoring = true
    this.apply(moment)
    this.restoring = false
    this.written = encodeMoment(this.read())
    return true
  }

  /**
   * Follow a link pasted into a tab that is already open.
   *
   * Without this, sending someone a link while they have the app open does
   * nothing at all — the hash changes, the page does not reload, and the
   * camera stays exactly where it was.
   */
  bind(): void {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash === this.written) return
      this.restore()
    })
  }

  /** Keep the address bar in step with the camera. Call once a frame. */
  update(now: number): void {
    if (this.restoring) return
    if (now - this.writtenAt < SETTLE) return
    const hash = encodeMoment(this.read())
    if (hash === this.written) return
    this.written = hash
    this.writtenAt = now
    window.history.replaceState(null, '', `#${hash}`)
  }

  async copy(): Promise<void> {
    const href = this.href()
    // Write the bar first, so the link that was copied is the link on screen.
    this.written = encodeMoment(this.read())
    window.history.replaceState(null, '', `#${this.written}`)
    try {
      await navigator.clipboard.writeText(href)
      flash('link to this moment copied')
    } catch {
      flash('clipboard unavailable — the link is in the address bar')
    }
  }
}

let flashTimer = 0

/** A line of confirmation, because a clipboard write is otherwise invisible. */
export function flash(message: string): void {
  const el = document.querySelector<HTMLDivElement>('#toast')
  if (!el) return
  el.textContent = message
  el.classList.add('on')
  window.clearTimeout(flashTimer)
  flashTimer = window.setTimeout(() => el.classList.remove('on'), 2200)
}

function num(value: number, places: number): string {
  // `+` drops trailing zeros, and turns −0 back into 0.
  return String(+value.toFixed(places))
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}
