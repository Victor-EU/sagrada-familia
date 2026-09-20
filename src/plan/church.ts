import * as THREE from 'three'
import type { TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import type { VaultCellParams } from '../geometry/vault.ts'
import { ChurchEnvelope, type Doorway, type Plan2D } from '../camera/envelope.ts'
import { InstancedField } from '../render/field.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { buildApse, type Apse, type ApseParams } from './apse.ts'
import { buildClerestory, defaultClerestory, type RegisterParams } from './clerestory.ts'
import { MODULE, VAULT_HEIGHT } from './module.ts'
import {
  buildBase,
  buildLid,
  defaultFloor,
  footprint,
  type FloorParams,
  type FootprintParams,
  type PavingPlan,
} from './floor.ts'
import type { Quarry } from '../render/materials.ts'
import { named, Parts } from './parts.ts'
import { buildShell, defaultShell, portals, type ShellParams } from './shell.ts'
import {
  buildTowers,
  defaultTowers,
  towerSites,
  type TowerParams,
  type TowerSite,
} from './towers.ts'
import {
  buildStation,
  buildStrip,
  springOf,
  type BandParams,
  type Strip,
  type TreeShape,
  type VaultShape,
} from './section.ts'

/**
 * The church, on the plan the building actually has.
 *
 * Phase 2 tiled a nave and guessed at three of its numbers. All three were
 * wrong, and the Basilica's own information booklets say so in as many words:
 *
 *  - **the grid is 7.5 m in both directions.** Phase 2 stood its columns
 *    fifteen metres apart along the nave, which made the nave ninety metres
 *    long on its own. Measured off Gaudí's plan the column lines are 53 px
 *    apart across *and* along, against a five-nave width of 45 m that is 320
 *    px — one module either way, to within a pixel.
 *  - **the nave is 45 m long, not 90.** Ninety is the *whole* inside length:
 *    "30 metres for the side naves; 15 metres, the central nave; 45 metres,
 *    the length of the transepts and crossing; and 90 metres, the total
 *    inside length." Six bays of 7.5, then fifteen of crossing, then thirty
 *    of apse.
 *  - **the central nave is eight-pointed grey granite, not ten.** "The
 *    columns on the side naves, of sandstone from Montjuïc; those on the
 *    central nave, of granite; those on the perimeter of the crossing, of
 *    basalt; and the four in the centre, of red porphyry." Ten is basalt, and
 *    basalt stands at the crossing. Phase 2 recorded this as its one open
 *    question and reasoned its way to the wrong answer.
 *
 * What the plan then gives for free is the crossing. Two transverse lines
 * fifteen metres apart carry twelve columns between them: four of porphyry at
 * ±7.5 for the tower of Jesus Christ, and eight of basalt on the aisle lines
 * for the four Evangelists. Twelve columns for the twelve apostles, which is
 * what the booklet says they represent, and it falls out of the grid rather
 * than being placed by hand.
 *
 * Heights follow the width of the vessel, every one a module multiple: a 7.5 m
 * aisle gets 30, a 15 m nave 45, the crossing 60, the apse 75. Those are the
 * four published vault heights, and no fifth one is needed.
 */

export interface WallParams {
  show: boolean
  /** Clearance from the outermost column line. */
  offset: number
  thickness: number
  /** Stone at each end of one bay's wall. */
  margin: number
  /** Stone between two lights. */
  mullion: number
  /** Lights across each register. */
  lights: number
  /** The aisle windows, the ones you stand beside. */
  lowSill: number
  lowHead: number
  /** How far outboard of a band's column line its clerestory wall stands. */
  clerestoryOffset: number
  /** Where a clerestory's glass starts, as a fraction of the storey it lights. */
  clerestoryRise: number
  /** Stone left above a clerestory's head, under the vault it lights. */
  clerestoryCrest: number
  /** Whether the Glory end is closed. */
  glory: boolean
}

/**
 * The crossing, and the transept arms either side of it.
 *
 * One strip of the grid, fifteen metres of it, with the orders stepped up and
 * the crowns raised. Everything else about it is the nave.
 */
export interface CrossingParams {
  /** Along the nave. One bay of the transept, and the crossing is square. */
  span: number
  /** The four at the corners: red porphyry, under the tower of Jesus Christ. */
  coreOrder: ColumnOrder
  coreLevels: number
  coreBranchLength: number
  /** The eight around them: black basalt, under the Evangelists. */
  armOrder: ColumnOrder
  armLevels: number
  armBranchLength: number
  /** Crown over the crossing itself. */
  crown: number
  /** Crown over the transept arms. */
  armCrown: number
}

/**
 * The transept arms.
 *
 * A Latin cross has arms, and until now this one had none: the crossing was
 * fifteen metres of the nave with its vaults raised, ending on the nave's own
 * wall line. The published figures settle how far it should stand out — the
 * Basilica is **90 m long and 60 m wide** against a nave of **45 m**, and the
 * difference is 7.5 m a side, which is one module exactly.
 *
 * So an arm is not a new kind of thing here. It is one more **band** on the
 * crossing's own two stations, outboard of the outer aisle: two more columns
 * a station, one more cell a strip, and the wall and the clerestory that
 * `buildWalls` already derives from a band being lower than the one inside
 * it. The grid does the rest.
 *
 * Worth recording against it: Gaudí's own published plan does **not** draw
 * the projection. Measured off it — the scale bar gives 7.03 px to the metre
 * and the column lines land on ±7.5, ±15 and ±22.5 to within a quarter of a
 * metre — the body walls run straight from the Glory end to the chevet, and
 * the sixty metres is made up by seven and a half metres of wall, chapel and
 * stair turret on each flank rather than by an arm you can stand in. Both
 * readings give the same outside width. This one gives a transept.
 */
export interface TranseptParams {
  show: boolean
  /** How far the arms stand out past the outermost nave band. */
  reach: number
  order: ColumnOrder
  levels: number
  branchLength: number
  /** Crown of the arm's vault — an aisle's, so a clerestory appears above it. */
  crown: number
}

export interface ChurchParams {
  /** The module, and the distance between columns in both directions. */
  station: number
  /** Bays from the Glory wall to the crossing. Six of them is 45 m. */
  naveBays: number
  /** Across the church, from the centreline out. The first is the central nave. */
  bands: BandParams[]
  crossing: CrossingParams
  apse: ApseParams
  /** Shape shared by every tree; order and branching come from the band. */
  tree: TreeShape
  vault: VaultShape
  walls: WallParams
  /** The arms of the cross, and how far they stand out. */
  transept: TranseptParams
  floor: FloorParams
  /** Terraces, parapets and the three fronts. */
  shell: ShellParams
  /** The eighteen. */
  towers: TowerParams
}

export const defaultChurch: ChurchParams = {
  station: MODULE,
  naveBays: 6,
  bands: [
    // 15 m across and 45 m up: two modules and six. Eight-pointed grey
    // granite, which the Basilica's own booklet states outright.
    //
    // One branching, and it was two until the frame was measured. A trunk of
    // sixteen metres under a forty-five metre vault can be spanned either
    // way: two branchings put the springing at 35 m and one puts it at 27,
    // leaving the vault eighteen metres of rise instead of ten. Twelve shafts
    // per column against four is the difference, and on a 7.5 m grid every
    // sightline crosses several canopies — so the second branching does not
    // read as structure, it reads as thicket, and it hides the vault behind
    // it. Measured on a frame looking up the nave: the central vault went
    // from 2.6% of the picture to 14%, and the fraction of neighbouring
    // pixels landing on different surfaces fell by a tenth. The booklet says
    // the columns branch "in some cases several times" — the crossing is one
    // of those cases, and the nave is not.
    { name: 'central nave', outer: MODULE, crown: VAULT_HEIGHT.nave, order: 8, levels: 1, branchLength: 0.95, skylight: true },
    // 7.5 m aisles at 30 m. Six-pointed sandstone, which is documented, and
    // one branching, which is what a twelve-metre trunk needs to reach a
    // thirty-metre vault with rise to spare.
    { name: 'inner aisle', outer: MODULE * 2, crown: VAULT_HEIGHT.sideAisle, order: 6, levels: 1, branchLength: 0.95, skylight: false },
    { name: 'outer aisle', outer: MODULE * 3, crown: VAULT_HEIGHT.sideAisle, order: 6, levels: 1, branchLength: 0.95, skylight: false },
  ],
  crossing: {
    span: MODULE * 2,
    coreOrder: 12,
    coreLevels: 2,
    coreBranchLength: 0.8,
    armOrder: 10,
    armLevels: 1,
    armBranchLength: 0.95,
    crown: VAULT_HEIGHT.crossing,
    armCrown: VAULT_HEIGHT.nave,
  },
  apse: {
    radius: MODULE * 2,
    columns: 10,
    chapels: 7,
    ambulatory: MODULE,
    order: 8,
    levels: 2,
    branchLength: 0.95,
    ambulatoryOrder: 6,
    ambulatoryLevels: 1,
    ambulatoryBranchLength: 0.95,
    ambulatoryCrown: VAULT_HEIGHT.sideAisle,
    crown: VAULT_HEIGHT.apse,
    lanternFoot: MODULE * 8,
    skylightRadius: 3.4,
    overhang: 1.5,
    landing: 9,
    wall: { show: true, thickness: 0.9, margin: 1.1, mullion: 0.55, sill: 3.2, head: 24 },
    // Eight risers of a quarter of a metre. Steeper than a stair anyone
    // would design for a corridor, and that is what the photographs of the
    // real flight count: this is a ceremonial approach, not a circulation
    // route. Eleven metres wide keeps it clear of the porphyry columns at
    // ±7.5 by the better part of a metre.
    platform: { overhang: 1, height: 2, risers: 8, tread: 0.44, width: 11 },
  },
  tree: {
    branches: 4,
    subBranches: 2,
    // Twelve degrees, not the twenty-one a single bay could afford. The
    // constraint is the grid: columns stand 7.5 m apart, so a canopy that
    // reaches further than half of that crosses the axis of the next column
    // along, and the forest stops reading as trees standing in rows. It is
    // also steeper than it looks — a nave column is a 16 m trunk under a 45 m
    // vault, so almost all of what the limbs do is climb.
    splayDeg: 12,
    phaseDeg: 45,
    knotRadiusScale: 1.14,
    knotHeightScale: 1.95,
    taper: 0.72,
    stages: 3,
  },
  vault: {
    skylightRadius: 1.3,
    // A swelling one and two-thirds of the shaft's own girth, flaring to
    // twice that and stopping. Both are ratios on the column, not on the
    // cell: a boss that is sized to its cell ends up four metres wide and
    // standing in the next room.
    bossScale: 1.7,
    bossFlare: 2,
    // The funnel comes most of the way down to the springing. It has the
    // whole cell to cover now, so it may as well be a vault rather than a
    // lid — and the branches reach up into it.
    meetFraction: 0.35,
    spread: 1.03,
    skylightMargin: 0.6,
  },
  walls: {
    show: true,
    offset: 1.9,
    thickness: 0.9,
    margin: 1.1,
    mullion: 0.55,
    lights: 3,
    lowSill: 3.2,
    lowHead: 17,
    clerestoryOffset: 0.55,
    clerestoryRise: 0.2,
    clerestoryCrest: 4,
    glory: true,
  },
  // One module out, and the aisle's own order and crown: an arm is an aisle
  // that happens to run the other way.
  transept: {
    show: true,
    reach: MODULE,
    order: 6,
    levels: 1,
    branchLength: 0.95,
    crown: VAULT_HEIGHT.sideAisle,
  },
  floor: { ...defaultFloor },
  shell: { ...defaultShell },
  towers: { ...defaultTowers },
}

export interface Church {
  /** Everything drawn once: the walls, their glass, the presbytery floor. */
  group: THREE.Group
  /** Everything drawn many times: columns, funnels, bosses. */
  field: InstancedField
  /** Geometries owned by `group`, so callers can dispose the lot. */
  geometries: THREE.BufferGeometry[]
  /** Where the central nave's branches hand off to its vault. */
  springHeight: number
  /** Centre of every skylight. */
  skylights: THREE.Vector3[]
  columnPositions: THREE.Vector3[]
  /** What the camera needs in order to walk here. */
  envelope: ChurchEnvelope
  /** What the whole assembly occupies, instances included. */
  bounds: THREE.Box3
  /** Ends of the church along z, for framing and for the camera. */
  extent: { near: number; far: number }
  /** Half the width of the nave, inner face to centreline. */
  halfWidth: number
  /** Springing of each band's vault, for the record. */
  springs: number[]
  /** Where the crossing is, for framing. */
  crossingZ: number
  apse: Apse
  /** What the paving pattern needs in order to be set out on the plan. */
  paving: PavingPlan
  /** The transept arms, inside faces, or null where they do not project. */
  arm: { halfWidth: number; near: number; far: number } | null
  /** The eighteen, where they stand and how tall. */
  towers: TowerSite[]
  /** The top of the tallest thing in the model. */
  peak: number
  /**
   * The highest vault — the top of the tallest *room*, as against the tallest
   * tower. What roofs air and what merely stands in it are different
   * questions, and the volumetric medium needs the first one.
   */
  ceiling: number
}

export function buildChurch(
  p: ChurchParams,
  stones: Quarry,
  glass: THREE.Material,
  paving: THREE.Material,
): Church {
  const parts = new Parts(stones, glass, paving)

  const bays = Math.max(1, Math.round(p.naveBays))
  // The nave is centred on the origin, because every curated view is framed
  // from inside it and they are the regression harness.
  const gloryLine = (bays / 2) * p.station
  const crossNear = -gloryLine
  const crossFar = crossNear - p.crossing.span

  const outermostBand = p.bands[p.bands.length - 1]!
  const outermost = outermostBand.outer

  // The crossing is the nave's own bands with the orders stepped up and the
  // crowns raised — same lines, same grid, different load.
  const crossingBands: BandParams[] = p.bands.map((band, index) =>
    index === 0
      ? {
          ...band,
          crown: p.crossing.crown,
          order: p.crossing.coreOrder,
          levels: p.crossing.coreLevels,
          branchLength: p.crossing.coreBranchLength,
          skylight: true,
        }
      : {
          ...band,
          crown: p.crossing.armCrown,
          order: p.crossing.armOrder,
          levels: p.crossing.armLevels,
          branchLength: p.crossing.armBranchLength,
          skylight: true,
        },
  )

  // The arms: one more band outboard of the outer aisle, on the crossing's
  // own two stations. Everything that follows — two more columns a station,
  // one more cell a strip, the wall at the arm's end and the clerestory over
  // it — falls out of the band being there.
  const arms = p.transept.show && p.transept.reach > 0
  const armOuter = outermost + p.transept.reach
  if (arms) {
    crossingBands.push({
      name: 'transept arm',
      outer: armOuter,
      crown: p.transept.crown,
      order: p.transept.order,
      levels: p.transept.levels,
      branchLength: p.transept.branchLength,
      skylight: false,
    })
  }

  // Transverse lines: the nave's, then the two that bound the crossing. The
  // line at `crossNear` is shared — it is the nave's last and the crossing's
  // first — and it carries the crossing's orders, which is why the twelve
  // apostles stand where they do without anyone placing them.
  for (let i = 0; i < bays; i++) {
    buildStation(parts, { z: gloryLine - i * p.station, bands: p.bands }, p.tree, p.vault)
  }
  buildStation(parts, { z: crossNear, bands: crossingBands }, p.tree, p.vault)
  buildStation(parts, { z: crossFar, bands: crossingBands }, p.tree, p.vault)

  const strips: Strip[] = []
  for (let i = 0; i < bays; i++) {
    strips.push({
      near: gloryLine - i * p.station,
      far: gloryLine - (i + 1) * p.station,
      bands: p.bands,
    })
  }
  strips.push({ near: crossNear, far: crossFar, bands: crossingBands })

  const skylights: THREE.Vector3[] = []
  for (const strip of strips) {
    skylights.push(...buildStrip(parts, strip, p.tree, p.vault))
  }

  const apse = buildApse(parts, p.apse, crossFar, p.tree, p.vault)
  skylights.push(apse.skylight)

  const springs = p.bands.map((band) => springOf(parts, band, p.tree))
  const crossingSprings = crossingBands.map((band) => springOf(parts, band, p.tree))

  const wallCentre = outermost + p.walls.offset
  const halfWidth = p.walls.show ? wallCentre - p.walls.thickness / 2 : outermost + 12

  const armWallCentre = armOuter + p.walls.offset

  const doors: Doorway[] = []
  if (p.walls.show) {
    for (const [index, strip] of strips.entries()) {
      // 0 at the Glory end, 1 at the crossing.
      const along = strips.length > 1 ? index / (strips.length - 1) : 1
      buildWalls(parts, p, strip, along, index, index === strips.length - 1, doors)
    }
    if (p.walls.glory) buildGloryWall(parts, p, gloryLine + p.walls.offset, doors)
    // The two short returns that close an arm along the nave axis. Without
    // them the building has a seven-and-a-half metre hole at each of the
    // four re-entrant corners of the cross.
    if (arms) buildArmReturns(parts, p, wallCentre, armWallCentre, crossNear, crossFar)
  }

  // The outside faces of the plan, as one shape. The pavement is cut to it,
  // the steps are it asked for again with a bigger apron, and the walker is
  // held off it from the plaza — three things that have to agree exactly, so
  // they are written once.
  const outside: FootprintParams = {
    halfWidth: wallCentre + p.walls.thickness / 2,
    near: gloryLine + p.walls.offset + p.walls.thickness / 2,
    mouthZ: crossFar,
    apseCentreZ: apse.centreZ,
    apseRadius: apse.outerRadius + p.walls.thickness / 2,
    arm: arms
      ? {
          halfWidth: armWallCentre + p.walls.thickness / 2,
          near: crossNear,
          far: crossFar,
        }
      : undefined,
  }

  // The pavement is laid last, because it is cut to the building's own
  // outline and the outline is not known until the walls have been placed.
  const risers = Math.max(1, Math.round(p.floor.steps))
  const step = {
    going: p.floor.going,
    rise: p.floor.podium / risers,
    risers,
  }
  if (p.floor.show) {
    const lid = buildLid(footprint(outside, p.floor.apron))
    parts.piece(named('pavement', lid, parts.paving), lid)

    // The podium's edge is a flight, not a skirt: see `buildBase`.
    const base = buildBase(outside, p.floor.apron, step)
    parts.piece(named('base-treads', base.treads, parts.paving), base.treads)
    parts.piece(named('base-risers', base.risers, parts.stone('facade')), base.risers)
  }

  // Outside. The terraces close every vessel at its own crown, the three
  // fronts stand as massing, and the eighteen towers spring off the result —
  // which is why this comes after the walls and not before them: a tower has
  // to know the height of the roof it grows out of.
  const wallOuter = wallCentre + p.walls.thickness / 2
  const gloryOuter = gloryLine + p.walls.offset + p.walls.thickness / 2
  const clerOuter = p.bands[0]!.outer + p.walls.clerestoryOffset + p.walls.thickness / 2
  const aisleCrown = outermostBand.crown
  const apseOuter = apse.outerRadius + p.apse.wall.thickness / 2

  let peak = ceilingOf(p)
  let reach = Math.max(wallOuter, arms ? armWallCentre + p.walls.thickness / 2 : 0) + 4

  if (p.shell.show) {
    const shell = buildShell(
      parts,
      {
        gloryZ: gloryOuter,
        wallX: wallOuter,
        clerX: clerOuter,
        crossNear,
        crossFar,
        crossingZ: (crossNear + crossFar) / 2,
        naveCrown: p.bands[0]!.crown,
        aisleCrown,
        crossingCrown: p.crossing.crown,
        armCrown: p.crossing.armCrown,
        transept: arms
          ? {
              outerX: armWallCentre + p.walls.thickness / 2,
              innerX: outermost + p.walls.clerestoryOffset,
              near: crossNear,
              far: crossFar,
              crown: p.transept.crown,
            }
          : null,
        apseCentreZ: apse.centreZ,
        apseInner: p.apse.radius + p.apse.overhang,
        apseOuter,
        ambulatoryCrown: p.apse.ambulatoryCrown,
      },
      p.shell,
      // The apse's own opening is at 75 m and no terrace is anywhere near
      // it, so one radius for the lot is exact rather than merely close.
      skylights.map((light) => ({
        x: light.x,
        y: light.y,
        z: light.z,
        radius: p.vault.skylightRadius,
      })),
    )
    peak = Math.max(peak, shell.peak)
    reach = Math.max(reach, shell.reach)
  }

  const transeptFace = arms ? armWallCentre + p.walls.thickness / 2 : wallOuter
  const sites = towerSites({
    crossingZ: (crossNear + crossFar) / 2,
    crossNear,
    crossFar,
    crossingCrown: p.crossing.crown,
    armCrown: p.crossing.armCrown,
    naveCrown: p.bands[0]!.crown,
    wallX: transeptFace,
    gloryZ: gloryOuter,
    apseCentreZ: apse.centreZ,
    apseCrown: p.apse.crown,
    parapet: p.shell.show ? p.shell.parapet : 0,
    facadeStand: p.shell.show ? p.shell.project / 2 : 0,
  })
  const towers = p.towers.show
    ? buildTowers(parts, sites, p.towers)
    : { sites: [] as TowerSite[], peak: 0 }
  peak = Math.max(peak, towers.peak)

  const armInside = arms
    ? {
        halfWidth: armWallCentre - p.walls.thickness / 2,
        near: crossNear,
        far: crossFar,
      }
    : null

  const field = new InstancedField(parts.specs())

  const ceiling = Math.max(p.crossing.crown, p.apse.crown, ...p.bands.map((b) => b.crown))
  const outerPlan: Plan2D = {
    halfWidth: outside.halfWidth,
    near: outside.near,
    far: outside.mouthZ,
    apse: { centreZ: outside.apseCentreZ, radius: outside.apseRadius },
    arm: outside.arm,
  }
  const envelope = new ChurchEnvelope({
    halfWidth,
    near: gloryLine + p.walls.offset,
    far: crossFar,
    ceiling,
    floor: 0,
    apse: { centreZ: apse.centreZ, radius: apse.outerRadius - p.walls.thickness },
    columns: parts.columns,
    terraces: [apse.terrace],
    arm: armInside ?? undefined,
    outer: outerPlan,
    doors,
    base: p.floor.show
      ? { apron: p.floor.apron, going: step.going, rise: step.rise, risers: step.risers }
      : undefined,
  })

  // What the whole thing occupies, towers included — the sun rig fits its
  // shadow map to this, so leaving the towers out of it would leave them out
  // of their own shadows.
  const bounds = new THREE.Box3(
    new THREE.Vector3(-reach, -p.floor.podium, apse.far - 6),
    new THREE.Vector3(reach, peak + 2, gloryOuter + p.shell.project + MODULE + 2),
  )

  const group = parts.group
  return {
    group,
    field,
    geometries: parts.geometries,
    springHeight: springs[0]!,
    skylights,
    columnPositions: parts.columns.map((c) => new THREE.Vector3(c.x, 0, c.z)),
    envelope,
    bounds,
    extent: { near: gloryLine + p.walls.offset, far: apse.far },
    halfWidth,
    springs: [...springs, ...crossingSprings.slice(0, 2), ...apse.springs],
    crossingZ: (crossNear + crossFar) / 2,
    apse,
    paving: {
      apseCentreZ: apse.centreZ,
      apseMouthZ: crossFar,
      chapels: p.apse.chapels,
      // Four to a chapel bay, so both the chapel divisions and the radii the
      // ten columns stand on land on a joint rather than between two.
      radialsPerChapel: 4,
      crossingZ: (crossNear + crossFar) / 2,
    },
    arm: armInside,
    towers: towers.sites,
    peak,
    ceiling,
  }
}

/** The highest vault, which is what the shell has to close over. */
function ceilingOf(p: ChurchParams): number {
  return Math.max(p.crossing.crown, p.apse.crown, ...p.bands.map((b) => b.crown))
}

/**
 * The side walls of one strip, and the clerestory that rides above them.
 *
 * Neither height is typed in. The outer wall stands as high as the vault it
 * closes, and a clerestory exists exactly where one band's vault is higher
 * than the next one out — which is the definition of a basilica, and which
 * makes the crossing's own lantern wall appear without being asked for.
 */
function buildWalls(
  parts: Parts,
  p: ChurchParams,
  strip: Strip,
  along: number,
  seed: number,
  /** Whether this strip is the one the transept fronts close. */
  transeptEnd: boolean,
  /** Collects the ways through, for the walker. */
  doors: Doorway[],
): void {
  const span = Math.abs(strip.near - strip.far)
  const centre = (strip.near + strip.far) / 2
  const w = p.walls
  const outerBand = strip.bands[strip.bands.length - 1]!
  const grade = strip.bands[0]!.crown
  // Each strip closes on its own outermost band, which is how the wall
  // follows the plan out into an arm without being told that arms exist.
  const wallCentre = outerBand.outer + w.offset

  for (const [sign, side] of [
    [1, 'nativity'],
    [-1, 'passion'],
  ] as const) {
    const outer = defaultClerestory(span, outerBand.crown, side)
    outer.thickness = w.thickness
    outer.margin = w.margin
    outer.mullion = w.mullion
    outer.gradeHeight = grade
    outer.along = along
    // A different seed per bay, so the glazing does not repeat down the nave
    // the way the stone does.
    outer.seed += seed * 97
    // The transept fronts are the two doors this building is entered by, and
    // the wall behind each one is the wall this loop is building.
    const doorway = transeptEnd ? doorsFor(p, 0, span) : null
    outer.registers = []
    if (doorway) {
      outer.registers.push(doorway)
      // The wall a quarter turn about y sends its own x to world z, and which
      // way depends on the side. The openings are symmetric about the middle
      // of the front, so both sides come out the same — but the sign is still
      // written down, because agreeing by accident is not agreeing.
      for (const opening of doorway.openings ?? []) {
        doors.push({
          x: sign * wallCentre,
          z: centre - sign * opening.centre,
          nx: sign,
          nz: 0,
          halfWidth: opening.width / 2,
        })
      }
    }
    outer.registers.push(
      ...over(doorway, {
        sill: w.lowSill,
        head: Math.min(w.lowHead, outerBand.crown - 3),
        lights: w.lights,
        panesAcross: 4,
        panesUp: 12,
      }),
    )
    // A wall that closes a transept end is not an aisle wall with a taller
    // top; it gets a second register, which is what makes the Nativity and
    // Passion fronts read as façades from inside as well as out.
    if (outerBand.crown > 35 || transeptEnd) {
      outer.registers.push({
        sill: Math.max(outerBand.crown - 13, w.lowHead + 2),
        head: outerBand.crown - 4,
        lights: w.lights,
        panesAcross: 3,
        panesUp: 8,
      })
    }
    addWall(parts, outer, sign * wallCentre, centre, (sign * Math.PI) / 2)

    for (let band = 0; band + 1 < strip.bands.length; band++) {
      const inner = strip.bands[band]!
      const next = strip.bands[band + 1]!
      const storey = inner.crown - next.crown
      if (storey < 6) continue

      const high = defaultClerestory(span, inner.crown - 1, side)
      high.thickness = w.thickness
      high.base = next.crown
      high.margin = w.margin
      high.mullion = w.mullion
      high.gradeHeight = grade
      high.along = along
      high.seed += seed * 97 + 5 + band * 3
      high.registers = [
        {
          sill: next.crown + storey * w.clerestoryRise,
          head: inner.crown - w.clerestoryCrest,
          lights: w.lights,
          panesAcross: 3,
          panesUp: 8,
        },
      ]
      addWall(parts, high, sign * (inner.outer + w.clerestoryOffset), centre, (sign * Math.PI) / 2)
    }
  }
}

/**
 * The two short walls that close an arm along the nave axis.
 *
 * They span exactly the arm's reach, from the nave's wall line out to the
 * arm's, and they stand as high as the arm's own vault. Nothing here is
 * glazed twice: these face along the building rather than out of it, so they
 * take one register like an aisle wall.
 */
function buildArmReturns(
  parts: Parts,
  p: ChurchParams,
  wallCentre: number,
  armWallCentre: number,
  near: number,
  far: number,
): void {
  const w = p.walls
  const span = armWallCentre - wallCentre
  if (span <= 0) return

  for (const sign of [1, -1] as const) {
    for (const [index, z] of [near, far].entries()) {
      const panel = defaultClerestory(span, p.transept.crown, sign > 0 ? 'nativity' : 'passion')
      panel.thickness = w.thickness
      panel.margin = w.margin
      panel.mullion = w.mullion
      panel.gradeHeight = p.bands[0]!.crown
      panel.along = 1
      panel.seed += 211 + index * 13 + (sign > 0 ? 5 : 0)
      panel.registers = [
        {
          sill: w.lowSill,
          head: Math.min(w.lowHead, p.transept.crown - 3),
          lights: 2,
          panesAcross: 4,
          panesUp: 12,
        },
      ]
      addWall(parts, panel, sign * (wallCentre + span / 2), z, 0)
    }
  }
}

/**
 * The Glory end.
 *
 * Three panels rather than one, because the wall has to be as tall as
 * whatever stands behind it and the five naves are not all the same height.
 * The stepped silhouette is the section of the building, seen end on.
 */
function buildGloryWall(parts: Parts, p: ChurchParams, z: number, doors: Doorway[]): void {
  const w = p.walls
  for (const [index, band] of p.bands.entries()) {
    const inner = index === 0 ? 0 : p.bands[index - 1]!.outer
    const width = index === 0 ? band.outer * 2 : band.outer - inner
    const centres = index === 0 ? [0] : [-(inner + width / 2), inner + width / 2]

    for (const x of centres) {
      const side = x >= 0 ? 'nativity' : 'passion'
      const panel = defaultClerestory(width, band.crown, side)
      panel.thickness = w.thickness
      panel.margin = w.margin
      panel.mullion = w.mullion
      panel.gradeHeight = p.bands[0]!.crown
      // The Glory end is where the walk starts, and the glass there is at the
      // bright end of the grade.
      panel.along = 0
      panel.seed += index * 41 + (x > 0 ? 7 : 0)
      const doorway = doorsFor(p, x, width)
      panel.registers = []
      if (doorway) {
        panel.registers.push(doorway)
        for (const opening of doorway.openings ?? []) {
          doors.push({ x: x + opening.centre, z, nx: 0, nz: 1, halfWidth: opening.width / 2 })
        }
      }
      panel.registers.push(
        ...over(doorway, {
          sill: w.lowSill,
          head: Math.min(w.lowHead, band.crown - 3),
          lights: Math.max(2, Math.round(width / 5)),
          panesAcross: 4,
          panesUp: 12,
        }),
      )
      if (band.crown > 35) {
        panel.registers.push({
          sill: band.crown - 15,
          head: band.crown - 4,
          lights: 3,
          panesAcross: 4,
          panesUp: 10,
        })
      }
      addWall(parts, panel, x, z, 0)
    }
  }
}

/**
 * The doorway register for a panel of wall standing behind a front.
 *
 * A window divides the wall it is in and needs to know nothing else. A door
 * has to line up with the gap between two piers of the façade in front of it,
 * and the façade sets those out on the module without knowing which panel of
 * wall is behind which gap. So the front is asked where its portals are, the
 * ones that fall within this panel are kept, and the register is handed them
 * outright.
 *
 * It falls out of the grid that the Glory end gets four — two in the central
 * panel and one in each of the inner aisles — and each transept front two,
 * and that the outer aisles and the two outer portals of a front, which stand
 * in front of no wall at all, get none.
 */
function doorsFor(p: ChurchParams, centre: number, width: number): RegisterParams | null {
  const openings = portals(p.shell.pier)
    .filter((gap) => Math.abs(gap.centre - centre) + gap.width / 2 <= width / 2 + 1e-4)
    .map((gap) => ({ centre: gap.centre - centre, width: gap.width }))
  if (openings.length === 0) return null
  return {
    sill: 0,
    head: p.shell.doorHeight,
    lights: openings.length,
    panesAcross: 1,
    panesUp: 1,
    glazed: false,
    openings,
  }
}

/** Stone over a doorway, so the glass above it starts clear of the lintel. */
const LINTEL = 1.6

/**
 * A wall's low window register, lifted clear of the doorway under it.
 *
 * In a bay with a door, the aisle lights cannot start at 3.2 m: they would be
 * in the head of the opening. They become the row of lights over the portals
 * instead, which is what the fronts of this building actually carry — and if
 * lifting them leaves no wall to put them in, they go.
 */
function over(
  doorway: RegisterParams | null,
  register: RegisterParams,
): RegisterParams[] {
  if (!doorway) return [register]
  const sill = Math.max(register.sill, doorway.head + LINTEL)
  if (register.head - sill < 2) return []
  return [{ ...register, sill }]
}

function addWall(
  parts: Parts,
  spec: ReturnType<typeof defaultClerestory>,
  x: number,
  z: number,
  turn: number,
): void {
  const wall = buildClerestory(spec)

  const holder = new THREE.Group()
  holder.position.set(x, 0, z)
  holder.rotation.y = turn
  holder.add(new THREE.Mesh(wall.stone, parts.stone('wall')))

  // Glass sits on its own layer so the sun rig can render it separately from
  // everything that blocks light.
  const panes = new THREE.Mesh(wall.glass, parts.glass)
  panes.layers.set(LAYER_GLASS)
  holder.add(panes)

  parts.piece(holder, wall.stone, wall.glass)
}

/** Shaft radius of whichever band stands at this x. Kept for the display. */
export function bandRadius(p: ChurchParams, x: number): number {
  const band = p.bands.find((b) => Math.abs(Math.abs(x) - b.outer) < 1e-6) ?? p.bands[0]!
  return columnMetrics(band.order).innerDiameter / 2
}

export type { BandParams, TreeColumnParams, VaultCellParams }
