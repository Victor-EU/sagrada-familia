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
 * Where the camera stands, and what lens it is looking through.
 *
 * Nothing about how it got there. That used to live here too — keys, pointer
 * lock, a velocity, a notion of being grounded — and mixing the two is what
 * made the camera hard to change: every new way of moving had to be fitted
 * into one update loop that already had opinions about walking.
 *
 * So this is now only the pose. Position, yaw, pitch, and the lens. Whoever
 * is driving writes to them and calls `refresh`; see camera/viewer.ts for the
 * one thing that does.
 *
 * The lens shift is the part worth keeping. Point an ordinary 3D camera up at
 * a vault and the columns converge toward the top of frame. Architectural
 * photographers shift the lens instead of tilting it, which keeps verticals
 * parallel — an off-centre frustum, not a rotation. `shiftCorrection` is the
 * fraction of pitch served that way, and it is not only a beauty lever:
 * reference photographs of tall interiors are shift-corrected, and a camera
 * that cannot do the same will never match one.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera
  yaw = 0
  pitch = 0
  shiftCorrection = 0

  private viewWidth = 1
  private viewHeight = 1

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera
    const dir = new THREE.Vector3()
    camera.getWorldDirection(dir)
    this.yaw = Math.atan2(-dir.x, -dir.z)
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
  }

  get position(): THREE.Vector3 {
    return this.camera.position
  }

  get fov(): number {
    return this.camera.fov
  }

  set fov(value: number) {
    this.camera.fov = value
  }

  /** Unit view direction. */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    const cp = Math.cos(this.pitch)
    return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp)
  }

  /** The level part of it, which is the direction walking goes. */
  ahead(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
  }

  /** A level pace to the right of it. */
  beside(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))
  }

  setViewportSize(width: number, height: number): void {
    this.viewWidth = Math.max(1, width)
    this.viewHeight = Math.max(1, height)
  }

  get viewport(): { width: number; height: number } {
    return { width: this.viewWidth, height: this.viewHeight }
  }

  /** Turn by a delta, in radians, with the pitch kept inside its limits. */
  turn(dYaw: number, dPitch: number): void {
    this.yaw += dYaw
    this.pitch = THREE.MathUtils.clamp(this.pitch + dPitch, -MAX_PITCH, MAX_PITCH)
  }

  /** Aim at a world point, expressed in this camera's own yaw/pitch terms. */
  lookAt(target: THREE.Vector3): void {
    const d = target.clone().sub(this.camera.position)
    if (d.lengthSq() < 1e-12) return
    d.normalize()
    this.pitch = THREE.MathUtils.clamp(Math.asin(d.y), -MAX_PITCH, MAX_PITCH)
    this.yaw = Math.atan2(-d.x, -d.z)
    this.applyOrientation()
  }

  /** Re-apply projection after fov, shift or aim changes. */
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
    this.refresh()
  }

  private applyOrientation(): void {
    const shifted =
      THREE.MathUtils.clamp(this.pitch, -MAX_SHIFT_ANGLE, MAX_SHIFT_ANGLE) * this.shiftCorrection
    const appliedPitch = this.pitch - shifted

    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.set(appliedPitch, this.yaw, 0)

    if (Math.abs(shifted) < 1e-6) {
      if (this.camera.view?.enabled) this.camera.clearViewOffset()
      return
    }

    // Delta = d*tan(phi), where d is the focal length in pixels for this viewport.
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
}

function round(value: number, places = 4): number {
  const f = 10 ** places
  return Math.round(value * f) / f
}
