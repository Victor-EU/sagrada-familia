import * as THREE from 'three'
import type { ColumnOrder } from '../geometry/column.ts'
import {
  buildCross,
  buildPinnacle,
  buildStar,
  buildTowerShaft,
  type TowerOpenings,
} from '../geometry/tower.ts'
import { named, type Parts } from './parts.ts'
import { MODULE } from './module.ts'

/**
 * The eighteen towers, placed by the plan rather than by hand.
 *
 * Their heights are published to the tenth of a metre and there is no reason
 * to invent any of them:
 *
 *  - **Jesus Christ, 172.5 m**, over the crossing, and the number is chosen
 *    rather than arrived at: half a metre below Montjuïc, because Gaudí would
 *    not have a work of man stand taller than a work of God. The last 13.5 m
 *    of it is the four-armed cross, installed in 2025.
 *  - **the Virgin Mary, 138 m**, over the apse, finished in 2021 and topped
 *    with a twelve-pointed star.
 *  - **the four Evangelists, 135 m**, around the tower of Jesus Christ.
 *  - **the twelve Apostles**, four to each of the three façades, "between
 *    98.4 and 117 metres" — the Nativity's at 98.4 and 107, the Passion's at
 *    107 and 112, and the Glory's, which are the tallest and are not built,
 *    at 112 and 117. The outer pair of each four is the shorter, so every
 *    façade rises toward its own middle and the three of them rise toward the
 *    Glory end.
 *
 * Where they stand is the grid's business and not a designer's. Each apostle
 * tower is **one module across**, and four of them side by side is the thirty
 * metres of the transept front; the tower of Jesus Christ is three modules
 * across, which is what it takes to cover the fifteen-metre square of
 * porphyry columns it stands on; the Evangelists are a module and a half and
 * stand on the four inner basalt columns, where they come out just touching
 * the central tower, which is how the photographs show them.
 *
 * The one number here that is this project's own rather than published is a
 * tower's **order**: the section of each central tower is the star of the
 * columns it stands on — twelve for Jesus on porphyry, ten for the
 * Evangelists on basalt, eight for Mary over the apse. The bell towers are
 * twelve regardless, because that one is documented.
 *
 * Nothing starts at the ground. A tower springs from the roof it grows out
 * of, which is what you see from the street, and it is also the truth: the
 * mass below the springing is façade and vault, not shaft.
 */

export type TowerCrown = 'pinnacle' | 'cross' | 'star' | 'finial'

export interface TowerSite {
  name: string
  /** Published height above the Basilica floor, to the very top. */
  top: number
  x: number
  z: number
  /**
   * The terrace the tower stands on. The shaft's widest ring sits here and
   * the paraboloid climbs from it — nothing of a tower is ever below this
   * line, or it would be hanging inside the building.
   */
  foot: number
  /** Inscribed radius of the section at the foot. */
  radius: number
  points: ColumnOrder
  crown: TowerCrown
}

export interface TowerParams {
  show: boolean
  /** The twelve on the façades. */
  apostles: boolean
  /** Jesus, Mary and the four Evangelists. */
  central: boolean
  /** How much star there is in the section at the foot; 0 is a circle. */
  star: number
  /** Turn of the section between foot and top, degrees. */
  twistDeg: number
  /** What is left of the foot radius at the top of the shaft. */
  taper: number
  /** Rows of apertures up a shaft, and how much of a cell each one opens. */
  bands: number
  tall: number
  wide: number
  /** Bays the aperture pattern drifts round between bottom row and top. */
  helix: number
  /** Stone shown at an aperture's edge, metres. */
  reveal: number
  /** Pinnacle height as a fraction of what stands above the foot. */
  pinnacle: number
}

export const defaultTowers: TowerParams = {
  show: true,
  apostles: true,
  central: true,
  star: 1,
  // Gentle. The ribs of the real towers lean rather than spiral, and a shaft
  // that turns much more than this reads as a drill bit at this slenderness.
  twistDeg: 22,
  taper: 0.44,
  bands: 11,
  tall: 0.52,
  wide: 0.5,
  helix: 1,
  reveal: 0.45,
  pinnacle: 0.17,
}

/** The published crown heights, which come out of the tower's total. */
const CROSS_HEIGHT = 13.5
/** The star is 7.5 m across, which is one module. */
const STAR_SPAN = MODULE

export interface TowerPlan {
  /** Crossing centre and the two lines that bound it. */
  crossingZ: number
  crossNear: number
  crossFar: number
  /** Crown over the crossing, over the arms, and over the nave. */
  crossingCrown: number
  armCrown: number
  naveCrown: number
  /** Outside face of the Glory wall, and of whatever closes the transept. */
  wallX: number
  gloryZ: number
  /** Apse centre and the height of its lantern. */
  apseCentreZ: number
  apseCrown: number
  /** The parapet the terraces carry, which is the level a tower stands on. */
  parapet: number
  /** How far out past the wall face a façade's tower axes stand. */
  facadeStand: number
}

/**
 * Where the eighteen stand.
 *
 * A façade carries four towers on the module, so their axes fall at a module
 * and a half and half a module either side of the façade's own centre — thirty
 * metres of front, which is the published width of the transept.
 */
