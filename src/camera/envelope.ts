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
  /** Whether a point is somewhere a body could be. */
  contains(point: THREE.Vector3): boolean
  /** Push a body of this radius out of anything solid, in place. */
  resolve(position: THREE.Vector3, radius: number): void
}

/** Eye height for walk mode, and the height of the scale figure. */
export const EYE_HEIGHT = 1.65

/** Shoulder width, near enough, for pushing out of columns. */
export const BODY_RADIUS = 0.3

/**
 * The plan of the building, as a shape a walker can be asked about: a hall
 * with two arms, and a drum on the end of it.
 *
 * Wanted twice over. Once at the **inner** faces, which is what holds a
 * walker in, and once at the **outer**, which is what keeps one out — and
 * until there was anywhere to stand outside, only the first of those had ever
 * been asked for. The same four numbers describe both, so they are one type
 * and one set of tests rather than two that could drift apart.
 */
export interface Plan2D {
  /** Half the distance between the two nave walls. */
  halfWidth: number
  /** The closed end toward the Glory façade, +z. */
  near: number
  /** Where the hall gives way to the apse, −z. */
  far: number
  /** The apse, which is the one part of the plan that is not a rectangle. */
  apse: { centreZ: number; radius: number }
  /**
   * The transept arms, which stand out past the nave walls.
   *
   * One entry describes both, because they are mirrored: a half width and the
   * two lines that bound them along the nave axis.
   */
  arm?: { halfWidth: number; near: number; far: number }
}

/** A hall-and-drum plan, grown or shrunk by a margin on demand. */
class Region {
  constructor(readonly p: Plan2D) {}

  /** Half width of the hall at this z — wider where the transept projects. */
  halfWidthAt(z: number): number {
    const arm = this.p.arm
    if (arm && z <= arm.near && z >= arm.far) return arm.halfWidth
    return this.p.halfWidth
  }

  /** Whether (x, z) is over the hall's rectangle or an arm, with a margin. */
  inHall(x: number, z: number, margin = 0): boolean {
    if (z > this.p.near + margin || z < this.p.far - margin) return false
    return Math.abs(x) <= this.halfWidthAt(z) + margin
  }

  /** Whether (x, z) is under the apse, with a margin. */
  inApse(x: number, z: number, margin = 0): boolean {
    return Math.hypot(x, z - this.p.apse.centreZ) <= this.p.apse.radius + margin
  }

  contains(x: number, z: number, margin = 0): boolean {
    return this.inHall(x, z, margin) || this.inApse(x, z, margin)
  }
}

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

/**
 * A way through the wall.
 *
 * The walls of this building have held a walker in since phase 2 and, since
 * phase 4 gave the outside a reason to exist, held one out as well. Between
 * those two statements the building has no way in or out at all, and the
 * camera leaves it by flying over the parapet — which is the one thing a
 * visitor to a cathedral never does.
 *
 * A doorway is therefore not an absence of wall. It is its own short piece of
 * boundary: while a body is inside the depth of the opening, the wall stops
 * holding it and the two **jambs** hold it instead. That is the difference
 * between a door and a hole, and it is what stops a walker cutting the corner
 * diagonally through the reveal on the way out.
 */
export interface Doorway {
  /** Centre of the opening, on the wall's own line. */
  x: number
  z: number
  /** Outward normal of the wall it pierces, in plan. One of ±x or ±z. */
  nx: number
  nz: number
  /** Half the clear width between the jambs. */
  halfWidth: number
}

/** How far either side of a wall line a body still counts as in the doorway. */
const DOOR_DEPTH = 1.3

/**
 * The flight of steps the building stands on.
 *
 * The pavement is a podium: it stands proud of the plaza so that the church
 * stands on something rather than being pushed into the ground. That was
 * settled in phase 3 and drawn as a plain skirt, which was the right answer
 * for as long as nobody could be out there. A walker makes it a wall — and a
 * wall you can see over is worse than no podium at all, because it is the one
 * thing in the model that stops you for no reason you can look at.
 *
 * So the skirt becomes a flight, all the way round. Not a decision about
 * taste: a podium with steps is what the building has, and a stair round the
 * whole footprint is the only version of it that needs no gates, no landings,
 * and no argument about which front a visitor arrives at.
 */
export interface BaseParams {
  /** How far the pavement runs out past the outside face of the walls. */
  apron: number
  /** The going and the rise of one step, and how many there are. */
  going: number
  rise: number
  risers: number
}

export interface ChurchEnvelopeParams extends Plan2D {
  /** Underside of the highest vault. */
  ceiling: number
  floor: number
  columns: { x: number; z: number; radius: number }[]
  /** Raised floors inside the shell. */
  terraces?: Terrace[]
  /** The same plan at its outside faces: what keeps a walker out. */
  outer?: Plan2D
  /** The ways through. */
  doors?: Doorway[]
  /** The steps down to the plaza, and the plaza beyond them. */
  base?: BaseParams
}

