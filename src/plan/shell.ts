import * as THREE from 'three'
import { buildPinnacle } from '../geometry/tower.ts'
import { buildPavement } from './floor.ts'
import { MODULE } from './module.ts'
import { named, type Parts } from './parts.ts'

/**
 * The outside of the building: what closes it, and what it stands up as.
 *
 * Phases 1 to 3 built an interior and the walls that light it, and stopped
 * there. Seen from outside that is a set of walls with the sky inside them —
 * every vault in the model is a surface with nothing over it, so from any
 * viewpoint above about forty metres you look straight down into the nave.
 *
 * What goes over it is not a roof in the ordinary sense. The vaults are the
 * ceiling; what this adds is the **terrace** each vessel carries, one per
 * crown height, which is exactly how the real building is finished — you can
 * walk on the naves of Sagrada Família, and the stepped profile of those
 * terraces seen end-on is the section of the building. So the shell is not
 * invented: it is one deck per band at that band's own crown, and the steps
 * between them are the clerestories that were already there.
 *
 * The three fronts are massing and nothing more, which is what the scope says
 * they are. The Nativity façade alone carries some three hundred sculpted
 * figures; none of that is generated geometry, and pretending otherwise with
 * a lumpy displacement would be worse than leaving it as the block it
 * structurally is. What the block does have to be is the right block: thirty
 * metres across, which is the published width of the transept, standing as
 * high as the vessel behind it, and carrying four bell towers.
 */
export interface ShellParams {
  show: boolean
  /** Parapet standing above each terrace. */
  parapet: number
  /**
   * How far a façade stands out past the wall it closes.
   *
   * Not a taste question: it is what the four bell towers stand on, so it has
   * to be at least two of their radii, which is one module.
   */
  project: number
  /** Where the portals stop and the solid front above them begins. */
  portalHeight: number
  /**
   * Height of the doorway in the wall behind a front.
   *
   * Not the same number as `portalHeight`, which is where the front's own
   * solid block starts twenty metres up. This is the opening you walk
   * through, and nothing published gives it: it is set at two and a third
   * times the portal's clear width, which is about where the arch of a
   * doorway that wide would spring, and which puts a 1.65 m figure at a
   * sixth of its height.
   */
  doorHeight: number
  /** Width of the piers between the portals. */
  pier: number
  /** How far the wall between the piers is set back from their faces. */
  relief: number
  pinnacles: boolean
  /** Pinnacle height and girth along the parapets. */
  pinnacleHeight: number
  pinnacleRadius: number
  /** How much wider than its funnel a skylight's opening in the deck is. */
  skylightClear: number
  /** Height of the collar standing round each of those openings. */
  curb: number
}

export const defaultShell: ShellParams = {
  show: true,
  parapet: 1.7,
  project: MODULE + 1,
  portalHeight: 20,
  doorHeight: 9.5,
  pier: 3.4,
  relief: 2.2,
  pinnacles: true,
  // A module tall and a fifth of a module across: they read at a hundred
  // metres, which is the only distance they are ever seen from.
  pinnacleHeight: MODULE,
  pinnacleRadius: MODULE / 10,
  skylightClear: 1.6,
  curb: 1.9,
}

export interface ShellPlan {
  /** Outer face of the Glory wall, and of the side walls. */
  gloryZ: number
  wallX: number
  /** Outer face of the nave's clerestory wall — where the terrace steps. */
  clerX: number
  crossNear: number
  crossFar: number
  crossingZ: number
  /** The crowns, which are the terrace levels. */
  naveCrown: number
  aisleCrown: number
  crossingCrown: number
  armCrown: number
  /**
   * The transept arms where they project: the outer wall face, the
   * clerestory line inboard of them, their two ends, and their own crown.
   */
  transept: {
    outerX: number
    innerX: number
    near: number
    far: number
    crown: number
  } | null
  /** The apse: drum, chevet, and the height its ambulatory is roofed at. */
  apseCentreZ: number
  apseInner: number
  apseOuter: number
  ambulatoryCrown: number
}

