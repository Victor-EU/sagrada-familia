import * as THREE from 'three'
import { columnMetrics, type ColumnOrder } from '../geometry/column.ts'
import { flareFor, vaultSurface } from '../geometry/vault.ts'
import type { Terrace } from '../camera/envelope.ts'
import { LAYER_GLASS } from '../render/sunrig.ts'
import { buildClerestory, defaultClerestory, type RegisterParams } from './clerestory.ts'
import { named, upright, type Parts } from './parts.ts'
import { cellFor, shapeOf, type BandParams, type TreeShape, type VaultShape } from './section.ts'

/**
 * The apse: the head of the church, and the tallest thing inside it.
 *
 * Its plan is the one place the building stops being a grid. Ten columns
 * stand on a semicircle, an ambulatory rings them, and seven chapels ring
 * that. The three numbers are not independent: seven chapels across a half
 * circle put a dividing radius every 180/7 degrees, and the ten columns stand
 * on those radii — eight of them on the chapel divisions and the last two
 * past the ends, where the ring meets the crossing. Measured off Gaudí's own
 * plan the columns come out at 12.9°, 38.6°, 64.3° and 90° from the axis,
 * which is 180/7 apart to within the thickness of the drawn line.
 *
 * Above them the great hyperboloid — one surface, throat at 75 m, the highest
 * point of the interior and the only one that is a single piece of geometry
 * rather than a field of cells.
 *
 * What is not built yet: the seven chapels themselves as rooms, the triforium
 * at 45 m, and the children's choir. The chevet here is the wall that closes
 * the ambulatory, glazed, which is what the apse needs in order to be lit.
 */
export interface ApseParams {
  /** Radius of the presbytery ring, measured to the column axes. */
  radius: number
  /** Columns on the ring. Ten, and the plan agrees. */
  columns: number
  /** Chapels in the chevet — what divides the half circle. */
  chapels: number
  /** Depth of the ambulatory beyond the ring. */
  ambulatory: number
  order: ColumnOrder
  levels: number
  branchLength: number
  /** The ring of columns that carries the ambulatory's outer edge. */
  ambulatoryOrder: ColumnOrder
  ambulatoryLevels: number
  ambulatoryBranchLength: number
  /** Crown of the ambulatory vault. */
  ambulatoryCrown: number
  /** Crown of the great vault — the highest point inside the building. */
  crown: number
  /**
   * Foot of the great skylight.
   *
   * Sixty metres, and it is what stops the apse reading as a tent. The
   * booklet lists the apse's three levels — "that of the ambulatory at 30
   * metres, that of the triforium at 45 metres and the one at the foot of the
   * great central skylight in the apse at 60 metres" — against a maximum
   * interior height of 75. So the great hyperboloid is fifteen metres of
   * lantern sitting on a drum, not thirty metres of cone landing on the
   * columns. Build it as a cone and the whole east end goes wrong.
   */
  lanternFoot: number
  /** Throat of the skylight at the top of it. */
  skylightRadius: number
  /** How far above the ring the drum stands away from it. */
  overhang: number
  /** How far above the springing the bosses reach to meet the drum. */
  landing: number
  /** The chevet wall. */
  wall: { show: boolean; thickness: number; margin: number; mullion: number; sill: number; head: number }
  /** The raised presbytery floor and the flight that climbs it. */
  platform: {
    /** How far the rim reaches past the ring of ten. */
    overhang: number
    /** Two metres, and the booklet says so. */
    height: number
    /** Risers in the flight. Eight, which is what the photographs count. */
    risers: number
    tread: number
    /** Width of the flight, kept clear of the crossing's own columns. */
    width: number
  }
}

export interface Apse {
  /** Centre of the presbytery circle, on the axis. */
  centreZ: number
  /** Furthest point of the ambulatory wall from the crossing. */
  far: number
  /** Outer radius, to the chevet wall. */
  outerRadius: number
  /** Springing of the presbytery ring and of the ambulatory ring. */
  springs: number[]
  /** Centre of the great skylight. */
  skylight: THREE.Vector3
  /** The presbytery platform and its flight, as the camera needs to read them. */
  terrace: Terrace
}

