import * as THREE from 'three'
import type { TreeColumnParams } from '../geometry/branch.ts'
import { columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import type { VaultCellParams } from '../geometry/vault.ts'
import { ChurchEnvelope } from '../camera/envelope.ts'
import { InstancedField } from '../render/field.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { buildApse, type Apse, type ApseParams } from './apse.ts'
import { buildClerestory, defaultClerestory } from './clerestory.ts'
import { MODULE, VAULT_HEIGHT } from './module.ts'
import { Parts } from './parts.ts'
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
}

export function buildChurch(
  p: ChurchParams,
  plaster: THREE.Material,
  glass: THREE.Material,
): Church {
  const parts = new Parts(plaster, glass)

  const bays = Math.max(1, Math.round(p.naveBays))
  // The nave is centred on the origin, because every curated view is framed
  // from inside it and they are the regression harness.
  const gloryLine = (bays / 2) * p.station
  const crossNear = -gloryLine
  const crossFar = crossNear - p.crossing.span

  const outermost = p.bands[p.bands.length - 1]!.outer

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

  if (p.walls.show) {
    for (const [index, strip] of strips.entries()) {
      // 0 at the Glory end, 1 at the crossing.
      const along = strips.length > 1 ? index / (strips.length - 1) : 1
      buildWalls(parts, p, strip, wallCentre, along, index)
    }
    if (p.walls.glory) buildGloryWall(parts, p, gloryLine + p.walls.offset)
  }

  const field = new InstancedField(parts.specs())

  const ceiling = Math.max(p.crossing.crown, p.apse.crown, ...p.bands.map((b) => b.crown))
  const envelope = new ChurchEnvelope({
    halfWidth,
    near: gloryLine + p.walls.offset,
    far: crossFar,
    ceiling,
    floor: 0,
    apse: { centreZ: apse.centreZ, radius: apse.outerRadius - p.walls.thickness },
    columns: parts.columns,
  })

  const reach = halfWidth + p.walls.thickness + 4
  const bounds = new THREE.Box3(
    new THREE.Vector3(-reach, 0, apse.far - 6),
    new THREE.Vector3(reach, ceiling + 2, gloryLine + p.walls.offset + 6),
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
  }
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
  wallCentre: number,
  along: number,
  seed: number,
): void {
  const span = Math.abs(strip.near - strip.far)
  const centre = (strip.near + strip.far) / 2
  const w = p.walls
  const outerBand = strip.bands[strip.bands.length - 1]!
  const grade = strip.bands[0]!.crown

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
    outer.registers = [
      {
        sill: w.lowSill,
        head: Math.min(w.lowHead, outerBand.crown - 3),
        lights: w.lights,
        panesAcross: 4,
        panesUp: 12,
      },
    ]
    // A wall that closes a 45 m transept arm is not an aisle wall with a
    // taller top; it gets a second register, which is what makes the
    // Nativity and Passion ends read as façades.
    if (outerBand.crown > 35) {
      outer.registers.push({
        sill: outerBand.crown - 13,
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
 * The Glory end.
 *
 * Three panels rather than one, because the wall has to be as tall as
 * whatever stands behind it and the five naves are not all the same height.
 * The stepped silhouette is the section of the building, seen end on.
 */
function buildGloryWall(parts: Parts, p: ChurchParams, z: number): void {
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
      panel.registers = [
        {
          sill: w.lowSill,
          head: Math.min(w.lowHead, band.crown - 3),
          lights: Math.max(2, Math.round(width / 5)),
          panesAcross: 4,
          panesUp: 12,
        },
      ]
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
  holder.add(new THREE.Mesh(wall.stone, parts.plaster))

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
