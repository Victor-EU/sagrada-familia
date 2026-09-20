import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { SurfacePatch } from '../render/sunrig.ts'
import { PLASTER } from '../render/materials.ts'
import { MODULE } from './module.ts'

/**
 * The floor, which was the last surface in the building nobody had designed.
 *
 * It was one grey disc of radius 320 doing two jobs — the pavement inside and
 * the ground outside — at one height, with nothing on it. That is not a small
 * omission dressed up as austerity. Measured on a frame taken standing in the
 * nave at eye height, the floor is **16 %** of the picture, the third largest
 * thing in it after two orders of column, and every one of those pixels
 * carried the same number. A surface that large with no features gives the
 * eye no distance, no scale and no contact: the columns did not stand on
 * anything, they stopped.
 *
 * Three things fix it, and only one of them is decoration.
 *
 *  - **Joints.** Paving is the strongest scale cue an interior has, because
 *    you read the size of a room off the size of its slabs. Drawn
 *    analytically from world position rather than from a texture: at a
 *    grazing angle down ninety metres of nave a texture is a moiré field, and
 *    a line that knows its own filter width can simply fade out when it gets
 *    thinner than a pixel.
 *  - **A podium.** Once the pavement is paved it has to stop somewhere, and
 *    the edge is the building's own footprint. The ground outside drops away
 *    from it, so the church stands on something instead of being pushed into
 *    the plaza.
 *  - **Somewhere to put your feet.** Fixed in `apse.ts` and `envelope.ts`
 *    rather than here, but found while looking at this: the presbytery is a
 *    two-metre platform with no steps and the camera walked through it up to
 *    the shoulders.
 *
 * The pattern is set out on the building's own grid, so it is the plan that
 * is being drawn and not a floor covering. Every heavy joint runs through a
 * line of column axes, because 7.5 m is where the columns are; inside the
 * apse it turns polar, because the apse is round, and its rings land on the
 * presbytery ring at 15 m and the ambulatory at 22.5 m without being asked.
 */
export interface FloorParams {
  show: boolean
  /** How far the pavement stands proud of the ground outside. */
  podium: number
  /** How far it runs out past the outside face of the walls. */
  apron: number
  /** Risers in the flight that gets you from the plaza up onto it. */
  steps: number
  /** The going of one of them. */
  going: number
  /** Slab size. A sixth of the module. */
  slab: number
  /** Half-width of an ordinary joint, and of one on a module line. */
  joint: number
  moduleJoint: number
  /** How far each darkens the stone, 0 to 1. */
  shade: number
  moduleShade: number
  /** Spread of the tint that separates one slab from the next. */
  grain: number
  /** How far to take the sky back out of the floor's ambient, 0 to 1. */
  warmth: number
  /** Radius of the roundel at the centre of the crossing. */
  roundel: number
}

export const defaultFloor: FloorParams = {
  show: true,
  podium: 1.35,
  apron: 1.6,
  // Five risers of twenty-seven centimetres, going half a metre. Twice the
  // rise plus the going is 1.04 m against the 0.63 a stair designed for
  // circulation wants, which is the proportion of a monumental flight and not
  // a mistake: a cathedral's base is something you arrive up, and the
  // presbytery steps inside are steeper still.
  steps: 5,
  going: 0.5,
  // Large, because the photographs are: the slabs in the nave read as well
  // over a metre against the people standing on them. A sixth of the module
  // puts six joints between one column and the next.
  slab: MODULE / 6,
  joint: 0.016,
  moduleJoint: 0.05,
  // Found by looking, against the photographs rather than against taste: at
  // a tenth the joints read as a faint haze and the near slabs have no edge;
  // past a fifth the nave starts to look tiled. The module lines carry half
  // again as much because they are what still reads at forty metres, once
  // the slab grid has faded out under its own filter width.
  shade: 0.16,
  moduleShade: 0.28,
  // Enough that one slab is not the next. Constant across a slab, so it
  // cannot alias however far away it is.
  grain: 0.035,
  // Measured: with the probe as it stands the pavement comes back at
  // (108, 115, 130) against a shaded column at (95, 89, 88) — a blue floor in
  // a warm stone room. Three quarters of the way to the room's own colour is
  // where it stops looking like it is lit from outside.
  warmth: 0.75,
  // "On the floor at the very centre of the crossing, there is a ceramic
  // composition with the acronym JMJ" — booklet 9. Three metres across, which
  // is the module's fifth, since nothing published gives its size.
  roundel: MODULE / 5,
}

