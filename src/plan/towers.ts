import * as THREE from 'three'
import type { ColumnOrder } from '../geometry/column.ts'
import {
  buildCross,
  buildPinnacle,
  buildStar,
  buildTowerLouvres,
  buildTowerShaft,
  towerBand,
  type TowerOpenings,
  type TowerParams as TowerShaftParams,
} from '../geometry/tower.ts'
import { buildInscription, textWidth, wrapAroundY } from '../geometry/letters.ts'
import { mergeOrEmpty } from '../geometry/window.ts'
import { named, type Parts } from './parts.ts'
import { MODULE } from './module.ts'
import { MOSAIC_PALETTE, stoneColour, type StoneName } from '../render/materials.ts'

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
  /**
   * What this tower is cut from, which is a question about its date.
   *
   * The eighteen were not built at once and they do not look as though they
   * were: the Nativity's four are ninety-year-old Montjuïc stone gone nearly
   * black, the Passion's four are the pale matched stone of the nineteen
   * sixties, and the six over the crossing are grey prefabricated panel
   * hoisted into place after 2016. Given one stone the group reads as a
   * single manufactured object — see the fabrics in render/materials.ts.
   */
  fabric: StoneName
  /**
   * What is left of the foot radius at the top of this tower's shaft.
   *
   * Per tower, because the eighteen are not one family. A bell tower is a
   * needle — seven metres across where it leaves the façade and under two at
   * the belfry, which is a taper near a fifth — and it is that slenderness,
   * repeated twelve times, that makes the building read as tall. The tower
   * of Jesus Christ is the opposite: a broad shaft carrying a cross, barely
   * narrower at the top than at the bottom.
   *
   * Held in common at the old figure of 0.44 the twelve came out as traffic
   * cones, and a hundred-metre traffic cone does not look a hundred metres
   * tall. It was the first thing anybody said about the exterior.
   */
  taper: number
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
  /** Metres from one row of apertures to the next, up a bell tower. */
  pitch: number
  /** How much of a row's height, and of a channel's width, each one opens. */
  tall: number
  wide: number
  /** How far the stone hood over an aperture stands proud, metres. */
  lintel: number
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
  /**
   * The fallback taper, for anything that does not state its own. The three
   * central towers do; see `TowerSite.taper`.
   */
  taper: 0.4,
  /**
   * Counted off the reference crops rather than chosen.
   *
   * On the Passion towers there are something over twenty rows above the
   * inscription and on the Nativity's, which are older and more finely cut,
   * nearer forty; both come out near two metres from one row to the next.
   * Stated as a length, the taller towers get more rows instead of larger
   * ones, which is what the building does and what a count can never do.
   */
  pitch: 1.3,
  // Wider than tall, which is the other half of what makes a ladder. The
  // old figures — two thirds of a row tall and a fifth of the shaft's
  // circumference wide — drew lozenges standing on end, and a column of
  // lozenges reads as a stripe.
  tall: 0.5,
  wide: 0.5,
  /**
   * The hood over an aperture, and the single most load-bearing number on
   * the exterior.
   *
   * At zero the towers are cones with flat marks on them. At 0.8 m every
   * opening has a lit slab over it and a black slot under it, which is the
   * pattern that makes a silhouette read as this building.
   */
  lintel: 0.38,
  /**
   * How deep the stone is at an opening's edge.
   *
   * A hole with a 45 cm lip is a hole with no shadow in it at any sun the
   * year offers: the jamb is too shallow to throw one across the reveal, so
   * every aperture on the building came back as a flat mark the colour of
   * whatever was behind it. Real ones are set back the better part of a
   * metre and are in shadow at every hour — that shadow, repeated a hundred
   * and thirty times up a shaft, is the pattern people recognise.
   */
  reveal: 1.05,
  pinnacle: 0.17,
}

/**
 * The twelve bell towers' taper.
 *
 * Seven and a half metres across at the façade and a shade under two at the
 * belfry: the ratio is read straight off an elevation, and it is the number
 * the whole exterior silhouette turns on.
 */
const BELL_TAPER = 0.23

/**
 * The crown heights, which come out of the tower's total.
 *
 * The cross on the tower of Jesus Christ is published by the Basilica at
 * **17 m tall and 13.5 m wide** — three-dimensional, four-armed, clad in
 * white enamelled ceramic and glass, and about two hundred tonnes. This model
 * had it at 13.5 m tall, which is its width: the crown was three and a half
 * metres short and its arms two metres narrow, on the one element of the
 * silhouette that every photograph of the finished building is about.
 *
 * The total stays 172.5 m, which is the published figure and half a metre
 * below Montjuïc. What changes is where the shaft stops — 155.5 m rather than
 * 159 — so the cross is the last tenth of the tower instead of the last
 * thirteenth.
 */
