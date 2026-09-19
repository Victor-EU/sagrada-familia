import * as THREE from 'three'

/**
 * What the camera needs to know about the building in order to walk in it.
 *
 * Kept to three questions — where is the floor, am I inside, and what am I
 * standing in — so the camera has no opinion about bays, columns or vaults,
 * and the plan has no opinion about movement.
 */
export interface Envelope {
  /** Floor height under a point, or null where there is no floor. */
  floorAt(x: number, z: number): number | null
  /** Whether a point is inside the shell. */
  contains(point: THREE.Vector3): boolean
  /** Push a body of this radius out of anything solid, in place. */
  resolve(position: THREE.Vector3, radius: number): void
}

/** Eye height for walk mode, and the height of the scale figure. */
export const EYE_HEIGHT = 1.65

/** Shoulder width, near enough, for pushing out of columns. */
export const BODY_RADIUS = 0.3

export interface RoomEnvelopeParams {
  /** Half the distance between the inner faces of the two walls. */
  halfWidth: number
  /** The open end toward the Glory façade, +z. */
  near: number
  /** The open end toward the crossing, −z. */
  far: number
  /** Underside of the vault. */
  ceiling: number
  floor: number
  columns: { x: number; z: number; radius: number }[]
}

/**
 * The envelope of a room bounded by two walls and open at both ends.
 *
 * That is a box rather than a shell, and deliberately: a nave *is* open at
 * both ends until the crossing and the Glory façade exist, so inside means
 * between the two glazed walls, along the nave's length, and under the vault.
 * That is enough to decide whether someone is in the room — which is the only
 * question the camera asks.
 */
export class RoomEnvelope implements Envelope {
  constructor(private readonly p: RoomEnvelopeParams) {}

  floorAt(x: number, z: number): number | null {
    if (Math.abs(x) > this.p.halfWidth + 6) return null
    if (z > this.p.near + 20 || z < this.p.far - 20) return null
    return this.p.floor
  }

  contains(point: THREE.Vector3): boolean {
    return (
      Math.abs(point.x) < this.p.halfWidth &&
      point.z < this.p.near &&
      point.z > this.p.far &&
      point.y < this.p.ceiling
    )
  }

  resolve(position: THREE.Vector3, radius: number): void {
    if (radius <= 0) return

    for (const column of this.p.columns) {
      const dx = position.x - column.x
      const dz = position.z - column.z
      const distance = Math.hypot(dx, dz)
      const minimum = column.radius + radius
      if (distance < minimum && distance > 1e-5) {
        const push = (minimum - distance) / distance
        position.x += dx * push
        position.z += dz * push
      } else if (distance <= 1e-5) {
        // Dead centre of a column: any direction will do, pick one.
        position.x += minimum
      }
    }

    // The walls only exist over the nave's length; past the open ends there is
    // nothing to be pushed out of.
    if (position.z < this.p.near && position.z > this.p.far) {
      const limit = Math.max(0, this.p.halfWidth - radius)
      position.x = THREE.MathUtils.clamp(position.x, -limit, limit)
    }
  }
}
