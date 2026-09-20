import * as THREE from 'three'
import type { FreeCamera } from '../camera/freecam.ts'
import type { SunSetting } from '../dev/viewpoints.ts'

/**
 * The way round the building.
 *
 * The curated viewpoints in dev/viewpoints.ts are a regression harness: the
 * same frames after every change, so a break in the light is seen rather than
 * argued about. They are not a visit. A visit has an order to it, and the
 * order is the point — you meet a cathedral from across the square, walk up
 * to it until it stops fitting in your eye, and only then go in. Doing it the
 * other way round throws away the one effect the building spends its whole
 * exterior setting up, which is how much smaller you are than it.
 *
 * So: four moments outside, working from the far side of the plaza to the
 * threshold, and five inside, working from the door to the crossing. The
 * coordinates are not invented. Every one is either a frame already verified
 * in the harness or a small move along an axis from one, because a camera
 * placed by eye in a building of this shape ends up inside a pier.
 */
export interface Moment {
  id: string
  title: string
  caption: string
  /** Which side of the wall this stands on — see `crossesThreshold`. */
  part: 'outside' | 'inside'
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  shiftCorrection: number
  day: number
  hour: number
  /** Seconds to fly here from the moment before. */
  travel?: number
}

/**
 * Where the visit begins before it begins.
 *
 * Moment 0 is a held frame, and a held frame is a worse opening than a slow
 * one: the building wants to be arrived at. So the camera is put here on the
 * first frame and flown in, which costs nothing and buys the only six seconds
 * of this whole thing that nobody will skip.
 */
export const OVERTURE: Pick<Moment, 'position' | 'target' | 'fov' | 'shiftCorrection'> = {
  position: [-215, 54, 168],
  target: [0, 74, -20],
  fov: 46,
  shiftCorrection: 0.5,
}