/** What the pavement has to cover. */
export interface FootprintParams {
  /** Outside face of the nave walls, from the centreline. */
  halfWidth: number
  /** Outside face of the Glory wall. */
  near: number
  /** Where the hall ends and the apse begins. */
  mouthZ: number
  /** Centre of the apse circle. */
  apseCentreZ: number
  /** Outside face of the chevet, from that centre. */
  apseRadius: number
  /** The transept arms, where they stand out past the nave walls. */
  arm?: { halfWidth: number; near: number; far: number }
}

/**
 * The outline of the building at floor level: a hall with two arms and a half
 * circle on the end of it — a Latin cross, drawn as one polygon.
 *
 * The hall and the chevet do not meet flush. A nave forty-five metres across
 * is wider than a chevet of twenty-three metres' radius, so the plan steps
 * inward at the mouth — and that re-entrant corner is the building's, not an
 * artefact. The arc is the part of the circle beyond the mouth line, found by
 * where the chord cuts it rather than assumed to be a clean half.
 *
 * The apron is a skirt all the way round, so it pushes the arms out along
 * their own three sides and not only along the flanks.
 */
export function footprint(p: FootprintParams, apron: number, arc = 64): THREE.Vector2[] {
  const halfWidth = p.halfWidth + apron
  const near = p.near + apron
  const radius = p.apseRadius + apron
  const points: THREE.Vector2[] = [new THREE.Vector2(halfWidth, near)]

  /** One flank, from the Glory end toward the apse, with its arm on the way. */
  const flank = (side: 1 | -1): THREE.Vector2[] => {
    if (!p.arm) return []
    const out = (p.arm.halfWidth + apron) * side
    const edge = halfWidth * side
    // The apron stops at the mouth: past it the chevet is the outline, and an
    // arm that overshot would cut a notch out of the apse.
    const far = Math.max(p.arm.far - apron, p.mouthZ)
    return [
      new THREE.Vector2(edge, p.arm.near + apron),
      new THREE.Vector2(out, p.arm.near + apron),
      new THREE.Vector2(out, far),
      new THREE.Vector2(edge, far),
    ]
  }

  // Angle at which the mouth line cuts the circle, measured from +x about the
  // apse centre with the church's axis running to -z.
  const reach = (p.apseCentreZ - p.mouthZ) / radius
  const start = Math.abs(reach) < 1 ? Math.asin(reach) : 0

  points.push(...flank(1))
  points.push(new THREE.Vector2(halfWidth, p.mouthZ))
  for (let i = 0; i <= arc; i++) {
    const angle = start + (i / arc) * (Math.PI - 2 * start)
    points.push(
      new THREE.Vector2(radius * Math.cos(angle), p.apseCentreZ - radius * Math.sin(angle)),
    )
  }
  points.push(new THREE.Vector2(-halfWidth, p.mouthZ))
  points.push(...flank(-1).reverse())
  points.push(new THREE.Vector2(-halfWidth, near))

  // An arm whose far side lands on the mouth line repeats the point the arc
  // starts from, and a polygon with a zero-length edge in it triangulates
  // badly. Drop them once, here, rather than in every caller.
  return points.filter((point, i) => {
    const previous = points[(i - 1 + points.length) % points.length]!
    return point.distanceToSquared(previous) > 1e-6
  })
}

/**
 * The pavement and the podium it sits on.
 *
 * Two pieces of geometry and no solid: a lid at floor level and a skirt
 * hanging off its edge. Opaque plaster hides the fact that there is nothing
 * underneath, which is the same reason nothing else in this building is a
 * closed solid either.
 */
export function buildPavement(
  outline: THREE.Vector2[],
  podium: number,
  /** Round openings in the lid: the roof terraces need them for skylights. */
  holes: { x: number; z: number; r: number }[] = [],
): { lid: THREE.BufferGeometry; skirt: THREE.BufferGeometry } {
  return { lid: buildLid(outline, holes), skirt: riser(outline, 0, -podium) }
}

/** The lid on its own: one flat shape at y = 0, holes and all. */
export function buildLid(
  outline: THREE.Vector2[],
  holes: { x: number; z: number; r: number }[] = [],
): THREE.BufferGeometry {
  // ShapeGeometry lives in xy with its normal on +z, and the mesh that
  // carries it is turned a quarter turn about x, which sends y to -z.
  const shape = new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, -p.y)))
  for (const hole of holes) {
    const path = new THREE.Path()
    path.absarc(hole.x, -hole.z, hole.r, 0, Math.PI * 2, true)
    shape.holes.push(path)
  }
  const lid = new THREE.ShapeGeometry(shape)
  lid.rotateX(-Math.PI / 2)
  return lid
}