/**
 * The envelope of a church: a box, a drum on the end of it, and — since
 * phase 5 — an outside.
 *
 * Phase 2 could get away with a box open at both ends, because a nave with no
 * crossing and no façade *is* open at both ends. Both ends are closed now, and
 * the far one opens into a semicircle instead — so inside means between the
 * two nave walls and along their length, or else within the apse's own radius
 * of its centre. Two tests, and between them they describe a Latin cross whose
 * arms happen to project.
 *
 * What phase 5 adds is the other side of the same shape. The plaza is ground
 * you can stand on, which means the walls now have to hold from outside as
 * well — a building that is solid in one direction only is a building you can
 * walk into through its flank — and it means there has to be a door.
 *
 * Still only the three questions the camera asks. Where is the floor, am I
 * inside, and what am I standing in.
 */
export class ChurchEnvelope implements Envelope {
  private readonly inner: Region
  private readonly outer: Region | null

  constructor(private readonly p: ChurchEnvelopeParams) {
    this.inner = new Region(p)
    this.outer = p.outer ? new Region(p.outer) : null
  }

  /**
   * The ways through the wall.
   *
   * Published because a door is not only a hole in the collision: it is the
   * one place a viewer is invited to cross from regarding the building to
   * being inside it, and the interface has to be able to point at one. See
   * camera/viewer.ts.
   */
  get doors(): readonly Doorway[] {
    return this.p.doors ?? []
  }

  /** Underside of the highest vault, which is what roofs the room. */
  get ceiling(): number {
    return this.p.ceiling
  }

  /** Whether (x, z) is over the floor of the room rather than the plaza. */
  inside(x: number, z: number): boolean {
    return this.inner.contains(x, z)
  }

  /** Whether a body is standing in the depth of one of the openings. */
  inDoorway(point: THREE.Vector3): boolean {
    return this.doorAt(point) !== null
  }

  floorAt(x: number, z: number): number | null {
    if (this.inner.contains(x, z)) {
      for (const terrace of this.p.terraces ?? []) {
        const height = terraceHeight(terrace, x, z)
        if (height !== null) return this.p.floor + height
      }
      return this.p.floor
    }

    const base = this.p.base
    if (!base || !this.outer) {
      // No plaza: the old answer, which is a generous margin round the inside
      // so that standing against a wall does not lose the floor.
      return this.inner.contains(x, z, 6) ? this.p.floor : null
    }

    // Outside. Which step you are on is which of the nested outlines you are
    // the first to fall inside — the apron itself being the top one, so a
    // walker in a doorway is still on the pavement and the two answers agree
    // across the threshold.
    for (let i = 0; i <= base.risers; i++) {
      if (this.outer.contains(x, z, base.apron + i * base.going)) {
        return this.p.floor - i * base.rise
      }
    }
    return this.p.floor - base.risers * base.rise
  }

  contains(point: THREE.Vector3): boolean {
    if (this.inner.contains(point.x, point.z)) return point.y < this.p.ceiling
    // Outside there is nothing to be under. Whether the camera is near enough
    // to the ground to walk on it is the walker's own test, not this one.
    return this.p.base !== undefined
  }

  resolve(position: THREE.Vector3, radius: number): void {
    if (radius <= 0) return

    const inside = this.inner.contains(position.x, position.z)
    if (inside) this.holdFurniture(position, radius)

    const door = this.doorAt(position)
    if (door) {
      this.betweenJambs(position, radius, door)
      return
    }

    if (inside) this.holdIn(position, radius)
    else if (this.outer) this.holdOut(position, radius)
  }

  /** The doorway this body is standing in the depth of, if any. */
  private doorAt(position: THREE.Vector3): Doorway | null {
    for (const door of this.p.doors ?? []) {
      const along = (position.x - door.x) * door.nx + (position.z - door.z) * door.nz
      if (Math.abs(along) > DOOR_DEPTH) continue
      const across = (position.x - door.x) * door.nz - (position.z - door.z) * door.nx
      if (Math.abs(across) > door.halfWidth) continue
      return door
    }
    return null
  }

  /** In a doorway the jambs hold, and the wall does not. */
  private betweenJambs(position: THREE.Vector3, radius: number, door: Doorway): void {
    const clear = Math.max(0, door.halfWidth - radius)
    const across = (position.x - door.x) * door.nz - (position.z - door.z) * door.nx
    const held = THREE.MathUtils.clamp(across, -clear, clear)
    const shift = held - across
    position.x += shift * door.nz
    position.z -= shift * door.nx
  }

  /** Terraces and columns, which are solid from every direction. */
  private holdFurniture(position: THREE.Vector3, radius: number): void {
    // The rim of a terrace is a wall to anyone standing below its top. The
    // flight needs no exception: its lowest tread starts at the rim, so by
    // the time you reach the rim you are a step and an eye height above the
    // height this test looks at.
    for (const terrace of this.p.terraces ?? []) {
      if (position.y > this.p.floor + terrace.top + 0.25) continue
      pushOutOfCircle(position, 0, terrace.centreZ, terrace.radius + radius)
    }

    for (const column of this.p.columns) {
      pushOutOfCircle(position, column.x, column.z, column.radius + radius)
    }
  }

