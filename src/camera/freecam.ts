import * as THREE from 'three'
import { BODY_RADIUS, EYE_HEIGHT, type Envelope } from './envelope.ts'

export interface CameraState {
  position: [number, number, number]
  yaw: number
  pitch: number
  fov: number
  shiftCorrection: number
}

const MAX_PITCH = Math.PI / 2 - 0.001
/** Beyond this, correcting verticals costs more distortion than it buys. */
const MAX_SHIFT_ANGLE = THREE.MathUtils.degToRad(40)

/**
 * How low over a floor, inside the shell, counts as having arrived.
 *
 * It is also the height the ascend key has to carry you past to be flying
 * again, which is what makes lift-off a deliberate act rather than a twitch.
 */
const GROUND_REACH = 3.5

/**
 * Free-fly camera with optional vertical-line correction.
 *
 * Point an ordinary 3D camera up at a vault and the columns converge toward the
 * top of frame. Architectural photographers shift the lens instead of tilting
 * it, keeping verticals parallel — which is an off-centre frustum, not a
 * rotation. `shiftCorrection` is the fraction of pitch served that way.
 *
 * This is not only a beauty lever: reference photographs of tall interiors are
 * usually shift-corrected, and a camera that cannot do the same will never
 * match one.
 */
export type CameraMode = 'fly' | 'walk' | 'settling'

export class FreeCamera {
  readonly camera: THREE.PerspectiveCamera
  yaw = 0
  pitch = 0
  speed = 4
  shiftCorrection = 0

  /**
   * Walking pace. A metre and a half a second is a real one; anything faster
   * in a room this size turns the vault into a blur.
   */
  walkSpeed = 1.4

  /** Whether the camera is allowed to ground itself at all. */
  grounding = true

  /** What the building is, as far as movement is concerned. */
  envelope: Envelope | null = null

  /**
   * 0 is flying, 1 is standing on the floor. Everything that differs between
   * the two behaviours is a lerp on this, which is what keeps the transition
   * continuous instead of a mode switch.
   */
  private groundedness = 0
  /** Set by the ascend key; cleared once genuinely airborne. */
  private flyLatch = false

  private readonly keys = new Set<string>()
  private readonly velocity = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly right = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
  private readonly flyForward = new THREE.Vector3()
  private readonly walkForward = new THREE.Vector3()
  private viewWidth = 1
  private viewHeight = 1
  private locked = false

  constructor(camera: THREE.PerspectiveCamera, private readonly domElement: HTMLElement) {
    this.camera = camera
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    this.yaw = Math.atan2(-dir.x, -dir.z)
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
    this.bind()
  }

  get isLocked(): boolean {
    return this.locked
  }

  /** The direction the viewer perceives, pitch and lens shift combined. */
  get effectivePitch(): number {
    return this.pitch
  }

  get mode(): CameraMode {
    if (this.groundedness > 0.92) return 'walk'
    if (this.groundedness > 0.05) return 'settling'
    return 'fly'
  }

  /** 0 flying, 1 standing. Exposed for the HUD. */
  get grounded(): number {
    return this.groundedness
  }

  setViewportSize(width: number, height: number): void {
    this.viewWidth = Math.max(1, width)
    this.viewHeight = Math.max(1, height)
  }

