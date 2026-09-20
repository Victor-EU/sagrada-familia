import * as THREE from 'three'
import type { SurfacePatch } from './sunrig.ts'

/**
 * The stones.
 *
 * Until now every opaque surface in the model was one white plaster. That was
 * a deliberate early choice — a maquette has no material variation to budget
 * for — and it is the single thing that made the render look unreal, because
 * the building this is a model of is not white and the model already knew it.
 * `geometry/column.ts` has recorded the four stones since phase 2, quoting the
 * Basilica's own booklet: "the columns on the side naves, of sandstone from
 * Montjuïc; those on the central nave, of granite; those on the perimeter of
 * the crossing, of basalt; and the four in the centre, of red porphyry."
 * The knowledge was there and thrown away at the last step.
 *
 * So the palette is not invented. Every entry below is a published material
 * of the actual building, and the one judgement call in each is how light to
 * make the albedo, which is a function of the tone mapping rather than of the
 * stone.
 *
 * Albedos are lighter than the stone looks in a photograph, on purpose. These
 * are multiplied by a warm sun and a blue sky and then pushed through ACES,
 * which darkens the midtones; matching the photograph here would come out of
 * the filmic curve two stops under.
 */

/**
 * Montjuïc sandstone — the exterior, and the side-nave columns.
 *
 * The quarry closed in 1938 and the fabric has been matching it ever since,
 * which is why the building photographs as one honey-coloured mass at every
 * age of stone. This is the colour the whole envelope is.
 */
export const SANDSTONE = 0xdcc3a0

/** Grey granite — the central nave's eight-pointed columns. */
export const GRANITE = 0xb9b2a8

/** Basalt — the twelve on the perimeter of the crossing. Dark, and warm-grey. */
export const BASALT = 0x8a8178

/** Red porphyry — the four at the centre, under the tower of Jesus Christ. */
export const PORPHYRY = 0xa1766c

/**
 * The vault webbing.
 *
 * Whiter than anything below it. In every interior photograph the canopy is
 * the pale thing the columns rise into, and the gold up there is light rather
 * than stone — so it is left to the light to put it there.
 */
export const VAULT = 0xeee6d8

/** Clerestory and enclosing walls: sandstone, a shade lighter for the dressing. */
export const WALL = 0xe3d3b8

/**
 * The pavement.
 *
 * Warm, and polished rather than rough — the nave floor in the photographs
 * throws a long sheen back up the aisle, and that sheen is most of why the
 * interior reads as full of light rather than merely lit. Everything that
 * patterns it — joints, the grain from slab to slab — is drawn in the shader
 * from world position, so there is no texture to load and the pattern is
 * exact at any distance.
 */
export const PAVING = 0xd8c2a2

/**
 * What is behind a bell tower's openings.
 *
 * Not a colour of stone so much as a stand-in for a hundred metres of unlit
 * masonry tube. The towers are hollow, their openings are louvred, and in
 * every photograph of them the apertures are the darkest thing in the frame —
 * it is the contrast between pale shaft and black slot that makes a
 * silhouette read as Sagrada Família rather than as a spire.
 *
 * It stays out of `INDOORS` on purpose, so it takes the envelope's fill
 * rather than the room's and is allowed to be as dark outdoors as the real
 * thing is. See `buildTowerLouvres` in geometry/tower.ts.
 */
export const HOLLOW = 0x35302a

/**
 * The plaza outside, at the foot of the podium.
 *
 * Darker than it was. While the ground was the only thing out there, a pale
 * disc was the kind thing to do — it kept the building off a black field. With
 * the Eixample standing on it the same pale grey made every render wall in
 * Barcelona disappear into the road in front of it, and the whole city came
 * back as one sheet of polystyrene. Streets are darker than the buildings on
 * them, and that difference is what draws the grid.
 */
export const GROUND = 0x8e8779

/** The stones a piece of the building can be cut from. */
export type StoneName =
  | 'sandstone'
  | 'granite'
  | 'basalt'
  | 'porphyry'
  | 'vault'
  | 'wall'
  | 'facade'
  /** The dark behind a tower's louvres — see HOLLOW. */
  | 'hollow'
  /**
   * Pieces that face both ways: the terrace lids, their parapets, the lantern
   * collars. Their top is a roof standing in full sky and their underside is
   * the ceiling of the aisle below, and one fill cannot be right for both.
   * Given the envelope's fill they came back as black shapes scattered over
   * the vault whenever the camera looked up from inside — which is how they
   * were found. Given the room's, they take a share of the indoor bounce on
   * both faces, which costs a little contrast on a sunlit roof and is much
   * the cheaper mistake: that face has the sun on it and barely notices.
   */
  | 'shell'

