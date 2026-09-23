import * as THREE from 'three'
import { CameraRig, type CameraState } from './rig.ts'
import { BODY_RADIUS, EYE_HEIGHT, type ChurchEnvelope, type Doorway } from './envelope.ts'

/**
 * Two ways of being with a building.
 *
 * Outside, the building is the subject and you are an eye going round it.
 * Inside, the room is around you and you are standing in it. Those are not
 * two settings of one camera; they are two different relationships, and every
 * control means something different in each — which is why a single free-fly
 * camera on WASD and a captured pointer served both of them badly. It asked
 * somebody who came to look at a cathedral to fly it like a spaceship, it let
 * them end up lost in the sky or stuck inside a pier, and it hid the whole of
 * the interaction behind keys they had no reason to know were there.
 *
 * So there are two, and the app always knows which one you are in:
 *
 *  - **Regarding.** An orbit. The cursor turns the building, the wheel moves
 *    you in and out, and the geometry of it guarantees you can neither sink
 *    through the pavement nor end up inside the stone. There is nothing to
 *    learn: it is the gesture every 3D object on the web has used for twenty
 *    years, and it is the one a trackpad is shaped for.
 *  - **Inhabiting.** A walk. The cursor looks, a click on the floor takes you
 *    there, and the keys are an alternative rather than the price of entry.
 *
 * And a door between them in each direction, because a cathedral has doors.
 */
export type Relation = 'regard' | 'inhabit'

/** Walking pace. Purposeful — this nave is ninety metres. */
const WALK_SPEED = 2.8
/** What shift does to it. */
const RUN = 2.4
/** Free flight outside, for the viewer who would rather fly than orbit. */
const FLY_SPEED = 30
/** How fast the held height moves, in metres a second. */
const LIFT_RATE = 9
/** Radians per pixel when looking around on foot. */
const LOOK_GAIN = 0.0026
/** A drag right across the window, in turns and in elevation. */
const ORBIT_SWEEP = Math.PI * 1.5
const ORBIT_TILT = Math.PI * 0.9
/** Seconds for the frame to catch up with the cursor. */
const ORBIT_DAMPING = 0.09

/**
 * The narrowest the frame may be across.
 *
 * A vertical field is the wrong thing to hold fixed on a phone held
 * upright. At 375 by 812 a 58 degree vertical field is 29 across, and this
 * building is 31 degrees wide from the far side of the plaza: the one device
 * whose shape suits a cathedral best would have shown it with both transepts
 * out of frame. So the vertical field opens until the horizontal one is at
 * least this, and on any landscape window it never binds.
 */
const MIN_ACROSS = THREE.MathUtils.degToRad(36)

/** The lens each relation wants. Wide inside, because rooms are. */
const REGARD_FOV = 58
const REGARD_SHIFT = 0.45
const INHABIT_FOV = 74
/**
 * Less than the photographs use, and for a reason that is not photographic:
 * a shifted frustum lifts the bottom of the frame as well as straightening
 * the columns, and the bottom of the frame is where the floor is. Past about
 * 0.6 a camera tilted up at the vault has no floor in it at all, and a floor
 * you cannot see is a floor you cannot click.
 */
const INHABIT_SHIFT = 0.5

/**
 * What the eye is open to, as a multiple of the base exposure.
 *
 * Outside is a sunlit wall, inside is a room lit through coloured glass, and
 * no one setting has ever held both. This used to be authored per stop on a
 * guided tour, which meant it was only ever right for somebody following the
 * tour. It is better as a consequence of where you are standing: cross the
 * threshold and the pupil widens over about a second, which is what an eye
 * does and what nobody has to be told about.
 */
/**
 * Down from 1.25, against the photographs. A camera in that room exposes for
 * the glass, because the glass is the picture: on the December frames in
 * reference/ the lit stone of the Passion wall sits at a third of white and
 * the lancets at three quarters, saturated. At 1.25 the same wall came back
 * pale — the stone at 70 % and the glass at 62 % and a quarter saturated,
 * because past white the film lets a colour go grey. A stop closed is where
 * the glass keeps its colour and the stone becomes the thing it lands on.
 *
 * And half a stop further closed again, measured over five photograph and
 * render pairs. The photographs of this nave put eleven to nineteen per cent
 * of the frame under eight per cent luminance and one to seven per cent
 * over eighty-five; the renders at 0.9 put nothing at all in either — no
 * pixel in the building ever blew out and none ever went dark, and a frame
 * in which nothing is allowed to do either is a frame with no wow in it,
 * whatever it contains. The camera in that room is exposed for the glass,
 * and the room falls into shadow around it.
 *
 * A third of a stop, not two thirds, which is where the first attempt put
 * it. The eleven-to-nineteen per cent figure comes from the December frames
 * taken *at* a wall, where half the picture is column seen against its own
 * window; the axial frames down the nave, shot in the same building, run
 * one and a half. Closing far enough to satisfy the first darkened the
 * second past anything any photograph of this interior shows. What buys the
 * contrast is the glazing being genuinely brighter than the room — see
 * `glassGain` in main.ts — and not the room being dark.
 */
/**
 * And back up again, because a fifth of the room's light was never the
 * room's.
 *
 * Every number above was measured with a volumetric pass that added light
 * without limit and took none away — see the march in render/shafts.ts. The
 * air was not a veil over the picture, it was a lamp in it: on the two frames
 * the indoor stop is judged against, switching the corrected pass in for the
 * old one drops the vault-wash frame's median from 0.277 to 0.218 and the
 * Passion wall's from 0.361 to 0.249. A third of the light on those frames
 * was coming from the mistake.
 *
 * So the stop was fitted against a room a fifth of whose light is now gone.
 * Swept again on the same frame and the same photograph:
 * `in-vault-wash-dec2025` measures 0.290 over the centre of the canopy, the
 * render used to sit just over it at 0.303, and now sits at 0.250. It crosses
 * the photograph again a fifth of a stop up, which is where this is — 0.95,
 * against 0.78, a difference of 0.28 of a stop.
 *
 * The share of the Passion frame over eighty-five per cent does *not* come
 * back to where it was, and should not: it stood at 5.1 % and now stands at
 * 1.2 %, inside the one-to-seven the photographs give, and the four points
 * that went were blown *air* rather than blown glass. A window that is the
 * thing the eye cannot look at is the effect; the air in front of it going
 * white with it was the bug.
 *
 * Everything above is still true, and all of it was measured through the
 * inflated medium. Outdoors is untouched: the sun on the stone never went
 * through any of this.
 */
/**
 * And a fifth of the way back down, because the room found the light it was
 * short of.
 *
 * The paragraph above reads as a correction and it was half of one. The air
 * was adding light it had no right to, and it was adding it *in the place
 * where the room had none* — across the standing faces of four hundred
 * columns, which took nothing at all from the one term in the model that
 * stands for light that has bounced more than once. Taking the air away left
 * that hole open and the stop was opened a third of a stop to cover it.
 *
 * The hole is now filled by the thing that should have filled it — see
 * `uRoomStand` in render/materials.ts — so the cover comes off. Swept on the
 * same frame and the same photograph as before: `in-vault-wash-dec2025`
 * measures 0.291 over the centre of the canopy, and the render crosses it at
 * an eighth of a stop down from 0.95. Outdoors is untouched, here as there:
 * `OUTSIDE_STOP` is a different number and the fill this pays for is gated
 * by `sfSheltered`, so no stone standing in the plaza sees any of it.
 */
const INSIDE_STOP = 0.867
/**
 * Well under the room. A photograph of this building is exposed for the
 * sunlit stone, and the sunlit stone at the old figure was over the film's
 * knee everywhere — the towers came back as white cut-outs with a halo, on
 * a sky one shade paler than the photographs. The sky's own brightness was
 * raised to meet this, so the sky is where it was and the stone is a stop
 * under it, which is where a photograph puts it.
 */
const OUTSIDE_STOP = 0.72
/** Seconds for the pupil to catch up. */
const ADAPT = 0.9

/** How close the orbit lets you come to the stone. */
const MASSIF_CLEAR = 4
const MIN_DISTANCE = 4
/**
 * How far the orbit lets you back off.
 *
 * Six hundred metres was a limit on the arithmetic, not on the view: fifteen
 * wheel ticks from the front steps put the camera half a kilometre out and
 * thirty-two metres up, with the cathedral a speck on the horizon and the
 * whole frame in front of it flat Eixample roof. Nothing verified in this
 * model is further out than the film's orbit, at two hundred and seventy.
 */
const MAX_DISTANCE = 320
/**
 * And the further back, the higher: backing off rises over the roofs.
 *
 * A dolly keeps its line of sight, and the line of sight from a camera at
 * roof height to a pivot half way up a tower runs across a kilometre of
 * rooftop, all of it in the bottom half of the frame. The film's orbit sits
 * ninety-six metres up at two hundred and seventy out, which is where the
 * roofs stop being the subject. Past RISE_FROM from the middle of the
 * building, backing off lifts the camera's floor RISE_SLOPE metres for every
 * metre out, by turning about the pivot — the frame tips down to keep the
 * building where it was on screen, the way it does on a drag.
 */
