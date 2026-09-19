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

export interface BayEnvelopeParams {
  /** Half the distance between the inner faces of the two walls. */
  halfWidth: number
  /** Half the bay's length, along the open axis. */
  halfDepth: number
  /** Underside of the vault. */
  ceiling: number
  floor: number
  columns: { x: number; z: number; radius: number }[]
}

/**
 * The envelope of a single bay.
 *
 * The bay is open at both ends, so `contains` is a box rather than a shell:
 * inside means between the two glazed walls, within the bay's length, and
 * under the vault. That is enough to decide whether someone is in the room.
 */
export class BayEnvelope implements Envelope {
  constructor(private readonly p: BayEnvelopeParams) {}

  floorAt(x: number, z: number): number | null {
    if (Math.abs(x) > this.p.halfWidth + 6 || Math.abs(z) > this.p.halfDepth + 20) return null
    return this.p.floor
  }

  contains(point: THREE.Vector3): boolean {
    return (
      Math.abs(point.x) < this.p.halfWidth &&
      Math.abs(point.z) < this.p.halfDepth &&
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

    // The walls only exist over the bay's length; past the open ends there is
    // nothing to be pushed out of.
    if (Math.abs(position.z) < this.p.halfDepth) {
      const limit = Math.max(0, this.p.halfWidth - radius)
      position.x = THREE.MathUtils.clamp(position.x, -limit, limit)
    }
  }
}