/**
 * Colour and roughness only.
 *
 * Deliberately not `envMapIntensity`: where a material has no envMap of its
 * own and the scene has an environment, three overwrites that uniform from
 * `scene.environmentIntensity` every frame, so a per-stone value there would
 * be a dead number that looked live. The floor found this out the hard way —
 * see PAVING_LIGHT in plan/floor.ts.
 *
 * Roughness is doing the work instead, and it is the honest lever anyway: the
 * difference between basalt and sandstone in this building is mostly that one
 * of them is polished and the other is not.
 */
const RECIPE: Record<StoneName, { color: number; roughness: number }> = {
  sandstone: { color: SANDSTONE, roughness: 0.84 },
  granite: { color: GRANITE, roughness: 0.7 },
  basalt: { color: BASALT, roughness: 0.55 },
  porphyry: { color: PORPHYRY, roughness: 0.5 },
  vault: { color: VAULT, roughness: 0.88 },
  wall: { color: WALL, roughness: 0.86 },
  facade: { color: SANDSTONE, roughness: 0.88 },
  hollow: { color: HOLLOW, roughness: 0.96 },
  shell: { color: SANDSTONE, roughness: 0.88 },
}

function stone(name: StoneName): THREE.MeshStandardMaterial {
  const r = RECIPE[name]
  return new THREE.MeshStandardMaterial({
    color: r.color,
    roughness: r.roughness,
    metalness: 0,
    // Vault webbing is thin and seen from both sides.
    side: THREE.DoubleSide,
  })
}

/**
 * The ambient indoors is the room, not the sky.
 *
 * An environment probe lights an interior as if the walls were not there, and
 * what this one pours in is Barcelona sky — so every surface that the sun is
 * not currently on came back a pale blue-grey, and a nave lined floor to vault
 * in honey sandstone read as a grey cave. The floor hit this first and fixed
 * it for itself; the argument was never about floors, and this is that same
 * fix made general. See PAVING_LIGHT in plan/floor.ts for the long version.
 *
 * Occluding the probe properly is global illumination and out of scope. What
 * is in scope is saying what an interior surface is actually lit by, which is
 * every other interior surface: the ambient is rotated onto the colour of the
 * room at the luminance it already had, so the stone keeps its brightness and
 * loses the sky.
 *
 * And a room has directions. Rotating the probe's colour fixed the hue and
 * left it pouring the same light onto every surface whichever way it faced,
 * which is the one thing an ambient must not do here: measured against the
 * photographs, the real nave runs its vault 2.4x brighter than its columns
 * and this render ran them at 1.07x — one flat tone floor to vault, so the
 * flutes on a column and the ribs in a vault had no shaded side to be seen
 * by. A sky probe makes that worse rather than better, because a vault soffit
 * faces *down*, and down in a sky probe is the ground: the brightest surface
 * in the building was being handed the dimmest part of the sky.
 *
 * So the fill is asked where it comes from. Three answers, and none of them
 * is the sky: the floor is pale stone under a sunlit nave and throws light up
 * onto every soffit above it, the lucernaris and the clerestory come from
 * overhead, and the glazing is in the walls and arrives sideways. A surface
 * gets the ones it faces.
 *
 * Only the ambient. The sun is left exactly as it arrives, because the sun
 * arriving through Vila-Grau's glazing is the subject of the whole model and
 * nothing here is allowed to touch its colour.
 *
 * The envelope does not get this. Outdoors the sky is the honest answer, and
 * a tower that had its ambient warmed would lose the cool blue light down its
 * shaded flank that says it is standing outside.
 */