const RISE_FROM = 140
const RISE_SLOPE = 0.3
/**
 * How far away a picked point may be and still mean anything.
 *
 * A ray a hair below level meets the ground thirty kilometres out, and a turn
 * centred thirty kilometres away is not a turn, it is a translation: one drag
 * and the camera is in the sea. Past this the answer is "nothing in
 * particular", which the callers already know what to do with.
 */
const PICK_REACH = 1200
/** Never orbit under the pavement, and never quite to the pole. */
const MIN_EYE = 2.2
const MAX_ELEVATION = THREE.MathUtils.degToRad(78)
const MIN_ELEVATION = THREE.MathUtils.degToRad(-85)

/** Where a flight pauses outside a door before going in. */
const DOOR_STANDOFF = 16
/**
 * Where stepping out leaves you, measured from the door.
 *
 * Not DOOR_STANDOFF. Sixteen metres is a waypoint for a flight on its way in
 * and a fine one, but it is measured from the door, and the Nativity door is
 * at the back of a portal that stands ten metres proud of it — so stepping
 * out left you four metres from the carving with the jambs filling the frame,
 * looking up at the underside of a porch, with nothing of the building you
 * had just left in view. Forty is where the film's own approach to that door
 * starts and where the author's frame under the Passion front stands: the
 * portal whole, and the towers going up out of the top of the frame.
 */
const STEP_OUT = 40
/** How far up the front stepping out looks, above eye height, at STEP_OUT. */
const STEP_OUT_LOOK = 17
/** Movement, on the arrow keys: radians a second to turn on foot or round. */
const KEY_TURN = 1.3
/** And how fast the arrows come closer or back off outside, per second. */
const KEY_DOLLY = 0.9

/**
 * Whether the viewer has asked for less movement.
 *
 * A flight through a door is five seconds of the whole frame swinging and
 * sliding, which is precisely what this setting exists to turn off. Asked at
 * the moment of the flight rather than once, because it can change while
 * the page is open.
 */
const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null
/** And how far in it lands: clear of the first pair of columns, under the
 *  canopy rather than in the doorway looking at it. */
const DOOR_ENTRY = 14

/**
 * A rough solid standing in for the building.
 *
 * Two questions want it — how close may the orbit come, and what is under the
 * cursor — and both want a cheap answer rather than an exact one. An
 * ellipsoid round the bounding box is wrong by a few metres at the corners of
 * a Latin cross, and is never wrong in the direction that matters, which is
 * letting the camera inside the stone. A raycast against a million instanced
 * triangles is the wrong thing to ask on every mouse-down for an answer only
 * used to decide what to turn around.
 */
interface Massif {
  centre: THREE.Vector3
  radii: THREE.Vector3
}

/**
 * The city the building stands in, as far as the camera is concerned.
 *
 * An orbit that comes down to street level is standing in the Eixample, and
 * the Eixample is six storeys of it — so without this the first drag downward
 * parks the viewer inside somebody's flat and the screen goes the colour of
 * stucco. The blocks are a grid with four cells left open (the temple's own,
 * the two parks facing its finished fronts, and the Glory esplanade), which
 * is all the shape the camera needs: over an open cell you may stand on the
 * pavement, and everywhere else you are above the roofs.
 */
export interface Surroundings {
  /** Block centre to block centre. */
  pitch: number
  centre: [number, number]
  /** Half the side of a block's footprint. */
  half: number
  /** Cells with nothing built on them, keyed `i,j`. */
  open: ReadonlySet<string>
  /** How high the rest of them stand. */
  roofs: number
}

/**
 * How far inside an open cell the pavement is fully available.
 *
 * Wide, and that is the point. This is the ramp the camera climbs as a low
 * orbit swings out of the park and over the roofs of the Eixample, and a
 * short one is a lift rather than a rise: thirty metres of height over five
 * of travel reads as the camera being snatched. Half a block gives it the
 * length of a swoop.
 */
const CLEARING_FEATHER = 26

interface Aim {
  yaw: number
  pitch: number
  fov: number
  shift: number
}

/** One move of a flight: where it goes, where it ends up looking, how long. */
interface Leg {
  from: THREE.Vector3
  to: THREE.Vector3
  aimFrom: Aim
  aimTo: Aim
  /** Shortest way round, precomputed, so a flight never turns the long way. */
  turn: number
  duration: number
  /**
   * The way there, when it is not a straight line — a flight that has to go
   * round or over the building. Sampled by arc length, so the eased progress
   * along it is an eased speed and not a speed that depends on how the
   * waypoints happen to be spaced.
   */
  path?: THREE.Curve<THREE.Vector3>
  /**
   * What to keep looking at on the way. A straight leg turns from its first
   * aim to its last and nothing in between needs saying; a long arc over the
   * roofs with the aim interpolated the same way spends its middle looking
   * at sky. On a path the camera looks at this instead, and only eases onto
   * its landing aim at the end.
   */
  track?: THREE.Vector3
}

/**
 * How far outside the massif a flight keeps.
 *
 * The massif is an ellipsoid drawn round a bounding box, so it is already
 * proud of the stone at the middle of every face and tight at the corners —
 * and a flight path is a curve fitted through points *on* it, which can cut
 * a little inside between two of them. The margin covers both.
 */
const FLIGHT_CLEAR = 10
/** How far above the roofs a flight that goes over the building passes. */
const FLIGHT_OVER = 0.2

