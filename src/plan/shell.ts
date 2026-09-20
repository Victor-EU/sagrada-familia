import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildPinnacle } from '../geometry/tower.ts'
import { buildPavement } from './floor.ts'
import { MODULE } from './module.ts'
import {
  buildArchFringe,
  buildCrust,
  buildCypress,
  buildFrontBridge,
  buildHood,
  buildPassionPortico,
} from '../geometry/portico.ts'
import { buildFruit, buildGable, buildGargoyle } from '../geometry/roofwork.ts'
import { mergeOrEmpty } from '../geometry/window.ts'
import { named, type Parts } from './parts.ts'
import { FRUIT_PALETTE, type StoneName } from '../render/materials.ts'
import { LAYER_SKYLINE } from '../render/sunrig.ts'

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
 * The three fronts are massing, and massing is still all they are: the
 * Nativity façade alone carries some three hundred sculpted figures, none of
 * that is generated geometry, and a lumpy displacement pretending otherwise
 * would be worse than the honest block. What the block has to be is the right
 * block — thirty metres across, which is the published width of the transept,
 * standing as high as the vessel behind it, and carrying four bell towers.
 *
 * It also has to have a *shape*, which for two phases it did not: above the
 * portal head sat one flat slab thirty metres wide and twenty-seven tall. See
 * `front` below for what is drawn on it now and why, all of it set out on the
 * module that was already in this file.
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
  /** Width of one step of a portal's reveal, and of one archivolt ring. */
  jamb: number
  /** How far each archivolt ring is set back behind the one outside it. */
  ring: number
  /** Stepped rings over a portal. Three is what reads as a deep one. */
  archivolts: number
  /** Rise of the gable standing over each portal. */
  gable: number
  /** Width of the mullions dividing the upper front. */
  mullion: number
  pinnacles: boolean
  /** The Passion portico and the Nativity hoods. */
  porch: boolean
  /** How far the Passion portico stands out from its wall. */
  porchReach: number
  /** Steep triangles over every bay of a wall head. */
  gables: boolean
  /** How far a nave gable's apex stands above the wall head. */
  gableRise: number
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
  jamb: 0.42,
  ring: 1.9,
  archivolts: 3,
  gable: 6.5,
  mullion: 0.9,
  pinnacles: true,
  porch: true,
  porchReach: 9.5,
  gables: true,
  gableRise: 7.2,
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

/** Which of the three fronts this is; they are not interchangeable. */
type FrontKind = 'nativity' | 'passion' | 'glory'

/**
 * What each front is cut from.
 *
 * Three fronts, three dates, three colours, and they stand in the same frame
 * from anywhere on the plaza: Gaudí's Nativity finished in 1930 and gone
 * nearly black, Subirachs' Passion of the nineteen sixties in pale matched
 * stone, and a Glory end nobody has seen yet, which gets the newest stone
 * there is. Given one albedo for all three the building reads as having been
 * made at once — see the fabrics in render/materials.ts.
 *
 * The porch is not always its wall's stone. The Passion portico is
 * deliberately *not* the colour of the front behind it — it is the white
 * stone that throws the one hard edge on that façade — and the Nativity's
 * hoods and encrustation are the same blackened fabric as the wall they grow
 * out of.
 */
