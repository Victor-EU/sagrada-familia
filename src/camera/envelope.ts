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

/**
 * A raised floor with a way up onto it.
 *
 * The presbytery is the only one, and before this it was two metres of solid
 * plaster the camera walked straight into and stood inside. It takes two
 * answers, not one: where the floor is when you are on the steps or the
 * platform, and a wall at the rim for everywhere you are not.
 */
export interface Terrace {
  centreZ: number
  radius: number
  /** Height of the platform above the floor. */
  top: number
  /** The flight down the axis, descending as z increases. */
  stair: { halfWidth: number; from: number; to: number; rise: number; tread: number }
}

export interface ChurchEnvelopeParams {
  /** Half the distance between the inner faces of the two nave walls. */
  halfWidth: number
  /** The closed end toward the Glory façade, +z. */
  near: number
  /** Where the crossing gives way to the apse, −z. */
  far: number
  /** The apse, which is the one part of the plan that is not a rectangle. */
  apse: { centreZ: number; radius: number }
  /** Underside of the highest vault. */
  ceiling: number
  floor: number
  columns: { x: number; z: number; radius: number }[]
  /** Raised floors inside the shell. */
  terraces?: Terrace[]
}

/**
 * The envelope of a church: a box, and a drum on the end of it.
 *
 * Phase 2 could get away with a box open at both ends, because a nave with no
 * crossing and no façade *is* open at both ends. Both ends are closed now, and
 * the far one opens into a semicircle instead — so inside means between the
 * two nave walls and along their length, or else within the apse's own radius
 * of its centre. Two tests, and between them they describe a Latin cross whose
 * arms happen not to project.
 *
 * Still only the three questions the camera asks. Where is the floor, am I
 * inside, and what am I standing in.
 */
export class ChurchEnvelope implements Envelope {
  constructor(private readonly p: ChurchEnvelopeParams) {}

  /** Whether (x, z) is over the nave's rectangle, with a margin. */
  private inHall(x: number, z: number, margin = 0): boolean {
    return (
      Math.abs(x) <= this.p.halfWidth + margin &&
      z <= this.p.near + margin &&
      z >= this.p.far - margin
    )
  }

  /** Whether (x, z) is under the apse, with a margin. */
  private inApse(x: number, z: number, margin = 0): boolean {
    return Math.hypot(x, z - this.p.apse.centreZ) <= this.p.apse.radius + margin
  }

  floorAt(x: number, z: number): number | null {
    if (!this.inHall(x, z, 6) && !this.inApse(x, z, 6)) return null
    for (const terrace of this.p.terraces ?? []) {
      const height = terraceHeight(terrace, x, z)
      if (height !== null) return this.p.floor + height
    }
    return this.p.floor
  }

  contains(point: THREE.Vector3): boolean {
    if (point.y >= this.p.ceiling) return false
    return this.inHall(point.x, point.z) || this.inApse(point.x, point.z)
  }

  resolve(position: THREE.Vector3, radius: number): void {
    if (radius <= 0) return

    // The rim of a terrace is a wall to anyone standing below its top. The
    // flight needs no exception: its lowest tread starts at the rim, so by
    // the time you reach the rim you are a step and an eye height above the
    // height this test looks at.
    for (const terrace of this.p.terraces ?? []) {
      if (position.y > this.p.floor + terrace.top + 0.25) continue
      const dx = position.x
      const dz = position.z - terrace.centreZ
      const distance = Math.hypot(dx, dz)
      const minimum = terrace.radius + radius
      if (distance < minimum && distance > 1e-5) {
        const push = (minimum - distance) / distance
        position.x += dx * push
        position.z += dz * push
      }
    }

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

    // Inside the apse the wall is a radius, not a pair of planes, and the two
    // regions overlap across the crossing — so a point only has to satisfy
    // whichever one it is actually in.
    const apseLimit = Math.max(0, this.p.apse.radius - radius)
    const toCentre = Math.hypot(position.x, position.z - this.p.apse.centreZ)
    if (position.z < this.p.far) {
      if (toCentre > apseLimit) {
        const scale = apseLimit / Math.max(toCentre, 1e-5)
        position.x *= scale
        position.z = this.p.apse.centreZ + (position.z - this.p.apse.centreZ) * scale
      }
      return
    }

    const limit = Math.max(0, this.p.halfWidth - radius)
    position.x = THREE.MathUtils.clamp(position.x, -limit, limit)
    position.z = THREE.MathUtils.clamp(
      position.z,
      this.p.far,
      Math.max(this.p.far, this.p.near - radius),
    )
  }
}

/** How high this terrace holds the floor at (x, z), or null if it does not. */
function terraceHeight(terrace: Terrace, x: number, z: number): number | null {
  if (Math.hypot(x, z - terrace.centreZ) <= terrace.radius) return terrace.top

  const stair = terrace.stair
  if (Math.abs(x) > stair.halfWidth || z < stair.from || z > stair.to) return null
  const tread = Math.floor((z - stair.from) / stair.tread)
  return Math.max(0, terrace.top - (tread + 1) * stair.rise)
}