/** A vault opening, as the plan collects them. */
export interface Skylight {
  x: number
  y: number
  z: number
  radius: number
}

/** Width of a front: four modules, which is the published thirty metres. */
export const FACADE_WIDTH = MODULE * 4

/** Where a front's piers stand: one to a column line, ends included. */
function pierLines(width: number): number[] {
  const lines = Math.round(width / MODULE)
  return Array.from({ length: lines + 1 }, (_, i) => -width / 2 + i * MODULE)
}

/**
 * The portals of a front: the gaps its piers leave between them.
 *
 * Exported because the wall *behind* a front needs them. A door has to be in
 * the gap between two piers or it opens onto stone, and the piers are set out
 * on the module by the front — so the front is asked, rather than the number
 * being written down twice and drifting apart.
 */
export function portals(
  pier: number,
  width: number = FACADE_WIDTH,
): { centre: number; width: number }[] {
  const lines = pierLines(width)
  const clear = MODULE - pier
  if (clear <= 0) return []
  return lines
    .slice(0, -1)
    .map((x) => ({ centre: x + MODULE / 2, width: clear }))
}

export interface Shell {
  /** Highest point of the shell itself, parapets included. */
  peak: number
  /** How far the building now reaches out past its own walls. */
  reach: number
}

export function buildShell(
  parts: Parts,
  p: ShellPlan,
  s: ShellParams,
  /** Where the vaults are open to the sky, so the terraces can be too. */
  skylights: Skylight[] = [],
): Shell {
  const pinnacles: THREE.Vector3[] = []

  /**
   * One terrace: a lid at the parapet's top and a band of stone hanging from
   * it. The band is deeper than the parapet on purpose — a clerestory stops a
   * metre under the vault it lights, so there is always a course to cover
   * between the wall head and the deck, and hanging it from the deck is
   * cheaper than measuring it.
   */
  const deck = (outline: THREE.Vector2[], crown: number): void => {
    const top = crown + s.parapet

    // A terrace laid straight over a vault that is open to the sky is a
    // skylight bricked up, and this building's vaults are open on purpose.
    // So every funnel whose throat is at this crown gets a hole in the deck
    // above it and a collar standing round the hole — which is what the roof
    // of the real building is covered in, and why you can stand on it.
    const holes = skylights
      .filter((light) => Math.abs(light.y - crown) < 1.5 && inside(outline, light.x, light.z))
      .map((light) => ({ x: light.x, z: light.z, r: light.radius + s.skylightClear }))

    const { lid, skirt } = buildPavement(outline, s.parapet + 2.2, holes)
    lid.translate(0, top, 0)
    skirt.translate(0, top, 0)
    parts.piece(named('terrace', lid, parts.stone('shell')), lid)
    parts.piece(named('parapet', skirt, parts.stone('shell')), skirt)

    for (const hole of holes) {
      const collar = new THREE.CylinderGeometry(hole.r * 0.92, hole.r, s.curb, 32, 1, true)
      collar.translate(hole.x, top + s.curb / 2, hole.z)
      parts.piece(named('lantern', collar, parts.stone('shell')), collar)
    }
  }

  const rect = (x0: number, x1: number, z0: number, z1: number): THREE.Vector2[] => [
    new THREE.Vector2(x0, z0),
    new THREE.Vector2(x1, z0),
    new THREE.Vector2(x1, z1),
    new THREE.Vector2(x0, z1),
  ]

  // The nave: the central vessel at its own crown, the four aisles at theirs.
  deck(rect(-p.clerX, p.clerX, p.crossNear, p.gloryZ), p.naveCrown)
  deck(rect(p.clerX, p.wallX, p.crossNear, p.gloryZ), p.aisleCrown)
  deck(rect(-p.wallX, -p.clerX, p.crossNear, p.gloryZ), p.aisleCrown)

  // The crossing, fifteen metres higher, and the vessels either side of it.
  // Where the transept projects, the 45 m deck stops on the clerestory that
  // stands over the arm and the arm carries its own at 30.
  const crossOuter = p.transept ? p.transept.innerX : p.wallX
  deck(rect(-p.clerX, p.clerX, p.crossFar, p.crossNear), p.crossingCrown)
  deck(rect(p.clerX, crossOuter, p.crossFar, p.crossNear), p.armCrown)
  deck(rect(-crossOuter, -p.clerX, p.crossFar, p.crossNear), p.armCrown)

  if (p.transept) {
    const t = p.transept
    deck(rect(t.innerX, t.outerX, t.far, t.near), t.crown)
    deck(rect(-t.outerX, -t.innerX, t.far, t.near), t.crown)
  }

  // The ambulatory, which is an annulus and not a rectangle.
  deck(
    annulus(p.apseCentreZ, p.apseInner, p.apseOuter, p.crossFar),
    p.ambulatoryCrown,
  )

  // Façades.
  //
  // A façade stands **out** past the wall it closes, never back into it. The
  // first version of this bit an inward module so the bell towers would have
  // something to stand on, and put seven and a half metres of solid plaster
  // through the last bay of the nave — the camera at the Glory end was
  // standing inside it, and two of the six regression frames came back a
  // hundred per cent façade. The towers stand on the projection instead,
  // which is where they stand on the building.
  //
  // Massing, and it says so: a solid upper block, and below it a row of
  // piers on the module with the portals between them. Nothing here pretends
  // to be sculpture. The Nativity front alone carries some three hundred
  // carved figures and a lumpy displacement map would be a worse lie than
  // the honest block.
  const front = (
    face: THREE.Vector2,
    along: THREE.Vector2,
    outward: THREE.Vector2,
    width: number,
    height: number,
  ): void => {
    const top = height + s.parapet

    /** One slab of the front, from a metre inside the wall to `depth` out. */
    const panel = (offset: number, span: number, base: number, crest: number, depth: number): void => {
      const thick = depth + 1
      const mid = new THREE.Vector2()
        .copy(face)
        .addScaledVector(along, offset)
        .addScaledVector(outward, depth / 2 - 0.5)
      const box = new THREE.BoxGeometry(
        Math.abs(along.x) * span + Math.abs(outward.x) * thick,
        crest - base,
        Math.abs(along.y) * span + Math.abs(outward.y) * thick,
      )
      box.translate(mid.x, (base + crest) / 2, mid.y)
      parts.piece(named('facade', box, parts.stone('facade')), box)
    }

    // The wall, set back behind the piers.
    panel(0, width, s.portalHeight, top, s.project - s.relief)
    // The piers, one to a column line, running the full height — which is
    // what makes a front out of a slab. Measured on the two street-level
    // frames, a flat block was the largest single object in the picture at
    // seventeen to twenty-two per cent and carried one value across all of
    // it; the same fault the floor had, and the same answer, which is to let
    // the building's own grid put relief on it. Below the portal head the
    // gaps between them are the portals; above it they stand proud of the
    // wall and the four bell towers land on them.
    for (const x of pierLines(width)) panel(x, s.pier, -4, top, s.project)
  }

  const facadeWidth = FACADE_WIDTH
  // The transept fronts close the arms, so they stand on whatever line the
  // arms reach — the nave's own wall only when there are none.
  const frontX = p.transept ? p.transept.outerX : p.wallX
  front(
    new THREE.Vector2(frontX, p.crossingZ),
    new THREE.Vector2(0, 1),
    new THREE.Vector2(1, 0),
    facadeWidth,
    p.armCrown,
  )
  front(
    new THREE.Vector2(-frontX, p.crossingZ),
    new THREE.Vector2(0, 1),
    new THREE.Vector2(-1, 0),
    facadeWidth,
    p.armCrown,
  )
  front(
    new THREE.Vector2(0, p.gloryZ),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(0, 1),
    facadeWidth,
    p.naveCrown,
  )

  // Pinnacles along the parapets, one to a column line, because that is what
  // holds them up. The roofline of this building is not a straight edge in
  // any photograph of it and it should not be one here.
  if (s.pinnacles) {
    const inset = s.parapet * 0.5
    for (const side of [1, -1]) {
      for (let z = p.gloryZ - MODULE / 2; z > p.crossFar; z -= MODULE) {
        const inArm = p.transept !== null && z <= p.transept.near && z >= p.transept.far
        const crown = inArm ? p.transept!.crown : z < p.crossNear ? p.armCrown : p.aisleCrown
        const edge = inArm ? p.transept!.outerX : p.wallX
        pinnacles.push(new THREE.Vector3(side * (edge - inset), crown + s.parapet, z))
      }
      for (let z = p.gloryZ - MODULE / 2; z > p.crossFar; z -= MODULE) {
        const crown = z < p.crossNear ? p.crossingCrown : p.naveCrown
        pinnacles.push(new THREE.Vector3(side * (p.clerX - inset), crown + s.parapet, z))
      }
    }
    for (let x = -p.wallX + MODULE / 2; x < p.wallX; x += MODULE) {
      const crown = Math.abs(x) < p.clerX ? p.naveCrown : p.aisleCrown
      pinnacles.push(new THREE.Vector3(x, crown + s.parapet, p.gloryZ - inset))
    }
    // Round the chevet, on the same radii the ambulatory bays stand on.
    const steps = 14
    const limit = Math.acos(Math.max(-1, (p.apseCentreZ - p.crossFar) / p.apseOuter))
    for (let i = 0; i <= steps; i++) {
      const phi = -limit + (i / steps) * 2 * limit
      const r = p.apseOuter - inset
      pinnacles.push(
        new THREE.Vector3(
          r * Math.sin(phi),
          p.ambulatoryCrown + s.parapet,
          p.apseCentreZ - r * Math.cos(phi),
        ),
      )
    }

    for (const spot of pinnacles) {
      parts.surface(
        'roof pinnacle',
        (detail) =>
          buildPinnacle({
            height: s.pinnacleHeight,
            radius: s.pinnacleRadius,
            points: 8,
            star: 0.8,
            detail,
          }),
        new THREE.Matrix4().makeTranslation(spot.x, spot.y, spot.z),
        'facade',
      )
    }
  }

  const peak =
    Math.max(p.crossingCrown, p.naveCrown, p.ambulatoryCrown) +
    s.parapet +
    (s.pinnacles ? s.pinnacleHeight : 0)

  return {
    peak,
    reach: Math.max(p.wallX, p.transept?.outerX ?? 0) + s.project + 1,
  }
}