const FRONT_STONE: Record<FrontKind, { wall: StoneName; porch: StoneName }> = {
  nativity: { wall: 'nativity', porch: 'nativity' },
  passion: { wall: 'passion', porch: 'white' },
  glory: { wall: 'white', porch: 'white' },
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

  /**
   * Something that stands above the roofs and roofs nothing.
   *
   * The pass that asks what is over a point of the plan must not be told
   * that a bridge forty-five metres up between two bell towers is a ceiling
   * — it answers by filling the whole column of air beneath it with the
   * indoor medium, and the Nativity front came back with a vertical plume of
   * haze down the middle of it like a searchlight. The towers learned this
   * in phase five; anything new that stands out in front of a façade has to
   * be told the same thing. See LAYER_SKYLINE.
   */
  const skyline = <T extends THREE.Object3D>(node: T): T => {
    node.layers.set(LAYER_SKYLINE)
    return node
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
  // Massing — but massing has a shape, and for two phases this one did not
  // have the right one.
  //
  // A solid upper block over a row of piers is the *structure* of a front
  // here, and structure was all it was: above the portal head sat one flat
  // slab thirty metres wide and twenty-seven tall, carrying a single value
  // across the largest object in every street-level frame. It is the exact
  // fault the floor had in phase 3 and the exact fault the bare plaza had in
  // phase 5, and it has the same answer both times — not detail bolted on,
  // but the building's own grid allowed to put relief on it.
  //
  // What a front is made of, all of it on the module already in the file:
  //
  //   · piers on the column lines, as before, carrying the four bell towers
  //   · a portal in every gap between them, with a **pointed arch** over it
  //     and three stepped archivolt rings receding into the wall
  //   · a **gable** over each portal, standing proud of the piers
  //   · above that, mullions on the half-module and two string courses, so
  //     the upper wall is a grid of tall panels rather than one plane
  //   · a cornice along the top, which is what the parapet stands on
  //
  // None of it is sculpture and none of it pretends to be. The Nativity
  // front alone carries some three hundred carved figures; a displacement
  // map of lumps would be a worse lie than the honest block. What this adds
  // is the one thing the honest block was missing, which is *depth* — every
  // piece here is a slab at a stated distance out from the wall, and the
  // shadows between them are the façade.
  const front = (
    face: THREE.Vector2,
    along: THREE.Vector2,
    outward: THREE.Vector2,
    width: number,
    height: number,
    kind: FrontKind,
  ): void => {
    const top = height + s.parapet
    // One front is one draw call. Seven hundred separate slabs is the right
    // drawing and the wrong scene graph, so they are collected and merged.
    const slabs: THREE.BufferGeometry[] = []

    /** One slab of the front, from a metre inside the wall to `depth` out. */
    const panel = (offset: number, span: number, base: number, crest: number, depth: number): void => {
      if (span <= 0.02 || crest - base <= 0.02) return
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
      slabs.push(box)
    }

    /**
     * A solid of the caller's own outline, standing in the plane of the front.
     *
     * The first version of the arches and gables was stacked boxes, and a
     * curve approximated by boxes is a staircase: at six steps over five
     * metres the portal heads read as corbelling and the gables as ziggurats,
     * which is a different building in a different century. An outline
     * extruded through the wall is both smoother and *fewer* pieces — one
     * solid where there were twelve.
     *
     * The shape is drawn in (across, up); the extrusion runs outward, and the
     * basis puts it on whichever of the three fronts asked.
     */
    const solid = (shape: THREE.Shape, offset: number, base: number, depth: number, thick: number): void => {
      const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false })
      const mid = new THREE.Vector2()
        .copy(face)
        .addScaledVector(along, offset)
        .addScaledVector(outward, depth - thick)
      /**
       * Right-handed, and it has to be said out loud.
       *
       * The obvious basis — the front's own `along`, up, and `outward` — is
       * left-handed on two of the three fronts, and a matrix with a negative
       * determinant *mirrors* the geometry it is applied to. Three then does
       * exactly the right thing twice: `applyMatrix4` flips the stored
       * normals through the normal matrix, and the shader flips them again
       * for what are now back-facing triangles. Two corrections compose into
       * an error, the normals end up pointing into the stone, and the gables
       * came back as black triangles stuck to the front of a sunlit
       * building.
       *
       * `up × outward` is the across-vector that makes the basis right-handed
       * by construction. Both outlines here are symmetric about their own
       * centre line, so which way across it points changes nothing about the
       * solid — and the offset along the front is applied to the position
       * rather than through the basis, so it is not affected either.
       */
      const outwardVec = new THREE.Vector3(outward.x, 0, outward.y)
      const up = new THREE.Vector3(0, 1, 0)
      g.applyMatrix4(
        new THREE.Matrix4()
          .makeBasis(new THREE.Vector3().crossVectors(up, outwardVec), up, outwardVec)
          .setPosition(mid.x, base, mid.y),
      )
      slabs.push(g)
    }

    /**
     * The stone standing either side of, and over, a pointed opening.
     *
     * A horseshoe: the outside is a rectangle, the inside is the arch soffit,
     * and the two meet at the springing corners. The soffit is
     * `(1 − t)^0.55` — bellied out where it springs and coming to a point at
     * the crown, which is the ogival head these portals have rather than the
     * semicircle a Romanesque one would have or the square top they used to
     * have because nothing at all was drawn over them.
     *
     * `headroom` keeps a course of stone over the crown, so the outline never
     * pinches to a point and the triangulator is never asked to resolve one.
     */
    const archShape = (clear: number, rise: number, headroom: number): THREE.Shape => {
      const half = clear / 2
      const shape = new THREE.Shape()
      shape.moveTo(-half, 0)
      shape.lineTo(-half, rise + headroom)
      shape.lineTo(half, rise + headroom)
      shape.lineTo(half, 0)
      const steps = 24
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        shape.lineTo(half * Math.pow(1 - t, 0.55), rise * t)
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps
        shape.lineTo(-half * Math.pow(1 - t, 0.55), rise * t)
      }
      shape.closePath()
      return shape
    }

    /** A gable: a triangle standing on the portal head. */
    const gableShape = (span: number, rise: number): THREE.Shape => {
      const shape = new THREE.Shape()
      shape.moveTo(-span / 2, 0)
      shape.lineTo(span / 2, 0)
      shape.lineTo(0, rise)
      shape.closePath()
      return shape
    }

    const clear = MODULE - s.pier
    const springing = s.portalHeight * 0.55
    /** Stalactite fringes, collected and stood with the rest of the porch. */
    const fringes: THREE.BufferGeometry[] = []

    for (const bay of portals(s.pier, width)) {
      // One shallow jamb step each side below the springing, so the reveal
      // continues to the ground without narrowing the way through: a portal
      // you cannot walk in at is scenery, and there are doors behind these.
      panel(bay.centre - (clear - s.jamb) / 2, s.jamb, -4, springing, s.project - s.ring)
      panel(bay.centre + (clear - s.jamb) / 2, s.jamb, -4, springing, s.project - s.ring)

      // Three archivolt rings, each narrower than the last and set further
      // back, which is what makes a deep portal read as deep from in front:
      // you see the outermost ring's edge, and behind it the next one
      // standing further in.
      let apex = springing
      for (let r = 0; r < s.archivolts; r++) {
        const ringClear = clear - 2 * r * s.jamb
        const rise = ringClear * 1.15
        solid(
          archShape(ringClear, rise, s.jamb * 1.4),
          bay.centre,
          springing,
          s.project - r * s.ring,
          // Each ring is as thick as the step between rings, plus enough to
          // reach the one behind it — no gaps to see daylight through.
          s.ring + s.jamb,
        )
        apex = Math.max(apex, springing + rise + s.jamb * 1.4)
      }
      // The tympanum: what fills the bay between the arch head and the solid
      // upper front. Set back with the innermost ring.
      panel(
        bay.centre,
        clear,
        apex,
        s.portalHeight,
        s.project - (s.archivolts - 1) * s.ring,
      )

      // The gable, standing proud of the piers. The roofline of this
      // building is not a straight edge in any photograph of it, and the
      // line where the portals stop should not be one either.
      solid(
        gableShape(MODULE * 0.94, s.gable),
        bay.centre,
        s.portalHeight,
        s.project + 0.5,
        1.4,
      )

      // The fringe. Gaudí's front hangs its portals with carved stalactites
      // and what they do at plaza distance is put a row of small dark shapes
      // across the top of the way in — which is the difference between a
      // deep portal and a hole. Only here: the Passion front is stripped of
      // ornament on purpose and giving it one would be the worse lie.
      if (kind === 'nativity') {
        // In the porch's own frame — x across, y up, z out from the wall
        // face — because that is what `stand` is about to turn. Given the
        // front's projection here as well it would be stood out twice and
        // hang eight metres clear of the building.
        const fringe = buildArchFringe(clear - 2 * s.jamb, (clear - 2 * s.jamb) * 1.15, 13, 1.1)
        fringe.translate(bay.centre, springing, - s.ring * 0.5)
        fringes.push(fringe)
      }
    }

    // The wall above, set well back — it is the thing everything else on the
    // front is measured out from.
    const backDepth = s.project - s.relief * 1.8
    panel(0, width, s.portalHeight, top, backDepth)

    // Mullions on the half-module, skipping the lines a pier already stands
    // on. Eight tall panels of shadow across an upper wall that used to be
    // one unbroken plane.
    const mullionDepth = s.project - s.relief * 0.6
    for (let x = -width / 2 + MODULE / 4; x < width / 2; x += MODULE / 3) {
      if (pierLines(width).some((line) => Math.abs(x - line) < s.pier / 2 + 0.4)) continue
      panel(x, s.mullion, s.portalHeight + s.gable * 0.6, top - 2.4, mullionDepth)
    }

    // Two string courses and a cornice: the horizontals that stop the
    // mullions reading as a fence.
    const courseDepth = s.project - s.relief * 0.45
    const first = s.portalHeight + s.gable + 1.2
    panel(0, width, first, first + 0.9, courseDepth)
    const second = (first + top) / 2
    panel(0, width, second, second + 0.9, courseDepth)
    panel(0, width, top - 1.4, top, s.project + 0.35)

    // The piers, one to a column line, running the full height — which is
    // what makes a front out of a slab. Below the portal head the gaps
    // between them are the portals; above it they stand proud of the wall
    // and the four bell towers land on them.
    for (const x of pierLines(width)) panel(x, s.pier, -4, top, s.project)

    /**
     * Anything built in the porch's own frame — x across, y up, z out from
     * the wall face — put where the front stands.
     *
     * The same right-handed basis the slabs use, and for the same reason: a
     * left-handed one mirrors the geometry and the normals come out pointing
     * into the stone.
     */
    const stand = (depth: number): THREE.Matrix4 => {
      const outwardVec = new THREE.Vector3(outward.x, 0, outward.y)
      const up = new THREE.Vector3(0, 1, 0)
      return new THREE.Matrix4()
        .makeBasis(new THREE.Vector3().crossVectors(up, outwardVec), up, outwardVec)
        .setPosition(face.x + outward.x * depth, 0, face.y + outward.y * depth)
    }

    const porch: THREE.BufferGeometry[] = []
    if (fringes.length > 0) porch.push(...fringes)
    if (kind === 'passion' && s.porch) {
      porch.push(
        buildPassionPortico({
          // The whole front, not the middle of it. The porch on this façade
          // spans the four towers' feet; a narrower one reads as a canopy
          // bolted on rather than as the front itself.
          width: width * 0.98,
          eaves: s.portalHeight * 0.9,
          ridge: s.portalHeight * 1.4,
          reach: s.porchReach * 1.26,
          legs: 6,
          slab: 1.6,
          blades: 32,
          bladeRise: 4,
        }),
      )
    }
    if (kind === 'nativity' && s.porch) {
      for (const bay of portals(s.pier, width)) {
        const hood = buildHood({
          span: MODULE - s.pier + 1.6,
          reach: s.porchReach * 0.52,
          rise: 5.4,
          sill: s.portalHeight * 0.86,
        })
        hood.translate(bay.centre, 0, 0)
        porch.push(hood)
      }
      // The piers are the stone that stands at the front plane; the bays
      // behind them are a metre back and are somebody else's surface.
      // Denser and deeper than it was, and stopped well below the top.
      // What that front is from across the plaza is a stone cliff that has
      // been rained on for a century, thickest round the portals and running
      // out as it climbs — not an even rash over the whole height, which is
      // what an unweighted scatter gives and what this looked like.
      porch.push(
        buildCrust({
          bands: pierLines(width).map((centre) => ({ centre, width: s.pier })),
          from: 2,
          to: s.portalHeight + s.gable * 1.4,
          depth: 0,
          count: 900,
          seed: 19,
        }),
      )
    }
    if (porch.length > 0) {
      const merged = mergeOrEmpty(porch)
      merged.applyMatrix4(stand(s.project))
      parts.piece(named('porch', merged, parts.stone(FRONT_STONE[kind].porch)), merged)
    }

    /**
     * What stands between the two middle towers.
     *
     * Both finished fronts have something there and the model had a gap, so
     * from every street-level frame the four bell towers of a front read as
     * four separate objects standing in a row rather than as one façade.
     * The Passion's bridge carries the Ascension; the Nativity's carries the
     * cypress, which is the only colour on that whole front. The Glory end
     * is not built and gets neither.
     */
    if (kind !== 'glory') {
      const bridgeAt = height + s.parapet + MODULE * 1.1
      const bridge = buildFrontBridge(MODULE * 1.35, MODULE * 0.5, MODULE * 0.42)
      bridge.translate(0, bridgeAt, 0)
      bridge.applyMatrix4(stand(s.project + MODULE * 0.2))
      parts.piece(skyline(named('bridge', bridge, parts.stone(FRONT_STONE[kind].porch))), bridge)

      if (kind === 'nativity') {
        const cypress = buildCypress(MODULE * 3.4, MODULE * 0.44)
        cypress.translate(0, bridgeAt + MODULE * 0.42, 0)
        cypress.applyMatrix4(stand(s.project + MODULE * 0.2))
        parts.piece(skyline(named('cypress', cypress, parts.stone('mosaic'))), cypress)
      }
    }

    // A box comes back indexed and an extrusion does not, and a merge of the
    // two returns null rather than throwing — so everything is flattened on
    // the way in. (plan/city.ts learned this the expensive way: a Mesh with
    // no geometry reached the renderer and took the whole frame down.)
    const flattened = slabs.map((g) => {
      if (!g.index) return g
      const out = g.toNonIndexed()
      g.dispose()
      return out
    })
    const merged = mergeGeometries(flattened, false)
    for (const slab of flattened) slab.dispose()
    if (!merged) throw new Error('shell: façade slabs could not be merged')
    parts.piece(named('facade', merged, parts.stone(FRONT_STONE[kind].wall)), merged)
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
    'nativity',
  )
  front(
    new THREE.Vector2(-frontX, p.crossingZ),
    new THREE.Vector2(0, 1),
    new THREE.Vector2(-1, 0),
    facadeWidth,
    p.armCrown,
    'passion',
  )
  front(
    new THREE.Vector2(0, p.gloryZ),
    new THREE.Vector2(1, 0),
    new THREE.Vector2(0, 1),
    facadeWidth,
    p.naveCrown,
    'glory',
  )

  /**
   * The gables.
   *
   * Over every bay of a wall head stands a steep triangle with a round light
   * in it, and the valley between two of them is as much of the silhouette as
   * the peaks are. Without them the roofline of this model was a parapet with
   * spikes on it; the building's is a saw.
   *
   * They face outward, so the two flanks are mirrored and the Glory end turns
   * a quarter. The apse is left alone: it is a chevet with a lantern over it,
   * and it does not have bays in that sense.
   */
  /**
   * What the roofline says.
   *
   * The Sanctus of the Mass, in order, one word to a gable, repeating along
   * the flank — which is how the real roofline is written and why the words
   * are not picked at random. Six of them rather than the full nine, because
   * every distinct word is a distinct instanced kind and a roofline is not
   * worth twenty draw calls.
   */
  const SANCTUS = ['Sanctus', 'Dominus', 'Deus', 'Sabaoth', 'Hosanna', 'Excelsis']
  let spoken = 0

  const gable = (x: number, z: number, turn: number, crown: number, rise: number): void => {
    const word = SANCTUS[spoken % SANCTUS.length]!
    spoken += 1
    const piece = mergeOrEmpty(
      buildGable({
        span: MODULE * 0.94,
        rise,
        depth: MODULE * 0.72,
        teeth: 7,
        toothDepth: 0.36,
        eye: rise * 0.13,
        word,
      }),
    )
    const stand = new THREE.Matrix4()
      .makeTranslation(x, crown + s.parapet, z)
      .multiply(new THREE.Matrix4().makeRotationY(turn))
    // Flat stone, so there is nothing for a level of detail to coarsen: one
    // tessellation, offered at zero error.
    parts.surface(
      `gable:${rise.toFixed(1)}:${word}`,
      () => ({ geometry: piece.clone(), error: 0 }),
      stand,
      'shell',
      true,
    )
  }

  if (s.gables) {
    for (const side of [1, -1]) {
      const turn = side > 0 ? Math.PI / 2 : -Math.PI / 2
      // The clerestory of the central vessel, and the aisle wall outboard.
      for (let z = p.gloryZ - MODULE / 2; z > p.crossNear; z -= MODULE) {
        gable(side * p.clerX, z, turn, p.naveCrown, s.gableRise)
        gable(side * p.wallX, z, turn, p.aisleCrown, s.gableRise * 0.74)
      }
    }
    for (let x = -p.wallX + MODULE / 2; x < p.wallX; x += MODULE) {
      const crown = Math.abs(x) < p.clerX ? p.naveCrown : p.aisleCrown
      const rise = Math.abs(x) < p.clerX ? s.gableRise : s.gableRise * 0.74
      gable(x, p.gloryZ, 0, crown, rise)
    }
  }

  // Pinnacles along the parapets, one to a column line, because that is what
  // holds them up. The roofline of this building is not a straight edge in
  // any photograph of it and it should not be one here.
  if (s.pinnacles) {
    const inset = s.parapet * 0.5
    /**
     * Where a beast leans out, and which way it faces.
     *
     * Collected alongside the pinnacles and only on the two runs whose
     * outward direction is obvious — the flanks, which face ±x, and the
     * chevet, which faces along its own radius. The Glory parapet is left
     * bare, which is honest: that front is not built and nothing here knows
     * what is on it.
     */
    const beasts: Array<[THREE.Vector3, THREE.Vector3]> = []
    for (const side of [1, -1]) {
      for (let z = p.gloryZ - MODULE / 2; z > p.crossFar; z -= MODULE) {
        const inArm = p.transept !== null && z <= p.transept.near && z >= p.transept.far
        const crown = inArm ? p.transept!.crown : z < p.crossNear ? p.armCrown : p.aisleCrown
        const edge = inArm ? p.transept!.outerX : p.wallX
        pinnacles.push(new THREE.Vector3(side * (edge - inset), crown + s.parapet, z))
        // Between the pinnacles, not under them: the gargoyles in the
        // photographs sit at the middle of a bay and the pinnacles at its end.
        beasts.push([
          new THREE.Vector3(side * edge, crown + s.parapet * 0.42, z + MODULE / 2),
          new THREE.Vector3(side, 0, 0),
        ])
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
      if (i < steps) {
        const mid = -limit + ((i + 0.5) / steps) * 2 * limit
        beasts.push([
          new THREE.Vector3(
            p.apseOuter * Math.sin(mid),
            p.ambulatoryCrown + s.parapet * 0.42,
            p.apseCentreZ - p.apseOuter * Math.cos(mid),
          ),
          new THREE.Vector3(Math.sin(mid), 0, -Math.cos(mid)),
        ])
      }
    }

    // And stand them. Four shapes between them, keyed by seed as everything
    // instanced here is: a row of one beast repeated is a moulding, and a
    // row of fourteen distinct ones is fourteen draw calls for something
    // nobody can tell apart at the range it is seen from.
    for (const [k, [spot, out]] of beasts.entries()) {
      const variant = k % 4
      parts.surface(
        `gargoyle:${variant}`,
        () => ({
          geometry: buildGargoyle({
            reach: 2.3,
            drop: 1.5,
            girth: 0.56,
            sides: 7,
            seed: 41 + variant * 13,
          }),
          error: 0.02,
        }),
        new THREE.Matrix4()
          .makeTranslation(spot.x, spot.y, spot.z)
          .multiply(new THREE.Matrix4().makeRotationY(Math.atan2(out.x, out.z))),
        'shell',
        true,
      )
    }

    for (const [i, spot] of pinnacles.entries()) {
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
      // And the basket it carries. Two sizes and five glazings, because the
      // real ones are not all grapes — the roof is wheat and fruit in turn,
      // green and orange and red in turn, and a row of identical baskets
      // reads as a manufactured part.
      //
      // Five and not thirty. Everything that decides the geometry has to be
      // in the key or the first caller's basket is served to all of them —
      // and the seed decides the *colour* here, so a seed outside the key
      // would paint the whole roof with whatever the first pinnacle drew.
      // Five variants is ten instanced kinds for the entire roofscape and
      // no two neighbours alike.
      const bunch = i % 2 === 0 ? 30 : 20
      const variant = i % 5
      parts.surface(
        `roof fruit:${bunch}:${variant}`,
        () => ({
          geometry: buildFruit({
            radius: s.pinnacleRadius * 1.5,
            count: bunch,
            seed: 7 + variant,
            palette: FRUIT_PALETTE,
          }),
          // A berry is a centimetre or two off round at this size; nothing
          // below it to drop to.
          error: 0.02,
        }),
        new THREE.Matrix4().makeTranslation(
          spot.x,
          spot.y + s.pinnacleHeight * 0.93,
          spot.z,
        ),
        'ceramic',
        true,
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