const INDOOR_LIGHT = /* glsl */ `
{
  vec3 ambient = reflectedLight.indirectDiffuse;
  float luminance = dot( ambient, vec3( 0.2126, 0.7152, 0.0722 ) );

  // Which way the surface faces decides which of the room's three sources it
  // is standing under. Doubled-sided webbing has already had its normal
  // flipped toward the viewer by here, so a vault seen from the floor below
  // correctly reads as facing down.
  vec3 roomNormal = inverseTransformDirection( normal, viewMatrix );
  float fromFloor = max( 0.0, -roomNormal.y );
  float fromAbove = max( 0.0, roomNormal.y );
  float lateral = 1.0 - abs( roomNormal.y );

  // Sideways is not one answer either. The glazing is in the long walls, so a
  // face turned across the church is looking at a window a few metres away
  // and a face turned along it is looking down ninety metres of colonnade.
  // Held equal, the two came back the same tone — which erases every vertical
  // crease in the building at a stroke, because the flutes of a shaft are all
  // sideways and differ only in which way round they point. The twenty-four
  // faces of a column were being handed one colour and a fluted shaft arrived
  // as a tube.
  //
  // x is across the church and z is along it. This is the one place the
  // shading knows the plan, and it is least true at the crossing, where the
  // transept opens the other axis up too.
  vec2 compass = normalize( vec2( roomNormal.x, roomNormal.z ) + vec2( 1e-5 ) );
  float fromGlass = lateral * mix( uRoomAlong, uRoomSide, abs( compass.x ) ) * uRoomGlass;

  // And the window is not a grey lamp.
  //
  // The glazing was being counted as one more source of the room's average
  // gold, which is the average of two halves that are nothing like each
  // other: the Nativity side is glazed green and blue and the Passion side
  // red and gold, and a nave lit by the mean of them is a nave with the
  // whole point of Vila-Grau's scheme averaged out of it. A surface turned
  // east is lit by the east window. It is the cheapest fact in the building
  // and it was the one being thrown away.
  //
  // x is across the church, +x toward the Nativity. The crossfade is wide
  // because a face turned along the nave sees both walls at a glance.
  //
  // And where it stands, not only which way it points. A column in the
  // Nativity aisle is standing *in* green light: the window is four metres
  // away on that side and ninety metres away on the other, so even the faces
  // turned across the church get more green than gold. Told only the normal,
  // the model gave every surface in the building one of exactly two colours
  // and the two aisles came out identical — which is the one thing a visitor
  // notices first and the photographs never let you forget.
  float standing = clamp( vSunWorld.x / uNaveHalf, -1.0, 1.0 );
  float toward = clamp( compass.x * 0.72 + standing * 0.58, -1.0, 1.0 );
  vec3 glass = mix( uGlassPassion, uGlassNativity, smoothstep( -0.45, 0.45, toward ) );

  // A sideways face is not looking only at a window. It is looking at a
  // window and at ninety metres of sandstone, and the sandstone is warm and
  // enormous. Handed the glass neat, the Nativity half of the nave came out
  // a green room rather than a gold room with green light in it — which is
  // the mistake in the other direction from the one before it.
  glass = mix( uRoomBounce, glass, uGlassShare );

  // The two are not mixed toward the room's average, because they are not
  // the same kind of claim. The room bounce is a guess at what colour a room
  // full of sandstone returns, and a guess gets blended with the probe it is
  // correcting. The glazing is not a guess: it is the light itself, arriving
  // through a known colour, and diluting it with Barcelona sky is how the
  // Passion side ends up the same temperature as the Nativity side.
  float fromRoom = uRoomFloor * fromFloor + uRoomSky * fromAbove;
  vec3 room = mix( ambient, luminance * uRoomBounce, uRoomWarmth ) * fromRoom;
  vec3 window = luminance * glass * fromGlass;

  reflectedLight.indirectDiffuse = ( room + window ) * uRoomGain;
}
`

const INDOOR_PARS = /* glsl */ `
uniform vec3 uRoomBounce;
uniform float uRoomWarmth;
uniform float uRoomGain;
uniform float uRoomFloor;
uniform float uRoomSky;
uniform float uRoomSide;
uniform float uRoomAlong;
uniform float uRoomGlass;
uniform float uGlassShare;
uniform float uNaveHalf;
uniform vec3 uGlassNativity;
uniform vec3 uGlassPassion;
`

/** Normalised so rotating onto it changes hue and not how much light there is. */
function unitLuminance(colour: THREE.Color): THREE.Color {
  const l = 0.2126 * colour.r + 0.7152 * colour.g + 0.0722 * colour.b
  return colour.multiplyScalar(1 / Math.max(l, 1e-4))
}