/**
 * Build the apse, its mouth on the crossing's far line.
 *
 * The presbytery circle is centred one radius in from that line, so the ring
 * closes exactly on it and the apse occupies `radius * 2` of length — thirty
 * metres, which is what the plan measures and what the published ninety
 * metres of inside length needs once the nave's forty-five and the crossing's
 * fifteen are spent.
 */
export function buildApse(
  parts: Parts,
  p: ApseParams,
  mouthZ: number,
  tree: TreeShape,
  vault: VaultShape,
): Apse {
  const centreZ = mouthZ - p.radius
  const outerRadius = p.radius + p.ambulatory

  const ring: BandParams = {
    name: 'presbytery',
    outer: p.radius,
    crown: p.crown,
    order: p.order,
    levels: p.levels,
    branchLength: p.branchLength,
    skylight: true,
  }
  const outer: BandParams = {
    name: 'ambulatory',
    outer: outerRadius,
    crown: p.ambulatoryCrown,
    order: p.ambulatoryOrder,
    levels: p.ambulatoryLevels,
    branchLength: p.ambulatoryBranchLength,
    skylight: false,
  }

  const ringTree = parts.treeLevels(shapeOf(ring, tree))[0]!
  const outerTree = parts.treeLevels(shapeOf(outer, tree))[0]!
  const ringSpring = ringTree.totalHeight
  const outerSpring = outerTree.totalHeight

  // Seven chapels across a half circle: a radius every 180/7 degrees, and a
  // column on every one of them.
  const step = Math.PI / p.chapels
  const angles: number[] = []
  for (let k = 0; k < Math.floor(p.columns / 2); k++) {
    angles.push(-step * (k + 0.5), step * (k + 0.5))
  }
  angles.sort((a, b) => a - b)

  const place = (radius: number, angle: number): [number, number] => [
    radius * Math.sin(angle),
    centreZ - radius * Math.cos(angle),
  ]

  for (const angle of angles) {
    const [ix, iz] = place(p.radius, angle)
    parts.column(shapeOf(ring, tree), ix, iz, { turn: -angle, crown: p.lanternFoot, vault })
    const [ox, oz] = place(outerRadius, angle)
    parts.column(shapeOf(outer, tree), ox, oz, { turn: -angle, crown: p.ambulatoryCrown, vault })
  }

  // The ambulatory: one cell between each pair of radii, laid on the radius
  // rather than on the grid. Radially it is the ambulatory's own depth;
  // around, the arc the two radii cut at mid-depth.
  const midRadius = p.radius + p.ambulatory / 2
  const spec = cellFor(vault, {
    cell: { x: 2 * midRadius * Math.sin(step / 2), z: p.ambulatory },
    crownHeight: p.ambulatoryCrown,
    springHeight: outerSpring,
    order: p.ambulatoryOrder,
    skylight: false,
    clearance: Infinity,
  })
  for (let i = 0; i + 1 < angles.length; i++) {
    const mid = (angles[i]! + angles[i + 1]!) / 2
    const [x, z] = place(midRadius, mid)
    parts.vault(spec, x, z, { turn: Math.PI - mid })
  }

  // The great vault stands on a drum, and the drum is a wall.
  //
  // Built as a hyperboloid it is a twenty-five metre tube of opaque plaster
  // over the altar, and the apse goes black — which is the opposite of what
  // the apse is for. The booklet puts windows at this level, so what stands
  // here is the same glazed panel the rest of the building's walls are made
  // of, one per bay of the ring, and the light arrives where the sources say
  // it does.
  const reach = p.radius + p.overhang

  // The lantern: throat at the crown, flaring down to close on the drum.
  const lanternDepth = p.crown - p.lanternFoot
  parts.surface(
    'apse lantern',
    (detail) =>
      vaultSurface(
        p.skylightRadius,
        flareFor(p.skylightRadius, reach, lanternDepth),
        -lanternDepth,
        0,
        reach,
        detail,
      ),
    upright(0, p.crown, centreZ),
  )

  // A swelling over each column of the ring, where the branches arrive under
  // the rim of it.
  const bossThroat = columnMetrics(p.order).inradius * vault.bossScale
  const bossReach = Math.max(bossThroat * vault.bossFlare, p.radius * Math.sin(step / 2))
  for (const angle of angles) {
    const [x, z] = place(p.radius, angle)
    parts.surface(
      'apse boss',
      (detail) =>
        vaultSurface(
          bossThroat,
          flareFor(bossThroat, bossReach, p.landing),
          0,
          p.landing,
          bossReach,
          detail,
        ),
      upright(x, ringSpring, z),
    )
  }

  // "The presbytery is a platform delineated by ten columns and raised two
  // metres above the Basilica floor" — booklet 9, and so it is: the rim runs
  // an overhang past the ring so the ten stand on it rather than at its edge.
  //
  // It used to be a bare two-metre cylinder with no way up, which is a wall,
  // not a platform. The camera walked into it and stood buried to the
  // shoulders in plaster. A flight down the axis into the crossing fixes both
  // halves of that: the approach the photographs show, and something the
  // envelope can read as a floor.
  const terraceRadius = p.radius + p.platform.overhang
  const platform = new THREE.CylinderGeometry(terraceRadius, terraceRadius, p.platform.height, 96)
  platform.translate(0, p.platform.height / 2, centreZ)
  parts.piece(named('presbytery', platform, parts.paving), platform)

  const rise = p.platform.height / p.platform.risers
  const stairFrom = centreZ + terraceRadius
  // The last tread is the floor itself, so it is a step and not a box.
  for (let k = 0; k + 1 < p.platform.risers; k++) {
    const top = p.platform.height - (k + 1) * rise
    const step = new THREE.BoxGeometry(p.platform.width, top, p.platform.tread)
    step.translate(0, top / 2, stairFrom + (k + 0.5) * p.platform.tread)
    parts.piece(named('presbytery steps', step, parts.paving), step)
  }

  // Two rings of wall: the chevet that closes the ambulatory at 30 m, and the
  // drum that carries the lantern above the presbytery.
  if (p.wall.show) {
    for (let i = 0; i + 1 < angles.length; i++) {
      const mid = (angles[i]! + angles[i + 1]!) / 2

      facet(
        outerRadius,
        mid,
        i,
        0,
        p.ambulatoryCrown,
        [{ sill: p.wall.sill, head: p.wall.head, lights: 2, panesAcross: 4, panesUp: 12 }],
      )

      facet(
        reach,
        mid,
        i + 17,
        ringSpring,
        p.lanternFoot,
        [
          {
            sill: ringSpring + 2,
            head: p.lanternFoot - 2,
            lights: 2,
            panesAcross: 3,
            panesUp: 10,
          },
        ],
      )
    }
  }

  /** One flat panel of a ring of them, facing the axis. */
  function facet(
    radius: number,
    angle: number,
    seed: number,
    base: number,
    height: number,
    registers: RegisterParams[],
  ): void {
    const [x, z] = place(radius, angle)
    const spec = defaultClerestory(
      2 * radius * Math.sin(step / 2),
      height,
      angle >= 0 ? 'nativity' : 'passion',
    )
    spec.thickness = p.wall.thickness
    spec.margin = p.wall.margin
    spec.mullion = p.wall.mullion
    spec.base = base
    // The apse is the far end of the walk, so its glass is at the deep end of
    // the grade, and graded against the height it actually reaches.
    spec.gradeHeight = height
    spec.along = 1
    spec.seed += seed * 53
    spec.registers = registers

    const built = buildClerestory(spec)
    const holder = new THREE.Group()
    holder.position.set(x, 0, z)
    holder.rotation.y = Math.PI - angle
    holder.add(new THREE.Mesh(built.stone, parts.plaster))
    const panes = new THREE.Mesh(built.glass, parts.glass)
    panes.layers.set(LAYER_GLASS)
    holder.add(panes)
    parts.piece(holder, built.stone, built.glass)
  }

  return {
    centreZ,
    far: centreZ - outerRadius,
    outerRadius,
    springs: [ringSpring, outerSpring],
    skylight: new THREE.Vector3(0, p.crown, centreZ),
    terrace: {
      centreZ,
      radius: terraceRadius,
      top: p.platform.height,
      stair: {
        halfWidth: p.platform.width / 2,
        from: stairFrom,
        to: stairFrom + p.platform.risers * p.platform.tread,
        rise,
        tread: p.platform.tread,
      },
    },
  }
}
