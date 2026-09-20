import * as THREE from 'three'
import type { FreeCamera } from './freecam.ts'

/**
 * Walking a cathedral with two thumbs.
 *
 * A phone cannot capture a pointer and has no keys, so every assumption the
 * desktop camera makes is wrong there: there is no mouse to lock, no W, and
 * no scroll wheel to set a speed with. What it does have is two thumbs, and
 * the division of labour that has settled across twenty years of the things
 * is the right one here too — the left thumb walks, the right thumb looks.
 *
 *  - **Left third, one finger.** A stick that appears where the thumb lands,
 *    because a fixed one is always in the wrong place for the hand holding
 *    the phone. Deflection is proportional: half a stick is half a pace,
 *    which is what makes it possible to stop in front of a column rather
 *    than beside it.
 *  - **Right two thirds, one finger.** Look. The gain is per CSS pixel, not
 *    per device pixel, so the gesture is the same size on every screen.
 *  - **Right two thirds, two fingers.** Up and down together, pinch apart
 *    for speed. Those are the two controls the scroll wheel and the space
 *    bar were doing, and they are the ones you need to get off the floor and
 *    up into the vault, which is most of what there is to do here.
 *
 * Nothing about this is a mode. The analogue stick adds to exactly the same
 * intention vector the keys write into, so a tablet with a keyboard attached
 * uses both at once and neither knows about the other.
 */

/** Radius of a full deflection, CSS pixels. About a thumb's reach. */
const STICK_RADIUS = 56
/** Radians per CSS pixel dragged. */
const LOOK_GAIN = 0.0034
/** Where the walking half ends, as a fraction of the width. */
const STICK_ZONE = 0.36
/** Two-finger vertical, in fractions of a full lift per CSS pixel. */
const LIFT_GAIN = 0.012

interface Touch {
  role: 'walk' | 'look'
  startX: number
  startY: number
  x: number
  y: number
}

export class TouchControls {
  private readonly touches = new Map<number, Touch>()
  private readonly stick: HTMLDivElement
  private readonly knob: HTMLDivElement
  /** Distance between the two look fingers on the previous frame. */
  private pinch = 0

  constructor(
    private readonly element: HTMLElement,
    private readonly camera: FreeCamera,
  ) {
    this.stick = document.createElement('div')
    this.stick.className = 'stick'
    this.knob = document.createElement('div')
    this.knob.className = 'knob'
    this.stick.append(this.knob)
    element.append(this.stick)
    this.bind()
  }

  private bind(): void {
    this.element.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return
      event.preventDefault()
      // Capture so a thumb that slides off the stage keeps steering. It can
      // legitimately fail — a pointer that has already been released, or a
      // synthetic one from a test — and that is not a reason to drop the
      // gesture.
      try {
        this.element.setPointerCapture(event.pointerId)
      } catch {
        /* keep going without capture */
      }

      const rect = this.element.getBoundingClientRect()
      const walking = [...this.touches.values()].some((t) => t.role === 'walk')
      const role: Touch['role'] =
        !walking && event.clientX - rect.left < rect.width * STICK_ZONE ? 'walk' : 'look'

      this.touches.set(event.pointerId, {
        role,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
      })

      if (role === 'walk') {
        this.stick.style.left = `${event.clientX - rect.left}px`
        this.stick.style.top = `${event.clientY - rect.top}px`
        this.stick.classList.add('on')
      }
      this.pinch = this.spread()
    })

    this.element.addEventListener('pointermove', (event) => {
      const touch = this.touches.get(event.pointerId)
      if (!touch) return
      event.preventDefault()

      const dx = event.clientX - touch.x
      const dy = event.clientY - touch.y
      touch.x = event.clientX
      touch.y = event.clientY

      if (touch.role === 'walk') {
        this.applyStick(touch)
        return
      }

      const looking = [...this.touches.values()].filter((t) => t.role === 'look')
      if (looking.length >= 2) {
        // Two fingers: rise and fall together, pinch for speed. A move event
        // arrives per finger, so only the first of them drives this — both
        // positions are already up to date by then, and doing it per finger
        // would count a two-finger drag twice.
        if (looking[0] !== touch) return
        const spread = this.spread()
        if (this.pinch > 0 && spread > 0) {
          // Fingers apart is faster, which is the way round every other pinch
          // on the device works.
          this.camera.speed = THREE.MathUtils.clamp(
            this.camera.speed * (spread / this.pinch),
            0.15,
            400,
          )
        }
        this.pinch = spread
        this.camera.analog.lift = THREE.MathUtils.clamp(
          this.camera.analog.lift - dy * LIFT_GAIN,
          -1,
          1,
        )
        return
      }

      this.camera.turn(-dx * LOOK_GAIN, -dy * LOOK_GAIN)
    })

    const release = (event: PointerEvent): void => {
      const touch = this.touches.get(event.pointerId)
      if (!touch) return
      this.touches.delete(event.pointerId)
      if (touch.role === 'walk') {
        this.stick.classList.remove('on')
        this.camera.analog.forward = 0
        this.camera.analog.strafe = 0
      }
      if ([...this.touches.values()].filter((t) => t.role === 'look').length < 2) {
        this.camera.analog.lift = 0
        this.pinch = 0
      }
    }
    this.element.addEventListener('pointerup', release)
    this.element.addEventListener('pointercancel', release)
  }

  /** Deflection of the walking thumb, as a proportional intention. */
  private applyStick(touch: Touch): void {
    const dx = touch.x - touch.startX
    const dy = touch.y - touch.startY
    const distance = Math.hypot(dx, dy)
    const scale = distance > STICK_RADIUS ? STICK_RADIUS / distance : 1
    const kx = dx * scale
    const ky = dy * scale
    this.knob.style.transform = `translate(${kx - 15}px, ${ky - 15}px)`
    this.camera.analog.strafe = kx / STICK_RADIUS
    this.camera.analog.forward = -ky / STICK_RADIUS
  }

  /** Distance between the two looking fingers, or 0 if there are not two. */
  private spread(): number {
    const looking = [...this.touches.values()].filter((t) => t.role === 'look')
    if (looking.length < 2) return 0
    return Math.hypot(looking[0]!.x - looking[1]!.x, looking[0]!.y - looking[1]!.y)
  }
}