export interface RoomUniforms extends Record<string, THREE.IUniform> {
  uRoomBounce: { value: THREE.Color }
  uRoomWarmth: { value: number }
  uRoomGain: { value: number }
  uRoomFloor: { value: number }
  uRoomSky: { value: number }
  uRoomSide: { value: number }
  uRoomAlong: { value: number }
  uRoomGlass: { value: number }
  uGlassShare: { value: number }
  uNaveHalf: { value: number }
  uGlassNativity: { value: THREE.Color }
  uGlassPassion: { value: THREE.Color }
}

/**
 * The colour of the light inside.
 *
 * Not the colour of the walls, which was the first guess and is wrong: the
 * light in that room arrived through Vila-Grau's glazing before it ever
 * touched a wall, and what comes through is amber on one side and green-blue
 * on the other, averaging to a warm gold. That gold is the single most
 * recognisable thing about the interior in every photograph of it, and no
 * amount of warm stone under blue sky will produce it.
 */
export const ROOM_LIGHT = 0xffd8a8

/**
 * The two halves of the room, measured off the photographs.
 *
 * Not the colour of the glass — the colour of what lands on the stone behind
 * it, which is the thing being modelled. The Nativity side throws a cool
 * emerald that goes blue where it falls across a soffit; the Passion side
 * throws the orange that the whole interior is famous for, and which is
 * nearer to a flame than to amber.
 */
export const GLASS_EAST = 0xb6e2cc
export const GLASS_WEST = 0xffc99a

export function roomUniforms(): RoomUniforms {
  return {
    uRoomBounce: { value: unitLuminance(new THREE.Color(ROOM_LIGHT).convertSRGBToLinear()) },
    /**
     * Not all the way, and much less far than it was.
     *
     * At 0.9 the whole room went one shade of amber and the Nativity side
     * stopped being the cool half of the building, which is half of what the
     * glazing is for. At 0.68, where this sat, the failure was quieter and
     * worse: rotating two thirds of the fill onto amber and then asking ACES
     * to tone-map it turned every pale stone in the building the colour of
     * milky tea. Montjuïc sandstone is 0xdcc3a0 and the columns were coming
     * out near 0x6a4a3b — the model was saying honey and the screen was
     * saying chocolate.
     *
     * The light in that room is gold. The stone in it is not, and the stone
     * is most of what you can see. Under half, and the gold goes back to
     * being something that lands on the stone rather than something the
     * stone is made of.
     */
    uRoomWarmth: { value: 0.45 },
    /**
     * How much more fill there is indoors than out.
     *
     * Not a fudge: it is the one place where the single global ambient was
     * telling a flat lie about two different rooms. Outdoors, light that
     * misses a surface leaves for the sky and never comes back, so a shaded
     * face is lit by sky alone and reads nearly black against a sunlit one —
     * which is exactly what the photographs of the towers show. Indoors,
     * light is trapped: it arrives through the glass and then bounces from
     * wall to vault to floor until it is absorbed, and the shaded side of a
     * column is filled several times over.
     *
     * One ambient could serve one of those two and was serving neither. The
     * fill is cut hard for the whole scene so the exterior gets its contrast
     * back, and the stones standing inside get it multiplied here.
     *
     * Two rather than seven. Seven was set when this was the only thing
     * lighting the room, and it was: turning the sun off entirely moved a
     * measured interior by one part in a hundred, so every photograph-famous
     * thing about this interior — the gold off the Passion glass, the green
     * off the Nativity glass, a shaft of it lying on the floor — was being
     * computed correctly and then buried under a flat fill seven times its
     * size. The fill stops being the light in the room and goes back to being
     * what keeps a shadow from being black; the sun does the work, which is
     * the only way the light gets to be *coloured*.
     */
    uRoomGain: { value: 1 },
    /**
     * Where the fill comes from, now that it is asked.
     *
     * The floor is the big one and the surprising one. It is pale Montjuïc
     * paving under the brightest part of the room, it is enormous, and every
     * soffit in the building faces it — so the vaults are lit from below,
     * which is why they photograph brighter than the columns holding them up
     * and why they were the thing most wrong before.
     *
     * Overhead is the lucernaris and the clerestory, real but much smaller in
     * area. Sideways is the glazing, which matters less than it sounds: the
     * glass is doing its best work as *sun*, and counting it twice here would
     * put its colour on faces it never reaches.
     */
    uRoomFloor: { value: 8 },
    uRoomSky: { value: 1.2 },
    /** Turned across the church, at the glazing a few metres away. */
    uRoomSide: { value: 1.15 },
    /**
     * Turned along it, at the next column and the ninety metres behind it.
     *
     * Not nearly nothing, which is what 0.12 amounted to once the glazing
     * became the room's main source. A column in the photographs is lit all
     * the way round — the two faces turned up and down the nave are darker
     * than the two turned across it, and that difference is what makes a
     * fluted shaft read as round, but neither of them is black.
     */
    uRoomAlong: { value: 0.16 },
    /**
     * How much light the windows are.
     *
     * This was the missing half of the room. The sun through the glass was
     * modelled, carefully, and it is a few per cent of the illumination in
     * there: a window is a hundred square metres of sky, and the sun's disc
     * subtends half a degree of it. Every photograph in the folder is of a
     * surface the sun is not on — a soffit, the shaded flank of a column, the
     * whole north half of the nave — and all of them are luminous, because
     * what lights them is the *sky* through Vila-Grau's glass, arriving from
     * a wall-sized source a few metres away.
     *
     * With no term for it the model had to make the room out of a neutral
     * fill, and a neutral fill at the level a photograph wants is a fog. So
     * the glazing becomes what it is — the brightest thing in the building
     * and the reason the stone is gold — and the neutral fill goes back to
     * being small.
     */
    uRoomGlass: { value: 3.0 },
    /** How much of a sideways face's light is the window and not the room. */
    uGlassShare: { value: 0.26 },
    /** Half the width of the glazed envelope, so a position can be a side. */
    uNaveHalf: { value: 24 },
    uGlassNativity: { value: unitLuminance(new THREE.Color(GLASS_EAST).convertSRGBToLinear()) },
    uGlassPassion: { value: unitLuminance(new THREE.Color(GLASS_WEST).convertSRGBToLinear()) },
  }
}