  /** The walls, from the inside. */
  private holdIn(position: THREE.Vector3, radius: number): void {
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

    // The hall is an L: the nave's own rectangle, and the arm laid across it.
    // A body outside both goes back into whichever is *nearer*, and that one
    // word is the whole rule. Choosing the arm whenever the body is simply
    // wide of the nave — which is what this did before there was an outside
    // to check it against — snaps a walker heading east along the aisle two
    // and a half metres sideways into the transept the moment it reaches the
    // wall. Choosing the nave always would do the mirror of it, and hurl
    // anyone who walks out of the end of an arm eight metres into the aisle.
    const nave = Math.max(0, this.p.halfWidth - radius)
    const arm = this.p.arm
    let x = THREE.MathUtils.clamp(position.x, -nave, nave)
    let z = THREE.MathUtils.clamp(
      position.z,
      this.p.far,
      Math.max(this.p.far, this.p.near - radius),
    )

    if (arm) {
      const wide = Math.max(nave, arm.halfWidth - radius)
      const ax = THREE.MathUtils.clamp(position.x, -wide, wide)
      const az = THREE.MathUtils.clamp(
        position.z,
        Math.min(arm.near, arm.far + radius),
        Math.max(arm.far, arm.near - radius),
      )
      if (moved(position, ax, az) < moved(position, x, z)) {
        x = ax
        z = az
      }
    }

    position.x = x
    position.z = z
  }

  /**
   * The same walls, from the plaza.
   *
   * Pushed to the nearest face rather than clamped, because out here there is
   * no inside to be put back into — the answer wanted is "off the stone", and
   * which way off depends on which way you came at it. Two passes, because
   * the hall and the drum overlap across the mouth of the apse and leaving
   * one can put you inside the other.
   */
  private holdOut(position: THREE.Vector3, radius: number): void {
    const outer = this.outer
    if (!outer) return
    const o = outer.p

    for (let pass = 0; pass < 2; pass++) {
      if (outer.inApse(position.x, position.z, radius)) {
        pushOutOfCircle(position, 0, o.apse.centreZ, o.apse.radius + radius)
      }
      if (!outer.inHall(position.x, position.z, radius)) continue

      // Every face this point could leave by, and how far it is to each. The
      // mouth of the apse is not one of them: it is inside the building.
      const wide = outer.halfWidthAt(position.z) + radius
      const moves: [number, number, number][] = [
        [wide - position.x, wide, position.z],
        [position.x + wide, -wide, position.z],
        [o.near + radius - position.z, position.x, o.near + radius],
      ]
      const arm = o.arm
      // The two long sides of an arm bound only the part of the plan that is
      // wide of the nave *and* level with the transept. Offering them
      // anywhere else offers a way out that costs less than nothing — which
      // is what a body pressed against the nave wall a couple of metres short
      // of the crossing found, and took, and was set down inside the arm.
      if (
        arm &&
        Math.abs(position.x) > o.halfWidth &&
        position.z <= arm.near &&
        position.z >= arm.far
      ) {
        moves.push([arm.near + radius - position.z, position.x, arm.near + radius])
        moves.push([position.z - (arm.far - radius), position.x, arm.far - radius])
      }

      let best: [number, number, number] | null = null
      for (const move of moves) {
        if (move[0] < 0) continue
        if (!best || move[0] < best[0]) best = move
      }
      if (!best) continue
      position.x = best[1]
      position.z = best[2]
    }
  }
}

/** How far, squared, moving a point to (x, z) in plan would take it. */
function moved(position: THREE.Vector3, x: number, z: number): number {
  const dx = position.x - x
  const dz = position.z - z
  return dx * dx + dz * dz
}

/** Push a point out to the rim of a circle in plan, if it is inside it. */
function pushOutOfCircle(
  position: THREE.Vector3,
  x: number,
  z: number,
  radius: number,
): void {
  const dx = position.x - x
  const dz = position.z - z
  const distance = Math.hypot(dx, dz)
  if (distance >= radius) return
  if (distance <= 1e-5) {
    // Dead centre: any direction will do, pick one.
    position.x = x + radius
    return
  }
  const push = (radius - distance) / distance
  position.x += dx * push
  position.z += dz * push
}

/** How high this terrace holds the floor at (x, z), or null if it does not. */
function terraceHeight(terrace: Terrace, x: number, z: number): number | null {
  if (Math.hypot(x, z - terrace.centreZ) <= terrace.radius) return terrace.top

  const stair = terrace.stair
  if (Math.abs(x) > stair.halfWidth || z < stair.from || z > stair.to) return null
  const tread = Math.floor((z - stair.from) / stair.tread)
  return Math.max(0, terrace.top - (tread + 1) * stair.rise)
}