/**
 * The flight of steps the building stands on.
 *
 * Phase 3 gave the pavement a podium and drew its edge as a plain skirt, and
 * that was the right drawing for as long as the ground outside was a grey
 * disc nobody could stand on. A walker makes the same edge a wall: 1.35 m of
 * sheer plaster with a pavement visible over the top of it, stopping you for
 * a reason you cannot see. So it becomes a flight, and it goes all the way
 * round — which is what the building has, and which is the only version that
 * needs no gates, no landings and no opinion about which front you arrive at.
 *
 * Every ring is the same outline asked for again with a bigger apron, so the
 * steps follow the Latin cross round its arms and its re-entrant corners for
 * nothing. The treads face the sky, so the paving pattern draws its joints on
 * them; the risers do not, so it leaves them alone.
 */
export function buildBase(
  p: FootprintParams,
  apron: number,
  step: { going: number; rise: number; risers: number },
): { treads: THREE.BufferGeometry; risers: THREE.BufferGeometry } {
  const treads: THREE.BufferGeometry[] = []
  const risers: THREE.BufferGeometry[] = []

  for (let i = 1; i <= step.risers; i++) {
    const above = footprint(p, apron + (i - 1) * step.going)
    const below = footprint(p, apron + i * step.going)

    const shape = new THREE.Shape(below.map((v) => new THREE.Vector2(v.x, -v.y)))
    shape.holes.push(new THREE.Path(above.map((v) => new THREE.Vector2(v.x, -v.y))))
    const tread = new THREE.ShapeGeometry(shape)
    tread.rotateX(-Math.PI / 2)
    tread.translate(0, -i * step.rise, 0)
    treads.push(tread)

    risers.push(riser(above, -(i - 1) * step.rise, -i * step.rise))
  }

  return {
    treads: mergeGeometries(treads, false),
    risers: mergeGeometries(risers, false),
  }
}