  private bind(): void {
    this.domElement.addEventListener('click', () => {
      if (!this.locked) void this.domElement.requestPointerLock()
    })
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.domElement
    })
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return
      const sensitivity = 0.0022
      this.yaw -= e.movementX * sensitivity
      this.pitch = THREE.MathUtils.clamp(
        this.pitch - e.movementY * sensitivity,
        -MAX_PITCH,
        MAX_PITCH,
      )
    })
    window.addEventListener('keydown', (e) => {
      // Let Tweakpane inputs receive typing.
      if (e.target instanceof HTMLInputElement) return
      this.keys.add(e.code)
    })
    window.addEventListener('keyup', (e) => this.keys.delete(e.code))
    window.addEventListener('blur', () => this.keys.clear())
    this.domElement.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        this.speed = THREE.MathUtils.clamp(this.speed * Math.exp(-e.deltaY * 0.0012), 0.15, 400)
      },
      { passive: false },
    )
  }

  update(dt: number): void {
    const k = this.keys
    const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? 4 : 1
    const ascend = k.has('Space')
    const descend = k.has('KeyC')

    this.updateGrounding(dt, ascend)
    const g = this.groundedness

    // Forward follows where the viewer is looking, so flying and looking agree
    // even when part of the pitch is being served by lens shift. Walking,
    // looking up at a vault must not walk you into the floor, so the two
    // forwards are blended rather than switched.
    const cp = Math.cos(this.pitch)
    this.flyForward.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp)
    this.walkForward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    this.forward.lerpVectors(this.flyForward, this.walkForward, g)
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    this.desired.set(0, 0, 0)
    if (k.has('KeyW')) this.desired.add(this.forward)
    if (k.has('KeyS')) this.desired.sub(this.forward)
    if (k.has('KeyD')) this.desired.add(this.right)
    if (k.has('KeyA')) this.desired.sub(this.right)
    // Vertical authority fades out as the camera settles, and comes back as
    // the ascend latch lifts it. Holding space therefore reads as a lift-off
    // rather than as a mode button.
    if (ascend) this.desired.y += 1 - g
    if (descend) this.desired.y -= 1 - g

    const flySpeed = this.speed * boost
    const walkSpeed = this.walkSpeed * (boost > 1 ? 2.2 : 1)
    const speed = THREE.MathUtils.lerp(flySpeed, walkSpeed, g)
    if (this.desired.lengthSq() > 0) this.desired.normalize().multiplyScalar(speed)

    // Exponential damping — frame-rate independent. Heavy in the air so the
    // camera carries mass; light on foot so it stops where you stop.
    const blend = 1 - Math.exp(-dt * THREE.MathUtils.lerp(11, 26, g))
    this.velocity.lerp(this.desired, blend)
    this.camera.position.addScaledVector(this.velocity, dt)

    this.settle(dt)
    this.applyOrientation()
  }

  /** Decide how much of a walker the camera currently is. */
  private updateGrounding(dt: number, ascend: boolean): void {
    const envelope = this.grounding ? this.envelope : null
    if (!envelope) {
      this.groundedness += (0 - this.groundedness) * (1 - Math.exp(-dt * 4.5))
      this.flyLatch = false
      return
    }

    const p = this.camera.position
    const floor = envelope.floorAt(p.x, p.z)
    const inside = envelope.contains(p)
    const above = floor === null ? Infinity : p.y - floor

    if (ascend && this.groundedness > 0.02) this.flyLatch = true
    if (this.flyLatch && (!inside || above > GROUND_REACH)) this.flyLatch = false

    const wants = inside && floor !== null && above < GROUND_REACH && !this.flyLatch
    this.groundedness += ((wants ? 1 : 0) - this.groundedness) * (1 - Math.exp(-dt * 4.5))
  }

  /** Ease down to eye height, and out of anything solid. */
  private settle(dt: number): void {
    const g = this.groundedness
    if (!this.envelope || g <= 0.002) return

    const p = this.camera.position
    const floor = this.envelope.floorAt(p.x, p.z)
    if (floor !== null) {
      const pull = (1 - Math.exp(-dt * 7)) * g
      p.y = THREE.MathUtils.lerp(p.y, floor + EYE_HEIGHT, pull)
      if (pull > 0.5) this.velocity.y *= 1 - pull
    }

    // Radius scaled by groundedness, so the push-out arrives with the walk
    // rather than as a wall appearing mid-descent.
    this.envelope.resolve(p, BODY_RADIUS * g)
  }

  private applyOrientation(): void {
    const shifted = THREE.MathUtils.clamp(this.pitch, -MAX_SHIFT_ANGLE, MAX_SHIFT_ANGLE) *
      this.shiftCorrection
    const appliedPitch = this.pitch - shifted

    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(appliedPitch, this.yaw, 0)

    if (Math.abs(shifted) < 1e-6) {
      if (this.camera.view?.enabled) this.camera.clearViewOffset()
      return
    }

    // Δ = d·tan(φ), where d is the focal length in pixels for this viewport.
    const focalPx = this.viewHeight / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2)
    const offsetY = -focalPx * Math.tan(shifted)
    this.camera.setViewOffset(
      this.viewWidth,
      this.viewHeight,
      0,
      offsetY,
      this.viewWidth,
      this.viewHeight,
    )
  }

  /** Aim at a world point, expressed in this camera's own yaw/pitch terms. */
  lookAt(target: THREE.Vector3): void {
    const d = target.clone().sub(this.camera.position).normalize()
    this.pitch = THREE.MathUtils.clamp(Math.asin(d.y), -MAX_PITCH, MAX_PITCH)
    this.yaw = Math.atan2(-d.x, -d.z)
    this.applyOrientation()
  }

  /** Re-apply projection after fov or shift correction changes. */
  refresh(): void {
    this.camera.updateProjectionMatrix()
    this.applyOrientation()
  }

  getState(): CameraState {
    const p = this.camera.position
    return {
      position: [round(p.x), round(p.y), round(p.z)],
      yaw: round(this.yaw, 5),
      pitch: round(this.pitch, 5),
      fov: round(this.camera.fov, 3),
      shiftCorrection: round(this.shiftCorrection, 3),
    }
  }

  setState(state: CameraState): void {
    this.camera.position.fromArray(state.position)
    this.yaw = state.yaw
    this.pitch = state.pitch
    this.camera.fov = state.fov
    this.shiftCorrection = state.shiftCorrection
    this.camera.updateProjectionMatrix()
    this.velocity.set(0, 0, 0)
    this.groundedness = 0
    this.flyLatch = false
    this.applyOrientation()
  }
}

function round(value: number, places = 4): number {
  const f = 10 ** places
  return Math.round(value * f) / f
}