/**
 * The grain.
 *
 * A hundred-metre façade at one flat albedo reads as an extrusion of coloured
 * plastic, and no amount of correct hue fixes it, because what the eye is
 * missing is not the colour — it is the fact that the wall is made of
 * thousands of separate blocks, cut at different times from different beds of
 * the same quarry, and weathered for anything between five and a hundred and
 * forty years. In every photograph of this building that variation is the
 * loudest thing on the stone.
 *
 * Two octaves of value noise on world position, so a piece's grain belongs to
 * where it stands in the building rather than to its own local coordinates —
 * which matters here more than usual, because the fabric is instanced and
 * four hundred columns share one geometry. Sampling in model space would give
 * every one of them identical markings.
 *
 * Plus a faint horizontal banding, because it is laid in courses.
 *
 * Nine per cent either way. That is small enough that no single block calls
 * attention to itself and large enough that the wall stops being one object.
 */
const GRAIN_PARS = /* glsl */ `
uniform float uGrainDepth;
uniform float uGrainCourse;

float sfHash( vec3 p ) {
  p = fract( p * 0.3183099 + vec3( 0.71, 0.113, 0.419 ) );
  p *= 17.0;
  return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) );
}

float sfValueNoise( vec3 x ) {
  vec3 i = floor( x );
  vec3 f = fract( x );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix(
      mix( sfHash( i + vec3( 0.0, 0.0, 0.0 ) ), sfHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
      mix( sfHash( i + vec3( 0.0, 1.0, 0.0 ) ), sfHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ),
      f.y ),
    mix(
      mix( sfHash( i + vec3( 0.0, 0.0, 1.0 ) ), sfHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
      mix( sfHash( i + vec3( 0.0, 1.0, 1.0 ) ), sfHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ),
      f.y ),
    f.z );
}
`

const GRAIN_COLOUR = /* glsl */ `
{
  vec3 w = vSunWorld;
  // Roughly 1.8 m blocks, mottled at about 30 cm.
  float grain = sfValueNoise( w * 0.55 ) * 0.68 + sfValueNoise( w * 3.1 ) * 0.32;
  diffuseColor.rgb *= mix( 1.0 - uGrainDepth, 1.0 + uGrainDepth, grain );
  float course = sfValueNoise( vec3( 12.7, w.y * 5.5, 4.3 ) );
  diffuseColor.rgb *= 1.0 + ( course - 0.5 ) * uGrainCourse;
}
`

export interface GrainUniforms extends Record<string, THREE.IUniform> {
  uGrainDepth: { value: number }
  uGrainCourse: { value: number }
}