/** A vertical band hung off an outline, from one height down to another. */
function riser(outline: THREE.Vector2[], top: number, bottom: number): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const centroid = outline
    .reduce((sum, p) => sum.add(p), new THREE.Vector2())
    .multiplyScalar(1 / outline.length)

  for (let i = 0; i < outline.length; i++) {
    const a = outline[i]!
    const b = outline[(i + 1) % outline.length]!
    const along = new THREE.Vector2().subVectors(b, a)
    if (along.lengthSq() < 1e-9) continue

    // Outward is whichever perpendicular points away from the middle of the
    // building, which saves having to care which way the outline is wound.
    const out = new THREE.Vector2(along.y, -along.x).normalize()
    const mid = new THREE.Vector2().addVectors(a, b).multiplyScalar(0.5).sub(centroid)
    if (out.dot(mid) < 0) out.negate()

    const quad = [
      [a.x, top, a.y],
      [a.x, bottom, a.y],
      [b.x, bottom, b.y],
      [a.x, top, a.y],
      [b.x, bottom, b.y],
      [b.x, top, b.y],
    ]
    for (const [x, y, z] of quad) {
      positions.push(x!, y!, z!)
      normals.push(out.x, 0, out.y)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  return geometry
}

/** Where the pattern needs the plan to tell it about itself. */
export interface PavingPlan {
  /** Centre of the apse circle, and the line where the plan stops being a grid. */
  apseCentreZ: number
  apseMouthZ: number
  /** Radial joints per chapel bay — four, so both the chapel divisions and
   *  the column radii land on one. */
  chapels: number
  radialsPerChapel: number
  /** Centre of the crossing, where the roundel is. */
  crossingZ: number
}

export interface PavingUniforms {
  [name: string]: THREE.IUniform
  /** Slab size, module. */
  uPavGrid: { value: THREE.Vector2 }
  /** Joint half-widths, ordinary and module. */
  uPavJoint: { value: THREE.Vector2 }
  /** How far each darkens the stone. */
  uPavShade: { value: THREE.Vector2 }
  /** Apse centre z, the mouth line, radians between radial joints. */
  uPavApse: { value: THREE.Vector3 }
  /** Roundel: x, z, radius. */
  uPavRoundel: { value: THREE.Vector3 }
  /** Slab-to-slab tint spread. */
  uPavGrain: { value: number }
  /** How far the ambient is pulled back to the colour of the room, and to what. */
  uPavWarmth: { value: number }
  uPavBounce: { value: THREE.Color }
}

export function pavingUniforms(): PavingUniforms {
  return {
    uPavGrid: { value: new THREE.Vector2(defaultFloor.slab, MODULE) },
    uPavJoint: { value: new THREE.Vector2(defaultFloor.joint, defaultFloor.moduleJoint) },
    uPavShade: { value: new THREE.Vector2(defaultFloor.shade, defaultFloor.moduleShade) },
    uPavApse: { value: new THREE.Vector3(0, 0, Math.PI / 28) },
    uPavRoundel: { value: new THREE.Vector3(0, 0, 0) },
    uPavGrain: { value: defaultFloor.grain },
    uPavWarmth: { value: defaultFloor.warmth },
    // The colour of the room, which is the colour of everything in it —
    // normalised to unit luminance so that rotating the ambient onto it
    // changes its hue and not how much of it there is.
    uPavBounce: { value: unitLuminance(new THREE.Color(PLASTER).convertSRGBToLinear()) },
  }
}

function unitLuminance(colour: THREE.Color): THREE.Color {
  const luminance = 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b
  return colour.multiplyScalar(1 / Math.max(luminance, 1e-4))
}

/** Point the pattern at the building it is being laid in. */
export function tunePaving(u: PavingUniforms, p: FloorParams, plan: PavingPlan): void {
  u.uPavGrid.value.set(Math.max(0.05, p.slab), MODULE)
  u.uPavJoint.value.set(p.joint, p.moduleJoint)
  u.uPavShade.value.set(p.shade, p.moduleShade)
  u.uPavApse.value.set(
    plan.apseCentreZ,
    plan.apseMouthZ,
    Math.PI / (plan.chapels * plan.radialsPerChapel),
  )
  u.uPavRoundel.value.set(0, plan.crossingZ, p.roundel)
  u.uPavGrain.value = p.grain
  u.uPavWarmth.value = THREE.MathUtils.clamp(p.warmth, 0, 1)
}

const PAVING_PARS = /* glsl */ `
uniform vec2 uPavGrid;
uniform vec2 uPavJoint;
uniform vec2 uPavShade;
uniform vec3 uPavApse;
uniform vec3 uPavRoundel;
uniform float uPavGrain;
uniform float uPavWarmth;
uniform vec3 uPavBounce;

/** Distance from x to the nearest line of a grid of this period. */
float sfToGrid( const in float x, const in float period ) {
  return period * 0.5 - abs( mod( x, period ) - period * 0.5 );
}

/**
 * How much of this pixel a joint covers.
 *
 * Two smoothsteps. The first is the joint's own edge, softened by the filter
 * width so a line narrower than a pixel is grey rather than stippled. The
 * second retires the line once a whole cell is down to a few pixels, which is
 * what stops ninety metres of receding pavement turning into moiré — the
 * alternative is a mip chain, and the pattern has no texture to mip.
 */
float sfJoint( const in float distance, const in float halfWidth, const in float filterWidth, const in float period ) {
  float edge = 1.0 - smoothstep( halfWidth - filterWidth, halfWidth + filterWidth, distance );
  return edge * ( 1.0 - smoothstep( period * 0.16, period * 0.55, filterWidth ) );
}

float sfSlabTint( const in vec2 cell ) {
  return fract( sin( dot( cell, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 ) - 0.5;
}

/**
 * The pavement at a world point: how dark the joints make it, and which slab
 * it belongs to.
 *
 * Cartesian under the naves and the crossing, polar under the apse, and the
 * seam between them is the mouth of the apse — which is a module line, so the
 * grid was going to draw it anyway.
 */
vec2 sfPaving( const in vec3 world ) {
  vec2 filterWidth = fwidth( world.xz );
  float isotropic = max( filterWidth.x, filterWidth.y );
  float joint = 0.0;
  vec2 cell;

  if ( world.z < uPavApse.y ) {
    vec2 fromCentre = vec2( world.x, uPavApse.x - world.z );
    float radius = length( fromCentre );
    float angle = atan( fromCentre.x, fromCentre.y );
    if ( angle < 0.0 ) angle += 6.283185307;
    float wedge = uPavApse.z;

    joint = max( joint, sfJoint( sfToGrid( radius, uPavGrid.x ), uPavJoint.x, isotropic, uPavGrid.x ) * uPavShade.x );
    joint = max( joint, sfJoint( sfToGrid( radius, uPavGrid.y ), uPavJoint.y, isotropic, uPavGrid.y ) * uPavShade.y );
    // A radial joint is a fixed angle, so on the ground it opens out with
    // radius — and so does the width it has to be measured against.
    float spread = max( radius, 0.5 );
    joint = max( joint, sfJoint( sfToGrid( angle, wedge ) * spread, uPavJoint.x, isotropic, wedge * spread ) * uPavShade.x );
    cell = vec2( floor( radius / uPavGrid.x ), floor( angle / wedge ) );
  } else {
    joint = max( joint, sfJoint( sfToGrid( world.x, uPavGrid.x ), uPavJoint.x, filterWidth.x, uPavGrid.x ) * uPavShade.x );
    joint = max( joint, sfJoint( sfToGrid( world.z, uPavGrid.x ), uPavJoint.x, filterWidth.y, uPavGrid.x ) * uPavShade.x );
    joint = max( joint, sfJoint( sfToGrid( world.x, uPavGrid.y ), uPavJoint.y, filterWidth.x, uPavGrid.y ) * uPavShade.y );
    joint = max( joint, sfJoint( sfToGrid( world.z, uPavGrid.y ), uPavJoint.y, filterWidth.y, uPavGrid.y ) * uPavShade.y );
    cell = floor( world.xz / uPavGrid.x );

    // The roundel at the centre of the crossing is an inlay, so the slabs
    // stop at it rather than running under it.
    float toCentre = length( world.xz - uPavRoundel.xy );
    float rim = uPavRoundel.z;
    if ( rim > 0.0 && toCentre < rim + uPavGrid.x ) {
      float inside = 1.0 - smoothstep( rim - isotropic, rim + isotropic, toCentre );
      // One piece of work, so one slab: no joints across it and no grain
      // stepping from ring to ring.
      joint = mix( joint, 0.0, inside );
      cell = mix( cell, vec2( 0.0 ), inside );
      joint = max( joint, sfJoint( abs( toCentre - rim ), uPavJoint.y, isotropic, uPavGrid.y ) * uPavShade.y );
      joint = max( joint, sfJoint( abs( toCentre - rim * 0.6 ), uPavJoint.x, isotropic, uPavGrid.y ) * uPavShade.x );
    }
  }

  return vec2( joint, sfSlabTint( cell ) );
}
`

const PAVING_COLOUR = /* glsl */ `
{
  // Only what faces the sky is paved. The podium's skirt and the risers of
  // the presbytery steps are the same material seen edge on, and a pattern
  // set out in world x and z would smear down them.
  vec3 faceNormal = normalize( cross( dFdx( vSunWorld ), dFdy( vSunWorld ) ) );
  float lying = smoothstep( 0.55, 0.9, abs( faceNormal.y ) );
  if ( lying > 0.0 ) {
    vec2 paving = sfPaving( vSunWorld );
    float darken = 1.0 - paving.x * lying;
    float tint = 1.0 + paving.y * uPavGrain * lying;
    diffuseColor.rgb *= darken * tint;
  }
}
`

/**
 * The floor is the one surface that faces the sky and never sees it.
 *
 * An environment probe lights an interior as if the walls were not there, and
 * what this one pours in is Barcelona sky. On a wall that is a slight chill;
 * on a floor, which is square-on to it, it is the whole ambient term, and the
 * pavement came back measurably blue — (108, 115, 130) under a shaded column
 * at (95, 89, 88). Nothing in a room of white plaster is that colour.
 *
 * Occluding the probe properly is global illumination and out of scope. What
 * is in scope is saying what the floor is actually lit by, which is the room:
 * the ambient is rotated onto the plaster's own colour at the luminance it
 * already had, so the floor keeps its brightness and loses the sky.
 *
 * Only the ambient. The sun is left exactly as it arrives, because the sun
 * arriving through Vila-Grau's glazing is the subject of the whole model and
 * nothing here is allowed to touch its colour.
 *
 * Note for anything else that wants this: `material.envMapIntensity` will not
 * do it. Where a material has no envMap of its own and the scene has an
 * environment, three overwrites that uniform with `scene.environmentIntensity`
 * every frame, so every per-material value in this project is a dead number.
 */
const PAVING_LIGHT = /* glsl */ `
{
  vec3 ambient = reflectedLight.indirectDiffuse;
  float luminance = dot( ambient, vec3( 0.2126, 0.7152, 0.0722 ) );
  reflectedLight.indirectDiffuse = mix( ambient, luminance * uPavBounce, uPavWarmth );
}
`

export const PAVING_PATCH: Omit<SurfacePatch, 'uniforms'> = {
  pars: PAVING_PARS,
  colour: PAVING_COLOUR,
  light: PAVING_LIGHT,
  key: 'paving-1',
}