/**
 * The ambulatory's terrace: the ring between drum and chevet, stopped where
 * the hall's own roof takes over.
 *
 * Both cuts are the same chord, so the outline is one arc out and one arc
 * back — the straight edges between the two are the chord itself and need no
 * points of their own.
 */
function annulus(
  centreZ: number,
  inner: number,
  outer: number,
  mouthZ: number,
  steps = 48,
): THREE.Vector2[] {
  const limitAt = (r: number): number =>
    Math.acos(Math.min(1, Math.max(-1, (centreZ - mouthZ) / r)))
  const outerLimit = limitAt(outer)
  const innerLimit = limitAt(inner)

  const arc = (r: number, limit: number, from: number, to: number): THREE.Vector2[] => {
    const points: THREE.Vector2[] = []
    for (let i = 0; i <= steps; i++) {
      const phi = from * limit + (i / steps) * (to - from) * limit
      points.push(new THREE.Vector2(r * Math.sin(phi), centreZ - r * Math.cos(phi)))
    }
    return points
  }

  return [...arc(outer, outerLimit, -1, 1), ...arc(inner, innerLimit, 1, -1)]
}

/** Is (x, z) inside this outline? Plain ray crossing; the outlines are simple. */
function inside(outline: THREE.Vector2[], x: number, z: number): boolean {
  let hit = false
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i]!
    const b = outline[j]!
    if (a.y > z !== b.y > z && x < ((b.x - a.x) * (z - a.y)) / (b.y - a.y) + a.x) hit = !hit
  }
  return hit
}