/** Smootherstep: zero first *and* second derivative at both ends. */
function ease(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

/** The yaw and the pitch of a direction, in this camera's own terms. */
function bearing(d: THREE.Vector3): number {
  return Math.atan2(-d.x, -d.z)
}

function rise(d: THREE.Vector3): number {
  const length = d.length()
  return length < 1e-8 ? 0 : Math.asin(THREE.MathUtils.clamp(d.y / length, -1, 1))
}

function shortestTurn(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

export class Viewer {
  readonly rig: CameraRig

  /** What the building is, as far as movement is concerned. */
  envelope: ChurchEnvelope | null = null

  /** Told when the relation changes, and when a flight starts or lands. */
  onRelation: ((relation: Relation) => void) | null = null
  onTravel: ((travelling: boolean) => void) | null = null

  /** Multiplier on the base exposure — see INSIDE_STOP. */
  eyeStop = OUTSIDE_STOP

  private relation: Relation = 'regard'
  /** The vertical field before the viewport's shape has its say. */
  private baseFov = REGARD_FOV
  /**
   * Whether something else has the wheel — see ui/film.ts.
   *
   * While it does, the pose is written from outside every frame and nothing
   * here moves it: no orbit, no walk, no hold, no flight. What this still
   * owns is the pupil, because where the camera is standing decides what the
   * eye is open to whoever put it there.
   */
  private taken = false

  // Regarding.
  /**
   * What the orbit is currently turning around, which is whatever was under
   * the cursor when the drag began — and `heart`, which is the building, and
   * is where anything meaning "the whole thing" turns around instead.
   * Keeping them apart matters: without it, going home means going back to
   * the last thing you happened to click on.
   */
  private readonly pivot = new THREE.Vector3(0, 60, -19)
  private readonly heart = new THREE.Vector3(0, 60, -19)
  /**
   * Turn and zoom the cursor has asked for and the frame has not yet given.
   *
   * The whole of the smoothing: a fraction of it is taken each frame, so a
   * fast drag and a slow one of the same length end in the same place, and
   * letting go settles rather than stopping dead. No velocity to estimate, no
   * flick to measure, and no inertia that depends on how often the mouse
   * happens to report itself.
   */
  private readonly pending = { azimuth: 0, elevation: 0, zoom: 0 }
  private massif: Massif = {
    centre: new THREE.Vector3(0, 87, -19),
    radii: new THREE.Vector3(46, 92, 66),
  }
  /**
   * Whether the last pick found pavement rather than the building.
   *
   * Set by `along`, which already knows — it chose between the two — and read
   * by the wheel, which is the one caller for which the difference decides
   * anything. A drag may perfectly well turn about a point on the ground; a
   * zoom toward one is how an orbit ends up looking at grass.
   */
  private hitGround = false
  /** The last place the orbit stood that was certainly not in the room. */
  private readonly outside = new THREE.Vector3()
  private wasOutside = false
  /** The massif grown by its clearance, for asking where the stone starts. */
  private readonly roomier = new THREE.Vector3()

  // Inhabiting.
  private readonly velocity = new THREE.Vector3()
  /** Height held above the floor by the lift keys, and where it is heading. */
  private lift = 0
  private liftWanted = 0
  /** Where a click on the floor is taking us, if anywhere. */
  private goal: THREE.Vector3 | null = null
  private readonly dest = new THREE.Vector3()
  private goalSpeed = 0

  // Travelling.
  private legs: Leg[] = []
  private legAt = 0

  private readonly keys = new Set<string>()
  /** Live pointers, so one finger and two mean different things. */
  private readonly pointers = new Map<number, { x: number; y: number; moved: number }>()
  private pinch = 0
  private plazaY = 0
  private surroundings: Surroundings | null = null

  private readonly ray = new THREE.Raycaster()
  private readonly dir = new THREE.Vector3()
  private readonly offset = new THREE.Vector3()
  private readonly step = new THREE.Vector3()
  private readonly sideways = new THREE.Vector3()
  private readonly push = new THREE.Vector3()
  /** The last place the walker stood that was certainly in the room. */
  private readonly held = new THREE.Vector3()
  private holding = false
  private readonly wasFacing = new THREE.Vector3()

  constructor(
    camera: THREE.PerspectiveCamera,
    private readonly element: HTMLElement,
  ) {
    this.rig = new CameraRig(camera)
    this.bind()
  }

  get mode(): Relation {
    return this.relation
  }

  get travelling(): boolean {
    return this.legs.length > 0
  }

  get possessed(): boolean {
    return this.taken
  }

  /**
   * Hand the camera to something else, or take it back.
   *
   * Taking it drops whatever was in progress — a flight, a walk to a clicked
   * point, a drag still settling — because none of it can be resumed into a
   * pose somebody else has been writing. Giving it back leaves the pose
   * alone; the caller says where it stands through `setState`, which works
   * out the relation from the position the way a link does.
   */
  possess(on: boolean): void {
    if (this.taken === on) return
    this.taken = on
    const wasFlying = this.legs.length > 0
    this.legs = []
    this.legAt = 0
    this.velocity.set(0, 0, 0)
    this.goal = null
    this.lift = 0
    this.liftWanted = 0
    this.pending.azimuth = 0
    this.pending.elevation = 0
    this.pending.zoom = 0
    if (on) this.keys.clear()
    if (wasFlying) this.onTravel?.(false)
  }

  /** Whether the camera is in the room rather than out on the plaza. */
  get indoors(): boolean {
    const e = this.envelope
    if (!e) return false
    const p = this.rig.position
    return e.inside(p.x, p.z) && p.y < e.ceiling
  }

  /** How high the walker is holding themselves above the floor. */
  get height(): number {
    return this.lift
  }

  setViewportSize(width: number, height: number): void {
    this.rig.setViewportSize(width, height)
    this.rig.fov = this.widen(this.baseFov)
  }

  /** Whether the window is taller than it is wide — a phone held upright. */
  get portrait(): boolean {
    const { width, height } = this.rig.viewport
    return width < height
  }

  /** The vertical field that gives this viewport at least MIN_ACROSS across. */
  widen(base: number): number {
    const { width, height } = this.rig.viewport
    const aspect = width / Math.max(1, height)
    if (aspect >= 1) return base
    const needed = 2 * Math.atan(Math.tan(MIN_ACROSS / 2) / aspect)
    return THREE.MathUtils.clamp(
      Math.max(base, THREE.MathUtils.radToDeg(needed)),
      base,
      88,
    )
  }

  /**
   * Fit the orbit and its guard rail to what has actually been built.
   *
   * The model is rebuilt whenever a plan number changes, and it can change
   * size when it does, so none of this is a constant.
   */
  fit(bounds: THREE.Box3, envelope: ChurchEnvelope, plazaY: number): void {
    this.envelope = envelope
    this.plazaY = plazaY
    const size = bounds.getSize(new THREE.Vector3())
    const centre = bounds.getCenter(new THREE.Vector3())
    this.massif = {
      centre: new THREE.Vector3(centre.x, bounds.max.y / 2, centre.z),
      radii: new THREE.Vector3(size.x * 0.55, bounds.max.y * 0.53, size.z * 0.54),
    }
    // A third of the way up the towers, which is about where the eye goes.
    this.heart.set(centre.x, Math.max(bounds.max.y * 0.36, plazaY + 1), centre.z)
    this.pivot.copy(this.heart)
  }

  /** What is built around the building — see `Surroundings`. */
  setSurroundings(surroundings: Surroundings): void {
    this.surroundings = surroundings
  }

  /**
   * How low the camera may come where it currently stands.
   *
   * Feathered over the last few metres inside an open cell rather than
   * stepped at its edge, so a low orbit swinging out of the park rises over
   * the roofs before it reaches them instead of passing through a wall and
   * being shoved out the other side.
   */
  private lowestAt(x: number, z: number): number {
    const pavement = this.plazaY + MIN_EYE
    const s = this.surroundings
    if (!s) return pavement
    const i = Math.round((x - s.centre[0]) / s.pitch)
    const j = Math.round((z - s.centre[1]) / s.pitch)
    if (!s.open.has(`${i},${j}`)) return s.roofs
    const dx = x - (s.centre[0] + i * s.pitch)
    const dz = z - (s.centre[1] + j * s.pitch)
    /**
     * An edge is only worth climbing if something is built on the far side.
     *
     * The ramp used to start at every edge of an open cell, which assumed
     * the thing on the other side of it was the Eixample. Three of the four
     * cells around the temple are open ground — Plaça de Gaudí, Plaça de la
     * Sagrada Família and the esplanade — and the temple's own block is a
     * hundred and thirteen metres across against a twenty-six metre feather,
     * so the ramp reached well inside the plaza the church stands in. A
     * camera at a transept door, which is eight metres from that block's
     * edge with open park beyond it, was lifted twenty-two metres into the
     * air to clear roofs that are two blocks away: step outside and you came
     * out level with the clerestory.
     */
    const climb = (di: number, dj: number, to: number): number =>
      s.open.has(`${i + di},${j + dj}`) ? Number.POSITIVE_INFINITY : to
    const inset = Math.min(
      climb(Math.sign(dx), 0, s.half - Math.abs(dx)),
      climb(0, Math.sign(dz), s.half - Math.abs(dz)),
    )
    if (!Number.isFinite(inset)) return pavement
    const t = THREE.MathUtils.clamp(inset / CLEARING_FEATHER, 0, 1)
    return THREE.MathUtils.lerp(s.roofs, pavement, t)
  }

  /**
   * The opening frame.
   *
   * Across the pond in Plaça de Gaudí, which is the corner every photograph
   * of this building is taken from and — since the Eixample went in — a place
   * there is actually ground to stand on. Not an orbit angle: a position, in
   * a named open block, with the orbit read off it afterwards. A building in
   * a city has only a few places you can see it whole from, and none of them
   * is a number of degrees.
   */
  home(): void {
    this.legs = []
    this.setRelation('regard')
    const s = this.surroundings
    const park = s
      ? new THREE.Vector3(s.centre[0] + s.pitch * 1.1, 0, s.centre[1] + s.half * 0.5)
      : new THREE.Vector3(this.heart.x + 150, 0, this.heart.z + 40)
    park.y = this.plazaY + 3.4
    this.rig.position.copy(park)
    this.rig.fov = this.widen(REGARD_FOV)
    this.rig.shiftCorrection = REGARD_SHIFT
    this.eyeStop = OUTSIDE_STOP
    this.pending.azimuth = 0
    this.pending.elevation = 0
    this.pending.zoom = 0
    this.baseFov = REGARD_FOV
    this.pivot.copy(this.heart)
    this.rig.lookAt(this.heart)
    this.hold(0, true)
    this.rig.refresh()
  }

  // ---------------------------------------------------------------- doors ---

  /**
   * The door to offer, which is the one you are looking at.
   *
   * Offering the nearest would be wrong: the nearest door to somebody round
   * the back of the apse is a door in a wall they cannot see, and flying them
   * to it means flying them through the building. A door has to face you to
   * be worth offering — and once it does, the flight to it is a straight line
   * by construction, because you are both on the outward side of the same
   * wall.
   */
  bestDoor(): Doorway | null {
    const doors = this.envelope?.doors
    if (!doors || doors.length === 0) return null
    const p = this.rig.position
    const view = this.rig.forward(this.dir)
    let best: Doorway | null = null
    let score = -Infinity
    for (const door of doors) {
      const dx = door.x - p.x
      const dz = door.z - p.z
      const range = Math.hypot(dx, dz)
      if (range < 1e-3) continue
      // Facing us at all: its outward normal has to point back this way.
      const facing = (-dx * door.nx - dz * door.nz) / range
      if (facing < 0.25) continue
      // And in front of us, so the marker has somewhere on screen to be.
      const ahead = (dx * view.x + dz * view.z) / range
      if (ahead < 0.1) continue
      const value = facing * ahead - range / 4000
      if (value > score) {
        score = value
        best = door
      }
    }
    return best
  }

  /**
   * The door a double-click on the building meant.
   *
   * The nearest door to the point under the cursor — but only among the
   * doors that face the camera. A pick on a façade is pulled back toward the
   * middle of the building (see `along`), and the nearest door to a point
   * halfway inside the plan can be one in the wall behind, which sent a
   * double-click on the Nativity porch on a flight round the building to the
   * far side. Nothing facing, and the caller falls back to the door it would
   * have offered anyway.
   */
  private doorToward(point: THREE.Vector3): Doorway | null {
    const doors = this.envelope?.doors
    if (!doors) return null
    const p = this.rig.position
    let best: Doorway | null = null
    let near = Infinity
    for (const door of doors) {
      const dx = door.x - p.x
      const dz = door.z - p.z
      const range = Math.hypot(dx, dz)
      if (range < 1e-3) continue
      if ((-dx * door.nx - dz * door.nz) / range < 0.25) continue
      const d = Math.hypot(door.x - point.x, door.z - point.z)
      if (d < near) {
        near = d
        best = door
      }
    }
    return best
  }

  /**
   * Go in.
   *
   * Two legs with a beat between them, rather than one curve. A spline that
   * both starts wherever the viewer happens to be and arrives square on a
   * four-metre opening either cuts the corner through the jamb or spends its
   * whole length straightening out. Arriving at the portal and then stepping
   * through reads as two intentions instead of one swerve, it is what a
   * person actually does, and every metre of it is outside the stone until
   * the last one.
   */
  enter(offered?: Doorway | null): void {
    const e = this.envelope
    if (!e) return
    // A second press while the first flight is still in the air used to
    // restart it from wherever the camera had got to. One flight at a time;
    // a click on the stage skips to the end of it if that is what is wanted.
    if (this.legs.length > 0) return
    // Whichever door was asked for; failing that the one being looked at;
    // failing that the nearest, which is what the keyboard and the corner
    // button come in by when nothing is facing the camera at all.
    const door =
      offered ?? this.bestDoor() ?? nearestDoor(e.doors, this.rig.position)
    if (!door) return

    const n = new THREE.Vector3(door.nx, 0, door.nz)
    const mouth = new THREE.Vector3(door.x, 0, door.z)
    const stage = mouth.clone().addScaledVector(n, DOOR_STANDOFF)
    stage.y = (e.floorAt(stage.x, stage.z) ?? this.plazaY) + EYE_HEIGHT + 1.2
    const inside = mouth.clone().addScaledVector(n, -DOOR_ENTRY)
    inside.y = (e.floorAt(inside.x, inside.z) ?? 0) + EYE_HEIGHT

    const here = this.rig.position.clone()
    const lookUp = mouth.clone().setY(stage.y + 7)
    const atDoor = aimAt(stage, lookUp, this.widen(REGARD_FOV), REGARD_SHIFT)
    // Landing, look on along the axis of the door and up: the whole point of
    // the room you have just walked into is forty-five metres over your head.
    // Along the axis of the door and up, but not so far up that the floor
    // leaves the frame. The vault is the whole point of the room you have
    // just walked into — and the floor is what you click to cross it, so an
    // arrival that shows none of it hands the viewer a room they cannot walk
    // in until they think to look down. Thirty degrees holds both.
    //
    // Less on a window held upright. A phone's frame is taller than it is
    // wide and the vertical field is the full seventy-four degrees, so the
    // vault is in shot a long way below thirty — and at thirty on a portrait
    // screen the floor was the bottom twentieth of the frame, under the clock
    // and the way out, which left the only way to walk on a phone with
    // nothing to tap.
    const on = inside.clone().addScaledVector(n, -34)
    on.y = inside.y + (this.portrait ? 9 : 20)
    const arrival = aimAt(inside, on, this.widen(INHABIT_FOV), INHABIT_SHIFT)

    const reach = here.distanceTo(stage)
    const approach = THREE.MathUtils.clamp(reach / 95, 1.1, 2.4)
    this.legs = []
    // Usually the door is one you are looking at, and then the way to it is a
    // straight line — you and it are on the same side of the same wall. It is
    // not always: the keyboard and the fallback button will both happily
    // offer a door round the far side of the apse, and the line to that one
    // goes through the building. Round it, then, or over it — see `clearway`,
    // which used to be one point above the roof and a straight descent from
    // there to the door, and the straight descent from a point above the
    // middle of the building to a point sixteen metres from its wall goes
    // through the towers.
    const way = this.clearway(here, stage)
    if (way.length > 0) {
      const path = this.arc([here, ...way, stage])
      const length = path.getLength()
      this.legs.push({
        ...leg(here, stage, this.aim(), atDoor, THREE.MathUtils.clamp(length / 60, 1.6, 5)),
        path,
        track: lookUp,
      })
    } else {
      this.legs.push(leg(here, stage, this.aim(), atDoor, approach))
    }
    this.legs.push(leg(stage, inside, atDoor, arrival, 1.6))
    this.legAt = 0
    this.baseFov = INHABIT_FOV
    this.setRelation('inhabit')
    this.onTravel?.(true)
    if (REDUCED_MOTION?.matches) this.skip()
  }

  /** The massif with the flight's margin round it. */
  private flightMassif(): Massif {
    const m = this.massif
    return {
      centre: m.centre,
      radii: new THREE.Vector3(
        m.radii.x + FLIGHT_CLEAR,
        m.radii.y * (1 + FLIGHT_OVER) + FLIGHT_CLEAR,
        m.radii.z + FLIGHT_CLEAR,
      ),
    }
  }

  /**
   * Points to fly by so that a straight line becomes a way round.
   *
   * The line from here to there is tested against the massif; where it
   * passes through, the middle of the part that is inside is pushed straight
   * out to the surface, and the two halves either side of that point are
   * asked the same question. A few rounds of this and the polyline hugs the
   * outside of the building, over the top if the line went through the
   * middle and round the flank if it clipped a corner. Empty when the
   * straight line was already clear, which is nearly always.
   */
  private clearway(from: THREE.Vector3, to: THREE.Vector3, depth = 0): THREE.Vector3[] {
    if (depth > 4) return []
    const span = to.clone().sub(from)
    const length = span.length()
    if (length < 1) return []
    const m = this.flightMassif()
    const pair = roots(from, span.clone().divideScalar(length), m)
    if (!pair || pair[1] <= 0 || pair[0] >= length) return []
    const t = (Math.max(pair[0], 0) + Math.min(pair[1], length)) / 2
    const mid = from.clone().addScaledVector(span, t / length)
    const out = this.pushOut(mid, m)
    return [...this.clearway(from, out, depth + 1), out, ...this.clearway(out, to, depth + 1)]
  }

  /**
   * The nearest point on the outside of the massif, leaning upward.
   *
   * Radially, in the ellipsoid's own frame, because that is the direction
   * that gets out of it quickest. The lean is the one bit of taste in it: the
   * bottom of the massif is under the pavement, so a point pushed straight
   * down would be in the ground, and a flight that clears a cathedral
   * clears it over the roofs and not by tunnelling.
   */
  private pushOut(point: THREE.Vector3, m: Massif): THREE.Vector3 {
    const q = new THREE.Vector3(
      (point.x - m.centre.x) / m.radii.x,
      (point.y - m.centre.y) / m.radii.y,
      (point.z - m.centre.z) / m.radii.z,
    )
    if (q.lengthSq() < 1e-6) q.set(0, 1, 0)
    q.y = Math.max(q.y, 0.2)
    q.normalize().multiplyScalar(1.03)
    const out = new THREE.Vector3(
      m.centre.x + q.x * m.radii.x,
      m.centre.y + q.y * m.radii.y,
      m.centre.z + q.z * m.radii.z,
    )
    out.y = Math.max(out.y, this.lowestAt(out.x, out.z) + 4)
    return out
  }

  /**
   * A smooth curve through the waypoints, checked against the massif.
   *
   * A spline through points on the surface of a convex body bows a little
   * inside it between them; the margin absorbs most of that, and any sample
   * that still lands inside is pushed out and added to the control points
   * for a second fit. Two rounds have always been enough.
   */
  private arc(points: THREE.Vector3[]): THREE.CatmullRomCurve3 {
    const m = this.flightMassif()
    let control = points
    let curve = new THREE.CatmullRomCurve3(control, false, 'centripetal')
    for (let round = 0; round < 2; round++) {
      const samples = curve.getSpacedPoints(48)
      let clean = true
      const next: THREE.Vector3[] = [control[0]!]
      for (let i = 1; i < samples.length - 1; i++) {
        const s = samples[i]!
        const q = Math.hypot(
          (s.x - m.centre.x) / m.radii.x,
          (s.y - m.centre.y) / m.radii.y,
          (s.z - m.centre.z) / m.radii.z,
        )
        if (q < 1) {
          clean = false
          next.push(this.pushOut(s, m))
        }
      }
      if (clean) break
      next.push(control[control.length - 1]!)
      // The old waypoints are kept as well, so the fit only ever gains
      // constraints. Sorted along the original curve so the polyline does not
      // double back.
      control = [...control.slice(1, -1), ...next.slice(1, -1)]
        .map((p) => ({ p, at: nearestParameter(curve, p) }))
        .sort((a, b) => a.at - b.at)
        .map((entry) => entry.p)
      control = [points[0]!, ...control, points[points.length - 1]!]
      curve = new THREE.CatmullRomCurve3(control, false, 'centripetal')
    }
    return curve
  }

  /** And come back out, by the same arithmetic in reverse. */
  stepOut(): void {
    const e = this.envelope
    if (!e) return
    if (this.legs.length > 0) return
    const here = this.rig.position.clone()
    const door = nearestDoor(e.doors, here)
    if (!door) return

    const n = new THREE.Vector3(door.nx, 0, door.nz)
    const mouth = new THREE.Vector3(door.x, 0, door.z)
    const stage = mouth.clone().addScaledVector(n, STEP_OUT)

    // Out on the plaza, turned round to the front you came out of. It used to
    // go on from here — a second leg out to two and a half times the
    // building's own depth and six metres up, which is two hundred metres of
    // plaza and an orbit looking at the whole church from across the city.
    // That is a fine place to be and it is not what the button says: *step
    // outside* promises the front of the building you were just inside, near
    // enough that the door is still a door. Then it stood on the step itself,
    // which was too near — see STEP_OUT. The orbit is a wheel tick away in
    // either direction, and it is the viewer who decides how far back to go.
    //
    // Standing height, not the flight's hovering `stage.y`: this is a place
    // to be, not a waypoint to pass through.
    stage.y = (e.floorAt(stage.x, stage.z) ?? this.plazaY) + EYE_HEIGHT
    // Up the front, but not so far up that the door goes out of frame — at
    // forty metres out, seventeen metres up is about twenty-three degrees,
    // which holds the portal and the belfries' feet together. See STEP_OUT.
    const lookUp = mouth.clone().setY(stage.y + STEP_OUT_LOOK)
    const arrival = aimAt(stage, lookUp, this.widen(REGARD_FOV), REGARD_SHIFT)

    this.legs = [leg(here, stage, this.aim(), arrival, 2.4)]
    this.legAt = 0
    this.baseFov = REGARD_FOV
    this.setRelation('regard')
    this.onTravel?.(true)
    if (REDUCED_MOTION?.matches) this.skip()
  }

  /** Arrive now. A flight is a courtesy, not a toll. */
  skip(): void {
    if (this.legs.length === 0) return
    this.land(this.legs[this.legs.length - 1]!)
    this.legs = []
    this.onTravel?.(false)
  }

  // ----------------------------------------------------------- the frame ---

  update(dt: number): void {
    if (this.taken) {
      // Somebody else's pose. Only the pupil below is ours.
    } else if (this.legs.length > 0) this.fly(dt)
    else if (this.relation === 'regard') this.regard(dt)
    else this.inhabit(dt)

    const want = this.indoors ? INSIDE_STOP : OUTSIDE_STOP
    this.eyeStop += (want - this.eyeStop) * (1 - Math.exp(-dt / ADAPT))
    this.rig.refresh()
  }

  private fly(dt: number): void {
    const current = this.legs[0]!
    this.legAt += dt
    const t = ease(this.legAt / current.duration)
    if (current.path) current.path.getPointAt(t, this.rig.position)
    else this.rig.position.lerpVectors(current.from, current.to, t)
    if (current.track) {
      this.aimAlong(current, t)
    } else {
      this.rig.yaw = current.aimFrom.yaw + current.turn * t
      this.rig.pitch = THREE.MathUtils.lerp(current.aimFrom.pitch, current.aimTo.pitch, t)
    }
    this.rig.fov = THREE.MathUtils.lerp(current.aimFrom.fov, current.aimTo.fov, t)
    this.rig.shiftCorrection = THREE.MathUtils.lerp(current.aimFrom.shift, current.aimTo.shift, t)
    if (this.legAt < current.duration) return

    this.legs.shift()
    this.legAt = 0
    if (this.legs.length > 0) return
    this.land(current)
    this.onTravel?.(false)
  }

  /**
   * Where to look on a leg that has something to look at.
   *
   * Off the starting aim and onto the tracked point over the first third,
   * holding it through the middle, and off it onto the landing aim over the
   * last quarter. Both blends are on the shortest way round.
   */
  private aimAlong(current: Leg, t: number): void {
    const look = aimAt(this.rig.position, current.track!, 0, 0)
    const onto = THREE.MathUtils.smoothstep(t, 0, 0.3)
    const off = THREE.MathUtils.smoothstep(t, 0.75, 1)
    let yaw = current.aimFrom.yaw + shortestTurn(current.aimFrom.yaw, look.yaw) * onto
    let pitch = THREE.MathUtils.lerp(current.aimFrom.pitch, look.pitch, onto)
    yaw += shortestTurn(yaw, current.aimTo.yaw) * off
    pitch = THREE.MathUtils.lerp(pitch, current.aimTo.pitch, off)
    this.rig.yaw = yaw
    this.rig.pitch = pitch
  }

  /** Settle into whichever relation the flight was heading for. */
  private land(final: Leg): void {
    this.rig.position.copy(final.to)
    this.rig.yaw = final.aimFrom.yaw + final.turn
    this.rig.pitch = final.aimTo.pitch
    this.rig.fov = final.aimTo.fov
    this.rig.shiftCorrection = final.aimTo.shift
    this.velocity.set(0, 0, 0)
    this.goal = null
    this.lift = 0
    this.liftWanted = 0
    this.pending.azimuth = 0
    this.pending.elevation = 0
    this.pending.zoom = 0
    if (this.relation === 'regard') {
      this.pivot.copy(this.lookingAt() ?? this.heart)
      this.hold(0, true)
    }
  }

  // --------------------------------------------------------------- orbit ---

  private regard(dt: number): void {
    this.arrows(dt)
    // Flying with the keys is free movement, and it is still the only way to
    // get your nose right up against a portal. The orbit then takes whatever
    // the camera has ended up looking at as its new centre, so the next drag
    // turns around that rather than around where you started.
    const flying = this.freeMove(dt, FLY_SPEED)
    this.rig.position.addScaledVector(this.velocity, dt)
    if (flying) this.pivot.copy(this.lookingAt() ?? this.heart)

    const taken = 1 - Math.exp(-dt / ORBIT_DAMPING)
    const azimuth = this.pending.azimuth * taken
    const elevation = this.pending.elevation * taken
    const zoom = this.pending.zoom * taken
    this.pending.azimuth -= azimuth
    this.pending.elevation -= elevation
    this.pending.zoom -= zoom

    this.turnAbout(azimuth, elevation)
    this.dolly(zoom)
    this.hold(dt, false)
  }

  /**
   * Swing the camera round the pivot — *and turn it by the same amount*.
   *
   * The distinction is the whole difference between an orbit that can be
   * re-centred and one that cannot. A camera forced to look at its pivot
   * swings its whole view the instant the pivot moves, so pressing the mouse
   * on one tower to turn around it threw the frame somewhere else before the
   * drag had begun. Rotating the eye and its aim together is a rigid motion:
   * whatever was in the frame is still in it, wherever the centre of the turn
   * happens to be.
   */
  private turnAbout(dAzimuth: number, dElevation: number): void {
    const p = this.rig.position
    this.offset.copy(p).sub(this.pivot)
    const distance = this.offset.length()
    if (distance < 1e-4) return

    const elevation = Math.asin(THREE.MathUtils.clamp(this.offset.y / distance, -1, 1))
    // How low this line of sight may swing before the camera is in the road.
    // Taken at the position it is leaving rather than the one it is arriving
    // at, which is near enough over one frame and is corrected by `hold`.
    const floor = Math.asin(
      THREE.MathUtils.clamp((this.lowestAt(p.x, p.z) - this.pivot.y) / distance, -1, 1),
    )
    const wanted = THREE.MathUtils.clamp(
      elevation + dElevation,
      Math.min(Math.max(floor, MIN_ELEVATION), MAX_ELEVATION),
      MAX_ELEVATION,
    )
    const turnUp = wanted - elevation
    if (Math.abs(dAzimuth) < 1e-9 && Math.abs(turnUp) < 1e-9) return

    const azimuth = Math.atan2(this.offset.x, this.offset.z) + dAzimuth
    const ce = Math.cos(wanted)
    p.set(
      this.pivot.x + Math.sin(azimuth) * ce * distance,
      this.pivot.y + Math.sin(wanted) * distance,
      this.pivot.z + Math.cos(azimuth) * ce * distance,
    )
    this.rig.turn(dAzimuth, -turnUp)
  }

  /** In and out along the line from the pivot, with the aim left alone. */
  private dolly(amount: number): void {
    if (amount === 0) return
    const p = this.rig.position
    this.offset.copy(p).sub(this.pivot)
    const distance = this.offset.length()
    if (distance < 1e-4) return
    const wanted = THREE.MathUtils.clamp(
      distance * Math.exp(amount),
      Math.max(MIN_DISTANCE, this.clearOf(this.offset, distance)),
      MAX_DISTANCE,
    )
    p.copy(this.pivot).addScaledVector(this.offset, wanted / distance)
    if (amount > 0) this.riseOver(wanted, amount)
  }

  /**
   * Backing off, come up over the roofs — see RISE_FROM.
   *
   * Only on the way out, and only ever up: a viewer who then drags down to a
   * low line across the rooftops is asking for that frame and gets it.
   */
  private riseOver(distance: number, amount: number): void {
    const s = this.surroundings
    const p = this.rig.position
    const out = Math.hypot(p.x - this.heart.x, p.z - this.heart.z)
    if (!s || out <= RISE_FROM) return
    const floor = s.roofs + (out - RISE_FROM) * RISE_SLOPE
    if (p.y >= floor) return
    const now = Math.asin(THREE.MathUtils.clamp((p.y - this.pivot.y) / distance, -1, 1))
    const wanted = Math.asin(THREE.MathUtils.clamp((floor - this.pivot.y) / distance, -1, 1))
    // In proportion to how far this frame backed off, so the rise is a swing
    // spread over the dolly rather than a jump — a wheel notch is about 0.16
    // of this, which closes about three fifths of the gap.
    this.turnAbout(0, (wanted - now) * (1 - Math.exp(-amount * 6)))
  }

  /**
   * How near the pivot this line of sight may come before it is in the stone.
   *
   * `hold` already keeps the orbit outside the massif and a few metres clear
   * of it, and it does so *softly* — a second of floating back out, so that
   * flying the keys in close reads as the building declining to be stood
   * inside rather than as the camera being snatched away. The wheel outruns
   * it. A tick is a fraction of the distance to the pivot, and the pivot is
   * half way into the building, so ticks compound: six of them on a porch
   * crossed sixty metres of stone in well under the second the recovery
   * needs.
   *
   * The limit is not a new one — it is the same surface `hold` recovers to,
   * asked for along the line the camera is actually travelling, so the wheel
   * stops exactly where the orbit would have put it anyway. Nothing about how
   * close you may get to the building changes; what changes is that you no
   * longer arrive there through it.
   *
   * Zero when the line misses the massif altogether, which is every view that
   * is not pointed at the building.
   */
  private clearOf(offset: THREE.Vector3, distance: number): number {
    const m = this.massif
    const clear: Massif = {
      centre: m.centre,
      radii: this.roomier.copy(m.radii).addScalar(MASSIF_CLEAR),
    }
    // Outward from the pivot, which is where the camera is going when it
    // comes closer: the far root is where that ray leaves the solid.
    this.dir.copy(offset).divideScalar(distance)
    const pair = roots(this.pivot, this.dir, clear)
    return pair === null ? 0 : Math.max(pair[1], 0)
  }

  /**
   * Keep the camera out of the stone and out of the road.
   *
   * The clearance is a soft floor and the ground is a hard one, and the
   * difference is deliberate. Flying in close with the keys is allowed to
   * break the clearance — that is what it is for — and the orbit then floats
   * you back out over about a second, which reads as the building declining
   * to be stood inside rather than as the camera being snatched away. Sinking
   * into the pavement is not a thing anybody wants a gentle recovery from.
   */
  private hold(dt: number, snap: boolean): void {
    const p = this.rig.position
    const m = this.massif
    // Where the centre of the turn was on screen before any of this, so it
    // can be put back there afterwards. A clamp that slides the camera and
    // leaves the aim alone is the one way this orbit could still lose the
    // building: swinging a low orbit out of the park lifts it thirty metres
    // over the roofs, and thirty metres at a hundred and twenty is fifteen
    // degrees of drift — enough, over a long drag, to leave a viewer looking
    // at empty sky with a cathedral off the side of the frame.
    this.wasFacing.copy(this.pivot).sub(p)
    this.offset.copy(p).sub(m.centre)
    const q = Math.hypot(
      this.offset.x / (m.radii.x + MASSIF_CLEAR),
      this.offset.y / (m.radii.y + MASSIF_CLEAR),
      this.offset.z / (m.radii.z + MASSIF_CLEAR),
    )
    if (q < 1) {
      // The scaling that puts it on the surface is the same number in world
      // space as in the ellipsoid's own, because the map between them is
      // linear.
      const out = q > 1e-6 ? 1 / q : 1
      const reach = snap ? 1 : 1 - Math.exp(-dt * 4)
      p.x += this.offset.x * (out - 1) * reach
      p.y += this.offset.y * (out - 1) * reach
      p.z += this.offset.z * (out - 1) * reach
      if (q <= 1e-6) p.x = m.centre.x + m.radii.x + MASSIF_CLEAR
    }

    p.y = Math.max(p.y, this.lowestAt(p.x, p.z))
    this.keepOut(p)

    this.step.copy(this.pivot).sub(p)
    if (this.wasFacing.lengthSq() > 1e-8 && this.step.lengthSq() > 1e-8) {
      this.rig.turn(
        shortestTurn(bearing(this.wasFacing), bearing(this.step)),
        rise(this.step) - rise(this.wasFacing),
      )
    }
  }

  /**
   * The room is a wall, not a suggestion.
   *
   * The ellipsoid above is a *soft* floor on purpose — flying the keys in
   * close is allowed to break it, and the orbit floats you back out over
   * about a second, which reads as the building declining to be stood inside.
   * The wheel wins that race. It is applied as a fraction of the distance to
   * the pivot, so a pick on a porch and six ticks is a factor of four each
   * time: measured, that put the camera 0.85 m above the floor of the
   * transept, still in orbit, looking up at the canopy from ankle height —
   * through a wall it never opened, by a route no visitor to a cathedral has.
   *
   * A recovery cannot fix that, because the thing to recover from already
   * happened. So the inside is a hard stop, and it is stated the way the
   * walker's own hold states it — you were outside a moment ago, and the
   * building has not moved, so outside is where you still are. Nothing here
   * traps a camera that began indoors: it has to have been out to be put
   * back.
   *
   * There is still exactly one way in, and it has a door in it.
   */
  private keepOut(p: THREE.Vector3): void {
    const e = this.envelope
    const indoors = e !== null && e.inside(p.x, p.z) && p.y < e.ceiling
    if (!indoors) {
      this.outside.copy(p)
      this.wasOutside = true
      return
    }
    if (!this.wasOutside) return
    p.copy(this.outside)
    // And drop whatever was still pushing, or the wheel spends the next
    // second shoving a camera that is not going anywhere.
    this.pending.zoom = 0
    this.velocity.set(0, 0, 0)
  }

  // ---------------------------------------------------------------- walk ---

  private inhabit(dt: number): void {
    this.arrows(dt)
    if (this.freeMove(dt, WALK_SPEED)) this.goal = null

    if (this.goal) {
      const p = this.rig.position
      const dx = this.goal.x - p.x
      const dz = this.goal.z - p.z
      const remaining = Math.hypot(dx, dz)
      if (remaining < 0.4) {
        this.goal = null
      } else {
        // Slowing into the last few metres, so arriving is an arrival rather
        // than a stop. The damping does the rest.
        const pace = this.goalSpeed * Math.min(1, remaining / 4)
        const blend = 1 - Math.exp(-dt * 7)
        this.velocity.x += ((dx / remaining) * pace - this.velocity.x) * blend
        this.velocity.z += ((dz / remaining) * pace - this.velocity.z) * blend
      }
    }

    this.rig.position.addScaledVector(this.velocity, dt)
    this.lift += (this.liftWanted - this.lift) * (1 - Math.exp(-dt * 5))
    this.stand(dt)
  }

  /**
   * A pace or two forward, which is what the wheel means indoors.
   *
   * Sent through the same destination the floor click uses rather than as a
   * shove to the velocity, so it is bounded by the room, stops at walls, and
   * eases like every other way of crossing this floor. Repeated notches
   * extend the destination rather than fighting over it.
   */
  private nudge(metres: number): void {
    const from = this.goal ?? this.rig.position
    const aim = this.rig.ahead(this.offset)
    const reached = this.reachable(
      new THREE.Vector3(from.x + aim.x * metres, 0, from.z + aim.z * metres),
    )
    if (!reached) return
    this.goal = reached
    const range = Math.hypot(
      reached.x - this.rig.position.x,
      reached.z - this.rig.position.z,
    )
    this.goalSpeed = THREE.MathUtils.clamp(range * 0.8, 2.5, 14)
  }

  /**
   * The keys, which mean the same thing in both relations: go that way.
   *
   * Reports whether they asked for anything, because both callers have
   * something to do about it — the orbit has to re-derive itself, and the
   * walk has to drop whatever destination it was heading for.
   */
  private freeMove(dt: number, speed: number): boolean {
    const k = this.keys
    const boost = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN : 1
    const level = this.relation === 'inhabit'
    const wants = this.step.set(0, 0, 0)
    const ahead = level ? this.rig.ahead(this.offset) : this.rig.forward(this.offset)

    // The arrows are not WASD — see `arrows`. Up and down still walk, on
    // foot, because that is what they mean to anybody who has walked with
    // them; outside they come closer, which is what the wheel does there.
    if (k.has('KeyW') || (level && k.has('ArrowUp'))) wants.add(ahead)
    if (k.has('KeyS') || (level && k.has('ArrowDown'))) wants.sub(ahead)
    const beside = this.rig.beside(this.sideways)
    if (k.has('KeyD')) wants.add(beside)
    if (k.has('KeyA')) wants.sub(beside)

    const up = k.has('Space')
    const down = k.has('KeyC') || k.has('KeyZ')
    if (level) {
      // Inside, up and down is a height you hold rather than a thrust you
      // fight: hold the key to rise, let go and you stay, which is what makes
      // it possible to study a boss rather than hover at it.
      const headroom = Math.max(0, (this.envelope?.ceiling ?? 60) - 4)
      if (up) this.liftWanted += LIFT_RATE * dt * boost
      if (down) this.liftWanted -= LIFT_RATE * dt * boost
      this.liftWanted = THREE.MathUtils.clamp(this.liftWanted, 0, headroom)
    } else {
      if (up) wants.y += 1
      if (down) wants.y -= 1
    }

    if (wants.lengthSq() < 1e-9) {
      // Coasting. Whoever called this still moves the camera by whatever is
      // left, so letting go of a key eases to a stop instead of cutting.
      this.velocity.multiplyScalar(Math.exp(-dt * 14))
      return level ? up || down : false
    }

    wants.normalize().multiplyScalar(speed * boost)
    this.velocity.lerp(wants, 1 - Math.exp(-dt * (level ? 22 : 9)))
    return true
  }

  /**
   * The arrow keys, which do what the pointer does here.
   *
   * They used to be a second WASD, and left and right stepped sideways — so
   * there was no key anywhere that turned the view, and a visitor on a
   * keyboard alone could walk the nave and never look round in it. On foot,
   * left and right turn and Page Up and Page Down look up and down, which is
   * the vault; outside, left and right turn the building the way a drag does
   * and up and down come closer and back off the way the wheel does.
   */
  private arrows(dt: number): void {
    const k = this.keys
    const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0)
    if (this.relation === 'inhabit') {
      const tilt = (k.has('PageUp') ? 1 : 0) - (k.has('PageDown') ? 1 : 0)
      if (turn !== 0 || tilt !== 0) this.rig.turn(turn * KEY_TURN * dt, tilt * KEY_TURN * 0.6 * dt)
      return
    }
    if (turn !== 0) this.pending.azimuth += turn * KEY_TURN * dt
    const closer = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)
    if (closer !== 0) this.zoom(-closer * KEY_DOLLY * dt)
  }

  /** Keep the walker's feet on the floor and their shoulders out of the stone. */
  private stand(dt: number): void {
    const e = this.envelope
    if (!e) return
    const p = this.rig.position
    this.push.copy(p)
    e.resolve(p, BODY_RADIUS)

    // Slide along whatever pushed back, instead of standing in it pushing.
    // The columns here are on a seven-and-a-half metre grid square with the
    // axes, so walking straight down an aisle meets one of them dead centre
    // rather than glancing off it — and a push straight back out, against a
    // key still asking to go straight forward, is a walker pinned to a
    // column for as long as they hold W. Taking the inward part out of the
    // velocity turns that into rounding the column, which is what a person
    // does without noticing they did it.
    this.push.subVectors(p, this.push)
    if (this.push.lengthSq() > 1e-10) {
      this.push.normalize()
      const into = this.velocity.dot(this.push)
      if (into < 0) this.velocity.addScaledVector(this.push, -into)
    }

    /**
     * A room is left by a door or not at all.
     *
     * The plan the walls hold you in by is a hall, two arms and a drum, and
     * where the arm meets the drum the arm is the wider of the two — so there
     * is a corner, a few metres across, that belongs to neither. A body that
     * walks into it is in no region at all, which the envelope reads as being
     * outside the building and answers by pushing it further out. One step
     * across the corner of the transept and a visitor is standing in the
     * plaza behind the apse, having walked through a wall.
     *
     * Rather than describe that corner, this says the thing that is true of
     * every corner: while you were in the room a moment ago and are not
     * standing in a doorway, you are still in the room. Step through an
     * opening and the hold is given up, which is what makes walking out of
     * the front door work.
     */
    const inRoom = e.inside(p.x, p.z)
    if (inRoom) {
      this.held.set(p.x, 0, p.z)
      this.holding = true
    } else if (this.holding && !e.inDoorway(p)) {
      p.x = this.held.x
      p.z = this.held.z
      this.velocity.x = 0
      this.velocity.z = 0
      this.goal = null
    } else {
      this.holding = false
    }

    const floor = e.floorAt(p.x, p.z)
    if (floor === null) return
    p.y = THREE.MathUtils.lerp(p.y, floor + EYE_HEIGHT + this.lift, 1 - Math.exp(-dt * 9))
  }

  /**
   * Where a click at this point of the screen would walk to, standing on the
   * floor — or null if it would not walk anywhere.
   *
   * For the mark the interface draws under the cursor: a click on the floor
   * is the main way to cross this room and nothing on screen said so once
   * the line of controls had gone. This is the click's own arithmetic asked
   * in advance, so the mark is exactly where the walk will end — pulled back
   * to the wall under a window, and absent where a click would do nothing.
   */
  walkTarget(clientX: number, clientY: number): THREE.Vector3 | null {
    if (this.relation !== 'inhabit' || this.legs.length > 0 || this.taken) return null
    const hit = this.pick(clientX, clientY, true)
    if (!hit) return null
    const target = this.reachable(hit)
    if (!target) return null
    const p = this.rig.position
    if (Math.hypot(target.x - p.x, target.z - p.z) < 0.8) return null
    target.y -= EYE_HEIGHT
    return target
  }

  /** Where a walk to a clicked point is heading, on the floor, while it is. */
  get destination(): THREE.Vector3 | null {
    if (!this.goal) return null
    return this.dest.set(this.goal.x, this.goal.y - EYE_HEIGHT, this.goal.z)
  }

  // --------------------------------------------------------------- input ---

  /** Where the middle of the frame lands, for re-anchoring after a flight. */
  private lookingAt(): THREE.Vector3 | null {
    return this.along(this.rig.position, this.rig.forward(new THREE.Vector3()), this.plazaY)
  }

  /** Where a screen point lands in the world. */
  private pick(clientX: number, clientY: number, floorOnly = false): THREE.Vector3 | null {
    const rect = this.element.getBoundingClientRect()
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1),
      ),
      this.rig.camera,
    )
    const origin = this.ray.ray.origin
    const level = floorOnly
      ? (this.envelope?.floorAt(origin.x, origin.z) ?? 0)
      : this.plazaY
    return this.along(origin, this.ray.ray.direction, level, floorOnly)
  }

  /**
   * The nearer of two candidates along a ray: the massif, which stands for
   * the building, and the ground under it.
   */
  private along(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    level: number,
    floorOnly = false,
  ): THREE.Vector3 | null {
    let entry: number | null = null
    let best: number | null = null
    if (!floorOnly) {
      const pair = roots(origin, direction, this.massif)
      if (pair && pair[1] > 0.5 && pair[0] < PICK_REACH) {
        entry = Math.max(pair[0], 0.5)
        // The middle of the chord, not the near face. An ellipsoid drawn
        // round a Latin cross stands well proud of the stone, and turning
        // about a point ten metres in front of a façade is turning about the
        // end of the building rather than the building: half a turn later it
        // has swung off the side of the frame. Halfway through is the body of
        // the thing, and a grazing ray — which has a short chord — still gets
        // an answer near the surface it grazed.
        best = (entry + pair[1]) / 2
      }
    }
    let ground = false
    if (direction.y < -1e-4) {
      const t = (level - origin.y) / direction.y
      if (t > 0.5 && t < PICK_REACH && (entry === null || t < entry)) {
        best = t
        ground = true
      }
    }
    if (best === null || best > PICK_REACH) return null
    this.hitGround = ground
    const hit = origin.clone().addScaledVector(direction, best)
    // Half pulled back toward the middle of the building, when it is the
    // building that was hit. Anywhere a turn is centred stays exactly where
    // it is on screen, so how far the cathedral wanders over a long drag is
    // just how far the centre of the turn is from the cathedral — and a
    // viewer dragging across the whole window wants the building still in
    // front of them much more than they want the particular tower they
    // happened to press on dead centre.
    return ground ? hit : hit.lerp(this.heart, 0.5)
  }

  /**
   * How far toward a clicked point you may actually go.
   *
   * Walked, not teleported: the point is pulled back to the last place along
   * the way still in the same room, so pointing through a window puts you at
   * the wall under it rather than out on the plaza.
   */
  private reachable(target: THREE.Vector3): THREE.Vector3 | null {
    const e = this.envelope
    if (!e) return null
    const p = this.rig.position
    const here = e.inside(p.x, p.z)
    // Stepped at a fixed spacing rather than a fixed count, so a click across
    // the crossing is tested as finely as a click at your feet and a wall
    // two metres away is never stepped straight over.
    const span = Math.hypot(target.x - p.x, target.z - p.z)
    const steps = THREE.MathUtils.clamp(Math.ceil(span / 1.5), 1, 160)
    let last: THREE.Vector3 | null = null
    for (let i = 1; i <= steps; i++) {
      const f = i / steps
      const x = p.x + (target.x - p.x) * f
      const z = p.z + (target.z - p.z) * f
      if (e.inside(x, z) !== here) break
      last = new THREE.Vector3(x, 0, z)
    }
    if (!last) return null
    last.y = (e.floorAt(last.x, last.z) ?? 0) + EYE_HEIGHT
    return last
  }

  private aim(): Aim {
    return {
      yaw: this.rig.yaw,
      pitch: this.rig.pitch,
      fov: this.rig.fov,
      shift: this.rig.shiftCorrection,
    }
  }

  private setRelation(relation: Relation): void {
    if (this.relation === relation) return
    this.relation = relation
    this.onRelation?.(relation)
  }

  private bind(): void {
    const el = this.element

    el.addEventListener('pointerdown', (event) => {
      // A press on one of the controls drawn over the stage is theirs. Taking
      // the pointer here as well would capture it, and a captured pointer's
      // release is retargeted to the stage — so the button under the finger
      // never received its click, and the one thing on screen asking to be
      // pressed did nothing when it was.
      if (fromControl(event) || this.taken) return
      // Capture is a nicety — the release below is bound to the same element
      // and fires anyway — and it throws outright on a pointer id that is no
      // longer active, which synthetic events and some pen hardware manage.
      try {
        el.setPointerCapture(event.pointerId)
      } catch {
        /* keep the gesture without it */
      }
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: 0 })
      el.classList.add('dragging')
      if (this.pointers.size === 2) this.pinch = this.spread()
      if (this.pointers.size !== 1) return

      // Turn about whatever is under the cursor. Nothing about the frame
      // changes when the centre of the turn does — see `turnAbout` — so this
      // costs the viewer nothing until they actually drag.
      if (this.relation === 'regard' && this.legs.length === 0) {
        const hit = this.pick(event.clientX, event.clientY)
        if (hit) this.pivot.copy(hit)
      }
    })

    el.addEventListener('pointermove', (event) => {
      const held = this.pointers.get(event.pointerId)
      if (!held) return
      const dx = event.clientX - held.x
      const dy = event.clientY - held.y
      held.x = event.clientX
      held.y = event.clientY
      held.moved += Math.abs(dx) + Math.abs(dy)
      if (this.legs.length > 0) return

      if (this.pointers.size >= 2) {
        // A move arrives per finger, so only the first of them drives: doing
        // it per finger would count one two-finger drag twice.
        if ([...this.pointers.keys()][0] !== event.pointerId) return
        const spread = this.spread()
        if (this.pinch > 0 && spread > 0) this.zoom(Math.log(this.pinch / spread) * 1.4)
        this.pinch = spread
        if (this.relation === 'inhabit') {
          this.liftWanted = THREE.MathUtils.clamp(
            this.liftWanted + dy * 0.14,
            0,
            Math.max(0, (this.envelope?.ceiling ?? 60) - 4),
          )
        }
        return
      }

      if (this.relation === 'regard') this.drag(dx, dy)
      else this.rig.turn(-dx * LOOK_GAIN, -dy * LOOK_GAIN)
    })

    const release = (event: PointerEvent): void => {
      const held = this.pointers.get(event.pointerId)
      this.pointers.delete(event.pointerId)
      if (this.pointers.size < 2) this.pinch = 0
      if (this.pointers.size === 0) el.classList.remove('dragging')
      if (!held) return
      // A press that did not travel is a click, and a click means something.
      // The threshold is generous because a hand on a trackpad is never quite
      // still.
      if (held.moved < 7) this.click(event)
    }
    el.addEventListener('pointerup', release)
    el.addEventListener('pointercancel', release)
    el.addEventListener('lostpointercapture', (event) => {
      this.pointers.delete(event.pointerId)
      if (this.pointers.size < 2) this.pinch = 0
      if (this.pointers.size === 0) el.classList.remove('dragging')
    })

    el.addEventListener('dblclick', (event) => {
      if (this.relation !== 'regard' || this.legs.length > 0 || this.taken) return
      if (fromControl(event)) return
      const hit = this.pick(event.clientX, event.clientY)
      this.enter(hit ? this.doorToward(hit) : null)
    })

    el.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault()
        if (this.legs.length > 0 || this.taken) return
        if (this.relation === 'regard') {
          const hit = this.pick(event.clientX, event.clientY)
          // Only the building re-centres the turn. A wheel tick over the gap
          // between two towers finds the park a hundred metres short of them,
          // and zooming toward *that* is how six ticks end with the camera at
          // head height in the grass, pitched down, with the cathedral behind
          // it. The turn may be centred anywhere; the zoom has to be going
          // somewhere, and the only thing worth going toward here is stone.
          if (hit && !this.hitGround) this.pivot.copy(hit)
          this.zoom(event.deltaY * 0.0016)
        } else {
          // Inside, the wheel walks you up the nave, which is most of what
          // there is to do with a room ninety metres long.
          this.nudge(-event.deltaY * 0.025)
        }
      },
      { passive: false },
    )

    window.addEventListener('keydown', (event) => {
      if (event.target instanceof HTMLInputElement) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      // Space on a focused button presses the button; it is not also a rise.
      if (event.target instanceof HTMLButtonElement && event.code === 'Space') return
      this.keys.add(event.code)
    })
    window.addEventListener('keyup', (event) => this.keys.delete(event.code))
    window.addEventListener('blur', () => this.keys.clear())
  }

  /** What a single click does, which depends on which side of the wall it is. */
  private click(event: PointerEvent): void {
    if (this.legs.length > 0) {
      this.skip()
      return
    }
    if (this.relation !== 'inhabit') return
    const hit = this.pick(event.clientX, event.clientY, true)
    if (!hit) return
    const target = this.reachable(hit)
    if (!target) return
    const range = Math.hypot(target.x - this.rig.position.x, target.z - this.rig.position.z)
    if (range < 0.8) return
    this.goal = target
    // Long walks are brisk and short ones are a step; both ease to a stop.
    this.goalSpeed = THREE.MathUtils.clamp(range * 0.55, 3.5, 22)
    this.liftWanted = 0
  }

  private drag(dx: number, dy: number): void {
    const { width, height } = this.rig.viewport
    this.pending.azimuth -= (dx * ORBIT_SWEEP) / width
    this.pending.elevation += (dy * ORBIT_TILT) / height
  }

  private zoom(amount: number): void {
    this.pending.zoom = THREE.MathUtils.clamp(this.pending.zoom + amount, -1.5, 1.5)
  }

  private spread(): number {
    const [a, b] = [...this.pointers.values()]
    if (!a || !b) return 0
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  // --------------------------------------------------------- the harness ---

  getState(): CameraState {
    return this.rig.getState()
  }

  /**
   * Put the camera somewhere outright — a curated view, a preset. The
   * relation follows from where it lands, which is the same rule the exposure
   * uses, and means a preset in the nave arrives as a walker.
   */
  setState(state: CameraState): void {
    this.legs = []
    this.rig.setState(state)
    this.velocity.set(0, 0, 0)
    this.goal = null
    this.lift = 0
    this.liftWanted = 0
    this.pending.azimuth = 0
    this.pending.elevation = 0
    this.pending.zoom = 0
    this.setRelation(this.indoors ? 'inhabit' : 'regard')
    // A link carries its own lens and reproduces it exactly, whatever shape
    // of window it is opened in: two people sent the same moment should see
    // the same frame.
    this.baseFov = state.fov
    if (this.relation === 'regard') this.pivot.copy(this.lookingAt() ?? this.heart)
    this.eyeStop = this.indoors ? INSIDE_STOP : OUTSIDE_STOP
  }
}