const CROSS_HEIGHT = 17
const CROSS_WIDTH = 13.5
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
    fabric: StoneName,
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
        taper: BELL_TAPER,
        fabric,
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
    // Gaudí's own front, finished in 1930 and black with it.
    'nativity',
    (offset) => ({ x: p.wallX + p.facadeStand, z: p.crossingZ + offset }),
  )
  facade(
    ['James the Less', 'Bartholomew', 'Thomas', 'Philip'],
    107,
    112,
    p.armCrown,
    // Begun 1954, topped out 1976: pale matched stone, half a century younger.
    'passion',
    (offset) => ({ x: -(p.wallX + p.facadeStand), z: p.crossingZ + offset }),
  )
  // The Glory end, and the four tallest of the twelve.
  facade(
    ['Andrew', 'Peter', 'Paul', 'James the Great'],
    112,
    117,
    p.naveCrown,
    // Not standing yet in any photograph. The newest stone is the honest
    // guess for a front that will be cut this decade.
    'white',
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
    taper: 0.46,
    fabric: 'panel',
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
    taper: 0.36,
    fabric: 'panel',
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
        taper: 0.3,
        fabric: 'panel',
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

/**
 * What the bell towers say.
 *
 * The twelve apostles' towers are written on, and between them they carry the
 * Sanctus of the Mass: *Sanctus, Sanctus, Sanctus, Dominus Deus Sabaoth* on
 * the shafts and *Hosanna in excelsis* above. Which word stands on which
 * tower is not something this model can know from a photograph — what the
 * photographs establish is that Sanctus is much the commonest, which is why
 * it is two of every four here. The word goes in the kind key: two towers of
 * identical height and girth saying different things are two different
 * objects, and the last phase lost a whole facade's colour to exactly this
 * mistake made about stone.
 */
const BAND_WORDS = ['Sanctus', 'Hosanna', 'Sanctus', 'Excelsis'] as const

export function buildTowers(parts: Parts, sites: TowerSite[], p: TowerParams): Towers {
  /**
   * A bell tower: a solid lower third with long windows in it, a raised
   * inscription ring, and then the ladder of hooded apertures.
   */
  const belfry: TowerOpenings = {
    from: 0.32,
    to: 0.95,
    pitch: p.pitch,
    tall: p.tall,
    wide: p.wide,
    lintel: p.lintel,
    sanctus: 0.28,
    lancets: 3,
  }

  /**
   * A central tower is a different object and was being built as the same
   * one.
   *
   * Jesus, Mary and the four Evangelists are not bell towers: they have no
   * bells, no sound holes and no inscription. They are panelled shafts with
   * tall narrow lights in them, four times the pitch and half the width,
   * and they are faceted rather than curved. Given the belfry's apertures
   * they came back as enormous bell towers, which is a hundred and seventy
   * metres of the wrong building in the middle of every frame.
   */
  const lantern: TowerOpenings = {
    from: 0.3,
    to: 0.92,
    pitch: p.pitch * 4.5,
    tall: 0.8,
    wide: 0.2,
    lintel: 0,
    sanctus: 0,
    lancets: 0,
  }

  let peak = 0
  let written = 0
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
    const taper = site.taper ?? p.taper
    const tip = site.radius * taper

    // Panel, not masonry: the six over the crossing are flat-faced, untwisted
    // and lit with tall lights rather than pierced with sound holes.
    const panelled = site.fabric === 'panel'

    // Everything that decides the mesh goes in the key, so two towers of the
    // same height and girth are one kind however far apart they stand.
    //
    // And everything that decides its *material*, which is the half that was
    // missing and cost a whole front its colour. A kind carries one stone,
    // and the first caller to register a key sets it — so the Passion's
    // outer pair, which stands at 107 m, silently joined the kind the
    // Nativity's inner pair had already opened at the same height, girth and
    // taper, and came back cut from ninety-year-old blackened Montjuïc
    // stone in the middle of the 1960s front. Two of the twelve bell towers
    // were the wrong colour and the geometry was identical, which is exactly
    // the kind of mistake a shared key is for making invisible.
    const key = [
      'tower',
      site.points,
      shaft.toFixed(2),
      site.radius.toFixed(2),
      taper.toFixed(2),
      site.crown === 'pinnacle' || site.crown === 'finial' ? 'open' : 'lantern',
      site.fabric,
      panelled ? 'panel' : 'belfry',
    ].join(':')

    /** One description of this tower, so the shaft and its louvres agree. */
    const shape = (detail: number): TowerShaftParams => ({
      height: shaft,
      footRadius: site.radius,
      taper,
      points: site.points,
      starFoot: p.star,
      // The star runs out as the tower climbs; what is left at the top is a
      // flute rather than a point. Half rather than a fifth: at 0.22 the
      // ribs had gone by the first band of openings and the whole belfry —
      // which is most of what anybody sees of a tower — was a smooth cone.
      // The photographs keep an edge on every rib right up to the pinnacle.
      starTop: p.star * 0.5,
      // A panel tower is craned up in straight lengths and does not twist.
      twistDeg: panelled ? 0 : p.twistDeg,
      skirt,
      openings: panelled ? lantern : belfry,
      faceted: panelled,
      reveal: p.reveal,
      cap: site.crown === 'cross' || site.crown === 'star' ? site.radius * 0.3 : 0,
      detail,
    })
    const stand = new THREE.Matrix4().makeTranslation(site.x, base, site.z)

    parts.surface(key, (detail) => buildTowerShaft(shape(detail)), stand, site.fabric, true)
    // And what stands behind the openings, in the dark stone — see
    // `buildTowerLouvres`. Without it an aperture shows the sunlit inside of
    // the far wall and the tower reads as mottled rather than pierced.
    parts.surface(
      `${key}:louvre`,
      (detail) => buildTowerLouvres(shape(detail)),
      stand,
      'hollow',
      true,
    )

    // The writing. Cut on the raised ring the belfry already carries, which
    // is what the ring is for and what it has been missing: from the plaza a
    // bare band is a bright line round a tower, and a written one is the
    // thing in `reference/ex-plaza-nativity.jpg` that you can read four times
    // across one frame.
    const band = towerBand(shape(1))
    if (band) {
      const word = BAND_WORDS[written % BAND_WORDS.length]!
      written += 1
      // Cap height just under half the band, which is what the photograph
      // gives: measured off `ex-plaza-nativity.jpg` against a four-metre
      // shaft, the word Sanctus is about 3.7 m of arc and its capitals about
      // 0.9 m, so the ring shows clear above and below the writing.
      const size = band.height * 0.46
      const width = textWidth(word) * size
      // As many as go round leaving a fifth of the circumference in gaps.
      // Derived rather than typed, so a slimmer shaft carries fewer without
      // anything here having to know which tower it is looking at.
      const round = 2 * Math.PI * band.meanRadius
      const repeats = Math.max(3, Math.floor((round * 0.82) / width))
      parts.surface(
        `${key}:band:${word}:${repeats}`,
        (detail) => {
          const pieces: THREE.BufferGeometry[] = []
          for (let i = 0; i < repeats; i += 1) {
            const line = buildInscription({ text: word, size, detail })
            line.translate(0, band.y - size * 0.5, 0)
            pieces.push(
              wrapAroundY(line, band.radiusAt, (i * Math.PI * 2) / repeats, band.meanRadius),
            )
          }
          return { geometry: mergeOrEmpty(pieces), error: 0.01 }
        },
        stand,
        site.fabric,
        true,
      )
    }

    const shaftTop = base + shaft
    if (site.crown === 'pinnacle' || site.crown === 'finial') {
      // The twelve bell towers are crowned in Venetian glass mosaic and the
      // four Evangelists are not — theirs is panel like the shaft under it.
      // That one difference is most of the colour on the whole building, and
      // it is why the crowns are what people photograph from the terraces.
      const glass = site.crown === 'pinnacle'
      const mosaic = glass
        ? { base: stoneColour(site.fabric), tesserae: MOSAIC_PALETTE }
        : undefined
      parts.surface(
        `${key}:pinnacle:${site.fabric}${glass ? ':glass' : ''}`,
        (detail) =>
          buildPinnacle({
            height: crownHeight,
            radius: tip,
            points: site.points,
            star: p.star * 0.22,
            detail,
            mosaic,
          }),
        new THREE.Matrix4().makeTranslation(site.x, shaftTop, site.z),
        glass ? 'mosaic' : site.fabric,
        true,
      )
    } else if (site.crown === 'cross') {
      // White enamelled ceramic and glass, two hundred tonnes of it. What
      // that buys at a hundred and seventy metres is a crown that catches
      // the sun as a *highlight* where the stone around it catches a tone.
      const group = new THREE.Group()
      group.position.set(site.x, shaftTop, site.z)
      const limbs = buildCross(CROSS_HEIGHT, CROSS_WIDTH)
      for (const limb of limbs) group.add(named('cross', limb, parts.stone('enamel')))
      parts.piece(group, ...limbs)
    } else {
      const star = buildStar(STAR_SPAN, 12)
      star.translate(site.x, shaftTop + STAR_SPAN / 2, site.z)
      parts.piece(named('star', star, parts.stone('enamel')), star)
    }
  }

  return { sites: standing, peak }
}
