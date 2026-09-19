import * as THREE from 'three'

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
export class FreeCamera {
  readonly camera: THREE.PerspectiveCamera
  yaw = 0
  pitch = 0
  speed = 4
  shiftCorrection = 0

  private readonly keys = new Set<string>()
  private readonly velocity = new THREE.Vector3()
  private readonly forward = new THREE.Vector3()
  private readonly right = new THREE.Vector3()
  private readonly desired = new THREE.Vector3()
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

    // Forward follows where the viewer is looking, so flying and looking agree
    // even when part of the pitch is being served by lens shift.
    const cp = Math.cos(this.pitch)
    this.forward.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp)
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    this.desired.set(0, 0, 0)
    if (k.has('KeyW')) this.desired.add(this.forward)
    if (k.has('KeyS')) this.desired.sub(this.forward)
    if (k.has('KeyD')) this.desired.add(this.right)
    if (k.has('KeyA')) this.desired.sub(this.right)
    if (k.has('Space')) this.desired.y += 1
    if (k.has('KeyC')) this.desired.y -= 1
    if (this.desired.lengthSq() > 0) this.desired.normalize().multiplyScalar(this.speed * boost)

    // Exponential damping — frame-rate independent, and heavy enough that the
    // camera carries mass rather than snapping.
    const blend = 1 - Math.exp(-dt * 11)
    this.velocity.lerp(this.desired, blend)
    this.camera.position.addScaledVector(this.velocity, dt)

    this.applyOrientation()
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
    this.applyOrientation()
  }
}

function round(value: number, places = 4): number {
  const f = 10 ** places
  return Math.round(value * f) / f
}