/** Aim from one point at another, with a lens. */
function aimAt(from: THREE.Vector3, at: THREE.Vector3, fov: number, shift: number): Aim {
  const d = at.clone().sub(from)
  if (d.lengthSq() < 1e-9) return { yaw: 0, pitch: 0, fov, shift }
  d.normalize()
  return {
    yaw: Math.atan2(-d.x, -d.z),
    pitch: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)),
    fov,
    shift,
  }
}

function leg(
  from: THREE.Vector3,
  to: THREE.Vector3,
  aimFrom: Aim,
  aimTo: Aim,
  duration: number,
): Leg {
  return {
    from: from.clone(),
    to: to.clone(),
    aimFrom,
    aimTo,
    turn: shortestTurn(aimFrom.yaw, aimTo.yaw),
    duration,
  }
}

/** Whether a pointer event began on a control drawn over the stage. */
function fromControl(event: Event): boolean {
  const target = event.target
  return target instanceof Element && target.closest('button, input, select, textarea, a') !== null
}

/** Where along a curve a point is nearest to, by sampling. Good enough to sort by. */
function nearestParameter(curve: THREE.Curve<THREE.Vector3>, point: THREE.Vector3): number {
  const samples = curve.getSpacedPoints(64)
  let best = 0
  let near = Infinity
  for (let i = 0; i < samples.length; i++) {
    const d = samples[i]!.distanceToSquared(point)
    if (d < near) {
      near = d
      best = i / (samples.length - 1)
    }
  }
  return best
}