export const JOURNEY: Moment[] = [
  {
    id: 'approach',
    title: 'From across the plaza',
    caption:
      'Ten in the morning, late September: the sun is round on the Glory ' +
      'front and the western flank is in its own shadow. Eighteen towers are ' +
      'planned and not one was finished in Gaudí’s lifetime; the tallest ' +
      'will stand 172.5 m, a metre under Montjuïc, because he would not ' +
      'build higher than the hill.',
    part: 'outside',
    position: [-118, 0.3, 84],
    target: [0, 78, -20],
    fov: 58,
    shiftCorrection: 0.45,
    day: 262,
    // Chosen off the table in light/sun.ts rather than by eye: at this hour
    // the sun stands at 0.83 on the Glory front's normal and -0.34 on the
    // flank beside it, which is the one combination that gives this corner a
    // lit face and a shaded one at an altitude still low enough to be warm.
    // At five in the afternoon, where this used to sit, both were negative
    // and the building opened the visit in its own shadow.
    hour: 10,
    travel: 6.5,
  },
  {
    id: 'nativity',
    title: 'The Nativity front',
    caption:
      'Round to the sunrise side, mid-morning in June — the one façade ' +
      'Gaudí saw built. Its four towers carry Barnabas, Simon, Jude and ' +
      'Matthias, and the stone is Montjuïc sandstone, from a quarry that ' +
      'closed in 1938 and has been matched ever since.',
    part: 'outside',
    position: [96, 0.3, 22],
    target: [10, 120, -26],
    fov: 72,
    shiftCorrection: 0.35,
    day: 172,
    hour: 9.6,
    travel: 7,
  },
  {
    id: 'terraces',
    title: 'On the terraces',
    caption:
      'The roof is not a lid but a flight of terraces you can walk on, which ' +
      'is why the parapet has pinnacles along it and the clerestory steps up ' +
      'behind rather than hiding.',
    part: 'outside',
    position: [18.5, 33.4, 12],
    target: [3, 96, -36],
    fov: 72,
    shiftCorrection: 0.4,
    day: 172,
    hour: 8.5,
    travel: 5,
  },
  {
    id: 'threshold',
    title: 'At the door',
    caption:
      'Square on the northern doorway of the Nativity transept, under the ' +
      'leaning piers of the front. Four metres of opening, and the last of ' +
      'the sky.',
    part: 'outside',
    // Far enough back that the portal has its piers around it. Square on the
    // doorway's own z, so the step inside that follows travels straight along
    // the opening instead of into the jamb beside it.
    position: [66, 3, -26.3],
    target: [24, 15, -26.3],
    fov: 66,
    shiftCorrection: 0.45,
    day: 172,
    hour: 9.6,
    travel: 5,
  },
  {
    id: 'inside',
    title: 'Inside',
    caption:
      'Through the doorway, and the ceiling is forty-five metres up. The ' +
      'columns branch because Gaudí refused the flying buttress — he called ' +
      'them crutches — so a leaning, branching tree carries the vault to the ' +
      'ground on its own.',
    part: 'inside',
    // Straight in along the door's own axis, so the flight goes through the
    // opening rather than through the jamb beside it. The doorways are at
    // z = -26.3 and z = -33.8; the pier is between them.
    position: [21, 1.65, -26.3],
    target: [-6, 24, -28],
    fov: 74,
    shiftCorrection: 0.55,
    day: 172,
    hour: 9.6,
    travel: 4.5,
  },
  {
    id: 'crossing',
    title: 'Under the crossing',
    caption:
      'Looking up into the apse. The four columns at the centre are red ' +
      'porphyry and carry the tower of Jesus Christ; the eight around them ' +
      'are basalt and carry the Evangelists. Each column is cut from a ' +
      'different stone by how much weight it takes.',
    part: 'inside',
    position: [0, 1.65, -34],
    target: [0, 44, -60],
    fov: 70,
    shiftCorrection: 0.5,
    day: 172,
    hour: 10,
    travel: 4.5,
  },
  {
    id: 'nave',
    title: 'Down the nave',
    caption:
      'Ninety metres of it, on a 7.5 m module that never repeats overhead. ' +
      'Sandstone in the aisles, granite down the middle — the same four ' +
      'stones the Basilica lists, standing where it says they stand.',
    part: 'inside',
    position: [3.4, 1.65, 20],
    target: [1.2, 9, -34],
    fov: 64,
    shiftCorrection: 0.9,
    day: 262,
    hour: 16,
    travel: 5.5,
  },
  {
    id: 'passion',
    title: 'The Passion light',
    caption:
      'Four in the afternoon. The western glazing is red and orange and ' +
      'gold, and this is the hour the sun stands square on it — the light on ' +
      'the floor is the colour of the glass it came through.',
    part: 'inside',
    position: [6.2, 1.65, 4.6],
    target: [-9.4, 13, -2],
    fov: 62,
    shiftCorrection: 1,
    day: 262,
    hour: 16,
    travel: 4,
  },
  {
    id: 'nativity-light',
    title: 'The Nativity light',
    caption:
      'And the cool half answering. Vila-Grau glazed the sunrise side in ' +
      'greens and blues; both sides wash toward white as they climb, so the ' +
      'vault stays luminous instead of being stained by what is under it.',
    part: 'inside',
    position: [-6.5, 5, 4.5],
    target: [9.4, 2, -1],
    fov: 62,
    shiftCorrection: 0.4,
    day: 172,
    hour: 9.6,
    travel: 4,
  },
]

interface Pose {
  position: THREE.Vector3
  yaw: number
  pitch: number
  fov: number
  shift: number
  day: number
  hour: number
}

/**
 * Smootherstep.
 *
 * A plain lerp starts and stops abruptly, and at the speeds these moves run
 * that reads as a jump cut at both ends. This has zero first *and* second
 * derivative at both, so the camera eases out of rest and back into it.
 */