export function towerSites(p: TowerPlan): TowerSite[] {
  const sites: TowerSite[] = []
  // One module across, so four of them side by side is the thirty metres the
  // transept front is published at.
  const radius = MODULE / 2
  const spread = [-1.5, -0.5, 0.5, 1.5].map((n) => n * MODULE)

  /** One façade's four, outer pair short, inner pair tall. */
  const facade = (
    dedications: string[],
    outerTop: number,
    innerTop: number,
    roof: number,
    place: (offset: number) => { x: number; z: number },
  ): void => {
    for (const [i, offset] of spread.entries()) {
      const { x, z } = place(offset)
      sites.push({
        name: dedications[i] ?? 'apostle',
        top: i === 0 || i === 3 ? outerTop : innerTop,
        x,
        z,
        foot: roof + p.parapet,
        radius,
        points: 12,
        crown: 'pinnacle',
      })
    }
  }

  // The transept fronts. Nativity is +x and Passion −x, which is the sense
  // the walls already use.
  facade(
    ['Barnabas', 'Simon', 'Jude', 'Matthias'],
    98.4,
    107,
    p.armCrown,
    (offset) => ({ x: p.wallX + p.facadeStand, z: p.crossingZ + offset }),
  )
  facade(
    ['James the Less', 'Bartholomew', 'Thomas', 'Philip'],
    107,
    112,
    p.armCrown,
    (offset) => ({ x: -(p.wallX + p.facadeStand), z: p.crossingZ + offset }),
  )
  // The Glory end, and the four tallest of the twelve.
  facade(
    ['Andrew', 'Peter', 'Paul', 'James the Great'],
    112,
    117,
    p.naveCrown,
    (offset) => ({ x: offset, z: p.gloryZ + p.facadeStand }),
  )

  sites.push({
    name: 'Jesus Christ',
    top: 172.5,
    x: 0,
    z: p.crossingZ,
    foot: p.crossingCrown + p.parapet,
    radius: MODULE * 1.5,
    points: 12,
    crown: 'cross',
  })
  sites.push({
    name: 'Virgin Mary',
    top: 138,
    x: 0,
    z: p.apseCentreZ,
    // Over the lantern, whose last few metres become the foot of the tower
    // rather than being hidden by it.
    foot: p.apseCrown - 5,
    radius: MODULE,
    points: 8,
    crown: 'star',
  })
  for (const x of [MODULE * 2, -MODULE * 2]) {
    for (const z of [p.crossNear, p.crossFar]) {
      sites.push({
        name: 'Evangelist',
        top: 135,
        x,
        z,
        foot: p.armCrown + p.parapet,
        radius: MODULE * 0.75,
        points: 10,
        crown: 'finial',
      })
    }
  }

  return sites
}

export interface Towers {
  sites: TowerSite[]
  /** The very top of the tallest, for framing and for the sun's bounds. */
  peak: number
}

export function buildTowers(parts: Parts, sites: TowerSite[], p: TowerParams): Towers {
  const openings: TowerOpenings = {
    from: 0.1,
    to: 0.93,
    bands: Math.max(1, Math.round(p.bands)),
    tall: p.tall,
    wide: p.wide,
    helix: p.helix,
  }

  let peak = 0
  const standing: TowerSite[] = []

  for (const site of sites) {
    const isApostle = site.crown === 'pinnacle'
    if (isApostle && !p.apostles) continue
    if (!isApostle && !p.central) continue
    standing.push(site)
    peak = Math.max(peak, site.top)

    // The paraboloid is carried below the shaft's foot so it spreads onto the
    // terrace; that spread has to sit *on* the roof and not through it, so
    // the shaft proper starts a skirt's worth above the level the plan gave.
    const skirt = site.radius * 0.9
    const base = site.foot + skirt
    const above = site.top - base
    const crownHeight =
      site.crown === 'cross'
        ? CROSS_HEIGHT
        : site.crown === 'star'
          ? STAR_SPAN
          : above * p.pinnacle
    const shaft = Math.max(6, above - crownHeight)
    const tip = site.radius * p.taper

    // Everything that decides the mesh goes in the key, so two towers of the
    // same height and girth are one kind however far apart they stand.
    const key = [
      'tower',
      site.points,
      shaft.toFixed(2),
      site.radius.toFixed(2),
      site.crown === 'pinnacle' || site.crown === 'finial' ? 'open' : 'lantern',
    ].join(':')

    parts.surface(
      key,
      (detail) =>
        buildTowerShaft({
          height: shaft,
          footRadius: site.radius,
          taper: p.taper,
          points: site.points,
          starFoot: p.star,
          // The star runs out as the tower climbs; what is left at the top is
          // a flute rather than a point.
          starTop: p.star * 0.22,
          twistDeg: p.twistDeg,
              skirt,
          openings,
          reveal: p.reveal,
          cap: site.crown === 'cross' || site.crown === 'star' ? site.radius * 0.3 : 0,
          detail,
        }),
      new THREE.Matrix4().makeTranslation(site.x, base, site.z),
      'facade',
      true,
    )

    const shaftTop = base + shaft
    if (site.crown === 'pinnacle' || site.crown === 'finial') {
      parts.surface(
        `${key}:pinnacle`,
        (detail) =>
          buildPinnacle({
            height: crownHeight,
            radius: tip,
            points: site.points,
            star: p.star * 0.22,
            detail,
          }),
        new THREE.Matrix4().makeTranslation(site.x, shaftTop, site.z),
        'facade',
        true,
      )
    } else if (site.crown === 'cross') {
      const group = new THREE.Group()
      group.position.set(site.x, shaftTop, site.z)
      const limbs = buildCross(CROSS_HEIGHT)
      for (const limb of limbs) group.add(named('cross', limb, parts.stone('facade')))
      parts.piece(group, ...limbs)
    } else {
      const star = buildStar(STAR_SPAN, 12)
      star.translate(site.x, shaftTop + STAR_SPAN / 2, site.z)
      parts.piece(named('star', star, parts.stone('facade')), star)
    }
  }

  return { sites: standing, peak }
}