function nearestDoor(doors: readonly Doorway[], point: THREE.Vector3): Doorway | null {
  let best: Doorway | null = null
  let near = Infinity
  for (const door of doors) {
    const d = Math.hypot(door.x - point.x, door.z - point.z)
    if (d < near) {
      near = d
      best = door
    }
  }
  return best
}

/**
 * Where a ray meets an ellipsoid, in world units along a unit direction.
 *
 * Scaling the ray into the ellipsoid's own frame turns it into a unit sphere,
 * where the test is a quadratic. `t` survives the scaling because the
 * parameter is on the world ray, not on the scaled one.
 */
function roots(
  origin: THREE.Vector3,
  direction: THREE.Vector3,
  massif: Massif,
): [number, number] | null {
  const r = massif.radii
  const ox = (origin.x - massif.centre.x) / r.x
  const oy = (origin.y - massif.centre.y) / r.y
  const oz = (origin.z - massif.centre.z) / r.z
  const dx = direction.x / r.x
  const dy = direction.y / r.y
  const dz = direction.z / r.z
  const a = dx * dx + dy * dy + dz * dz
  if (a < 1e-12) return null
  const b = 2 * (ox * dx + oy * dy + oz * dz)
  const c = ox * ox + oy * oy + oz * oz - 1
  const disc = b * b - 4 * a * c
  if (disc < 0) return null
  const root = Math.sqrt(disc)
  return [(-b - root) / (2 * a), (-b + root) / (2 * a)]
}