export function grainUniforms(): GrainUniforms {
  return { uGrainDepth: { value: 0.09 }, uGrainCourse: { value: 0.06 } }
}

/**
 * How one stone is patched.
 *
 * Every stone gets the grain; only the ones standing indoors get the ambient
 * rotation. The two are composed here rather than by patching twice, because
 * `patchForSunlight` takes one patch and three's program cache keys off the
 * one string — two materials whose patches differ but whose keys agree
 * silently share a program, and the second one gets the first one's shader.
 */
export function stonePatch(
  name: StoneName,
  grain: GrainUniforms,
  room: RoomUniforms,
): SurfacePatch {
  const indoors = INDOORS.includes(name)
  return {
    uniforms: indoors ? { ...grain, ...room } : { ...grain },
    pars: indoors ? `${GRAIN_PARS}\n${INDOOR_PARS}` : GRAIN_PARS,
    colour: GRAIN_COLOUR,
    light: indoors ? INDOOR_LIGHT : undefined,
    key: indoors ? 'stone-room-1' : 'stone-1',
  }
}

/** Stones that stand inside the building and never see the sky. */
export const INDOORS: readonly StoneName[] = [
  'sandstone',
  'granite',
  'basalt',
  'porphyry',
  'vault',
  'wall',
  'shell',
]

/** Every stone in the building, built once and shared by everything cut from it. */
export type Quarry = Record<StoneName, THREE.MeshStandardMaterial>

export function openQuarry(): Quarry {
  return {
    sandstone: stone('sandstone'),
    granite: stone('granite'),
    basalt: stone('basalt'),
    porphyry: stone('porphyry'),
    vault: stone('vault'),
    wall: stone('wall'),
    facade: stone('facade'),
    hollow: stone('hollow'),
    shell: stone('shell'),
  }
}

/**
 * Which stone a column of this order is cut from.
 *
 * The orders carry the answer already — see `BASE_SHAPE` in column.ts, where
 * the same four stones have been recorded since phase 2. This is that table
 * read back out, so the two cannot drift apart.
 */
export function stoneForOrder(order: number): StoneName {
  switch (order) {
    case 12:
      return 'porphyry'
    case 10:
      return 'basalt'
    case 8:
      return 'granite'
    default:
      return 'sandstone'
  }
}

/**
 * The fill a street has and open country does not.
 *
 * The scene's ambient is cut hard so that the towers keep their modelling: a
 * face the sun has missed is lit by sky alone and comes back nearly black,
 * which is exactly right for something standing free at a hundred and fifty
 * metres. It is exactly wrong for a six-storey block on a twenty-metre
 * street, which is facing another six-storey block across a bright pavement
 * and is filled several times over by it. Given the tower's ambient, half the
 * Eixample rendered as black cardboard cut-outs and the grid read as a hole
 * in the ground rather than as a city.
 *
 * So the city gets its own fill, for the same reason and by the same
 * mechanism as the room indoors: an urban canyon traps light too. Less than
 * the room does — a street has the sky over it — but far more than nothing.
 *
 * It is scenery, so this is the whole of its lighting model.
 */
const CITY_LIGHT = /* glsl */ `
{
  reflectedLight.indirectDiffuse *= uCityFill;
}
`

const CITY_PARS = /* glsl */ `
uniform float uCityFill;
`

export interface CityUniforms extends Record<string, THREE.IUniform> {
  uCityFill: { value: number }
}

export function cityUniforms(): CityUniforms {
  // Enough that a shaded render wall is grey rather than black, and no more.
  // At 3.4 the grid came back the brightest thing in the frame and the temple
  // was reading as a dark object in a bright city, which is the wrong way
  // round in every photograph ever taken of it.
  return { uCityFill: { value: 1.5 } }
}

export function cityPatch(fill: CityUniforms): SurfacePatch {
  return { uniforms: { ...fill }, pars: CITY_PARS, light: CITY_LIGHT, key: 'city-1' }
}

export function groundMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: GROUND,
    roughness: 0.95,
    metalness: 0,
  })
}

export function pavingMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PAVING,
    // Polished. A rough floor cannot throw the sheen that every photograph of
    // this nave has running down the middle of it.
    roughness: 0.42,
    metalness: 0,
    side: THREE.DoubleSide,
  })
}

/** Straight generators of a ruled surface, drawn over the surface itself. */
export function rulingMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x2b6cb0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
}