function ease(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** Shortest way round: turning 350° left is turning 10° right. */
function shortestTurn(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

export class Journey {
  index = 0
  /** True while a flight is in progress. */
  flying = false

  onArrive: ((m: Moment, index: number) => void) | null = null
  onLeave: ((m: Moment, index: number) => void) | null = null

  private from: Pose | null = null
  private to: Pose | null = null
  private turn = 0
  private elapsed = 0
  private duration = 1

  constructor(
    private readonly cam: FreeCamera,
    private readonly sun: SunSetting,
    private readonly applySun: () => void,
  ) {}

  get moment(): Moment {
    return JOURNEY[this.index]!
  }

  get atEnd(): boolean {
    return this.index >= JOURNEY.length - 1
  }

  /** Where the camera stands right now, in the terms a flight interpolates. */
  private pose(): Pose {
    return {
      position: this.cam.camera.position.clone(),
      yaw: this.cam.yaw,
      pitch: this.cam.pitch,
      fov: this.cam.camera.fov,
      shift: this.cam.shiftCorrection,
      day: this.sun.dayOfYear,
      hour: this.sun.hour,
    }
  }

  private poseOf(m: Moment): Pose {
    const position = new THREE.Vector3(...m.position)
    const dir = new THREE.Vector3(...m.target).sub(position).normalize()
    return {
      position,
      yaw: Math.atan2(-dir.x, -dir.z),
      pitch: Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)),
      fov: m.fov,
      shift: m.shiftCorrection,
      day: m.day,
      hour: m.hour,
    }
  }

  /** Stand the camera somewhere without it counting as a stop on the visit. */
  place(at: Pick<Moment, 'position' | 'target' | 'fov' | 'shiftCorrection'>): void {
    const position = new THREE.Vector3(...at.position)
    const dir = new THREE.Vector3(...at.target).sub(position).normalize()
    this.cam.camera.position.copy(position)
    this.cam.yaw = Math.atan2(-dir.x, -dir.z)
    this.cam.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
    this.cam.camera.fov = at.fov
    this.cam.shiftCorrection = at.shiftCorrection
    this.cam.teleport()
    this.cam.refresh()
  }

  /** Arrive somewhere with no travel at all. */
  jump(index: number): void {
    this.index = THREE.MathUtils.clamp(index, 0, JOURNEY.length - 1)
    this.apply(this.poseOf(this.moment))
    this.cam.teleport()
    this.flying = false
    this.from = null
    this.onArrive?.(this.moment, this.index)
  }

  /**
   * Fly to a moment.
   *
   * The camera is put in fly mode for the duration: collision is gated on how
   * grounded the walker is (see freecam.update), so a flight that starts with
   * a teleport passes through the fabric rather than being shoved around it.
   * That matters exactly once — the step from the door to the nave — and the
   * sequence is ordered so that step goes through the doorway rather than
   * through a wall.
   */
  goTo(index: number, seconds?: number): void {
    const next = THREE.MathUtils.clamp(index, 0, JOURNEY.length - 1)
    if (next !== this.index) this.onLeave?.(this.moment, this.index)
    this.index = next
    const target = this.moment

    this.from = this.pose()
    this.to = this.poseOf(target)
    this.turn = shortestTurn(this.from.yaw, this.to.yaw)
    this.duration = Math.max(0.4, seconds ?? target.travel ?? 3.6)
    this.elapsed = 0
    this.flying = true
    this.cam.teleport()
  }

  next(): void {
    if (!this.atEnd) this.goTo(this.index + 1)
  }

  prev(): void {
    if (this.index > 0) this.goTo(this.index - 1)
  }

  /** Hand control back to the viewer, wherever the camera happens to be. */
  cancel(): void {
    if (!this.flying) return
    this.flying = false
    this.from = null
  }

  /**
   * Advance the flight. Call it *after* the camera's own update, so that a
   * frame in which both run ends with the flight's answer rather than with
   * whatever the idle walker did underneath it.
   */
  update(dt: number): void {
    if (!this.flying || !this.from || !this.to) return
    this.elapsed += dt
    const t = ease(this.elapsed / this.duration)
    const a = this.from
    const b = this.to

    const pose: Pose = {
      position: a.position.clone().lerp(b.position, t),
      yaw: a.yaw + this.turn * t,
      pitch: THREE.MathUtils.lerp(a.pitch, b.pitch, t),
      fov: THREE.MathUtils.lerp(a.fov, b.fov, t),
      shift: THREE.MathUtils.lerp(a.shift, b.shift, t),
      day: THREE.MathUtils.lerp(a.day, b.day, t),
      hour: THREE.MathUtils.lerp(a.hour, b.hour, t),
    }
    this.apply(pose)

    if (this.elapsed >= this.duration) {
      this.flying = false
      this.from = null
      this.onArrive?.(this.moment, this.index)
    }
  }

  private apply(pose: Pose): void {
    this.cam.camera.position.copy(pose.position)
    this.cam.yaw = pose.yaw
    this.cam.pitch = pose.pitch
    this.cam.camera.fov = pose.fov
    this.cam.shiftCorrection = pose.shift
    // The clock moves with the camera. A viewpoint without a sun is half a
    // view of this building, and the hour is part of what is being shown.
    this.sun.dayOfYear = pose.day
    this.sun.hour = pose.hour
    this.applySun()
    this.cam.refresh()
  }
}
