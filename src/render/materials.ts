import * as THREE from 'three'
import type { SurfacePatch } from './sunrig.ts'
import { WASH_PARS, type WashUniforms } from './washrig.ts'

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
 * are multiplied by a warm sun and a blue sky and then pushed through a film
 * curve — AgX now, ACES when they were set, and the two agree on where
 * mid-grey lands — which darkens the midtones; matching the photograph here
 * would come out of the curve two stops under. What the film then does to
 * the colour is its own business: see render/film.ts.
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

/**
 * Glazed ceramic fruit.
 *
 * Pale, not gaudy. The baskets on the roof pinnacles photograph as cream and
 * eau-de-nil with a little coral in them — grapes, apples, peaches — and the
 * saturated version of that is a fairground. What makes them read from the
 * street is that they are *shiny* on a matt building, so the roughness is
 * doing most of the work here and the hue is doing very little.
 */
export const CERAMIC = 0xd9d2b0

/** Clerestory and enclosing walls: sandstone, a shade lighter for the dressing. */
export const WALL = 0xe3d3b8

/**
 * The same sandstone, outdoors.
 *
 * Paler and greyer than the interior figure, because it is not the same
 * surface: the envelope has weathered for up to a hundred and forty years in
 * city air, and the fronts photograph as a pale warm grey, not honey — the
 * honey is what the interior's coloured light makes of the stone, and the
 * plaza has no coloured light. The saturation is the number that moved: a
 * quarter to a sixth.
 *
 * It is the *generic* envelope now rather than the whole of it — what a piece
 * is cut from when nothing about it says which age of the building it belongs
 * to. The terraces, the podium, the roof pinnacles. The five things that do
 * say are below.
 */
export const FACADE = 0xc2b49c

/**
 * The five fabrics, and why one stone was the single worst thing about the
 * exterior.
 *
 * Nothing in the model distinguished them and the eye distinguishes nothing
 * else. A visitor standing on the plaza is looking at a building begun in
 * 1882 and still going, and its ages are legible from across the street:
 * the Nativity front is nearly black, the Passion front is pale honey, the
 * portico in front of it is white, and the six towers over the crossing are
 * grey factory-cut panel. Four fabrics, side by side, in the same frame, at
 * the same hour. Given one albedo the whole thing reads as a single object
 * that was manufactured at once — which is exactly what a maquette is.
 *
 * Every figure below is measured off the reference frames, sampled over a
 * patch of the named surface and quoted as it comes out of the film. The
 * albedo that produces it was found by sweeping the live material against the
 * December porch frame, so the number is what the curve and the sky make of
 * it rather than what it looks like in a colour picker.
 */

/**
 * The Nativity front and its four towers — 1894 to 1930.
 *
 * The oldest stone on the building and the darkest thing in any skyline it
 * appears in: ninety years of Barcelona traffic on porous Montjuïc sandstone,
 * with the mortar still pale behind it, which is why that front reads as a
 * dark cliff with a light net over it rather than as a dark wall. Measured on
 * the plaza frame: 77 66 64 on the sunlit flank, 98 88 76 where the light
 * grazes. Nothing else on the building is within forty points of that.
 */
export const NATIVITY_STONE = 0x4a4139

/**
 * The Passion front and its four towers — 1954 to 1976.
 *
 * Half a century younger and cut when the quarry was already closed, so it is
 * matched rather than original, and it has weathered into the colour most
 * people think the whole building is. Measured on the author's own December
 * frames at 159 139 122, a fifth saturated; in April sun, 119 107 95.
 */
export const PASSION_STONE = 0xc4ac86

/**
 * The new white stone: the Passion portico, the Glory front, the blades.
 *
 * Subirachs' portico is deliberately not the colour of the wall behind it —
 * it is pale, near-neutral, and it is the one thing on that front that throws
 * a hard white edge against the sky. 160 156 152 on the December frame, at a
 * twentieth saturated, which is as close to grey as this building gets.
 */
export const NEW_WHITE = 0xd4cfc8

/**
 * The six central towers — Jesus, Mary, the four Evangelists, 2016 on.
 *
 * Not laid stone at all. They are prefabricated panels hoisted into place, so
 * the surface is flat, the seams are long straight lines rather than courses,
 * and the colour is a cooler grey than anything quarried. 157 151 143 off the
 * flank frame. The tower of the Virgin is the same panel under a diamond
 * facing, which is a pattern rather than a colour and belongs in the masonry
 * shader, not here.
 */
export const PANEL_STONE = 0xd2cbc0

/**
 * Venetian glass mosaic, on the pinnacle of every bell tower.
 *
 * The only colour on a sandstone building, and the reason the crowns are what
 * everybody photographs from the terraces. Four tesserae, taken off the
 * plaza frame: a red that is nearer terracotta than scarlet, a gold, a warm
 * white, and the green that turns up in the wheat and the fruit. They are
 * carried on the geometry rather than in the material — see `buildPinnacle`,
 * which bands them up the profile, because a mitre is striped and a single
 * colour would be a hat.
 */
export const MOSAIC_PALETTE: readonly number[] = [0xb4402e, 0xd8a13c, 0xe8e2d6, 0x7f9a6a]

/**
 * White glazed ceramic: the cross on the tower of Jesus Christ, and the star
 * on the tower of the Virgin.
 *
 * Both are clad rather than carved — enamelled ceramic and glass, the cross
 * in white, the star in a pale gold — and what that buys in a frame is a
 * *specular* crown: at a hundred and seventy metres the cross catches the sun
 * as a highlight where every stone around it catches it as a tone. A matt
 * white cross is a cross-shaped hole in the sky. This one is not matt.
 */
export const ENAMEL = 0xf0ece2

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
  /**
   * The four ages of the envelope, and the two things that are not stone.
   *
   * A piece takes the fabric of the part of the building it belongs to: the
   * front it stands on, or the decade it was hoisted into place. See the
   * constants above for what each is and what it was measured against. They
   * are all outdoor stones — none of them has a face inside the building —
   * so they take the sky's fill and never the room's.
   */
  | 'nativity'
  | 'passion'
  | 'white'
  | 'panel'
  /** Venetian glass on a bell tower's pinnacle; colour rides on the mesh. */
  | 'mosaic'
  /** Enamelled ceramic: the cross, and the star. Glossy, and meant to be. */
  | 'enamel'
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
   * The glazed ceramic of the roof: the fruit on every pinnacle, and the
   * mosaic that caps a bell tower. Not stone at all — it is Venetian glass
   * and enamelled tile, which is why it is the one thing on a sandstone
   * building that reads as colour from the street.
   */
  | 'ceramic'

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
  facade: { color: FACADE, roughness: 0.88 },
  // Old stone is rougher than new: a century of city air etches it, and the
  // Nativity front has no sheen anywhere on it. Panel is the smoothest thing
  // on the building because it was cut by a machine and never weathered.
  nativity: { color: NATIVITY_STONE, roughness: 0.93 },
  passion: { color: PASSION_STONE, roughness: 0.86 },
  white: { color: NEW_WHITE, roughness: 0.78 },
  panel: { color: PANEL_STONE, roughness: 0.72 },
  // Glass and enamel. Both carry their colour on the mesh rather than here —
  // mosaic because a mitre is banded, enamel because it is white and the
  // roughness is the whole of what makes it read.
  mosaic: { color: 0xffffff, roughness: 0.3 },
  enamel: { color: ENAMEL, roughness: 0.18 },
  hollow: { color: HOLLOW, roughness: 0.96 },
  shell: { color: FACADE, roughness: 0.88 },
  ceramic: { color: CERAMIC, roughness: 0.28 },
}

/**
 * Stones whose colour is written on the geometry rather than on the material.
 *
 * One of them so far: the mosaic on a pinnacle, which is banded up its own
 * profile. Anything cut from one of these *must* carry a `color` attribute —
 * three multiplies by it, and geometry without one comes back black.
 */
const PAINTED: readonly StoneName[] = ['mosaic']

/**
 * The albedo a named stone is cut at.
 *
 * So that a piece which grows out of another can match it without the number
 * being written down twice: a pinnacle's lowest band is the stone of the
 * shaft it stands on, and that has to stay true when the shaft's stone moves.
 */
export function stoneColour(name: StoneName): number {
  return RECIPE[name].color
}

function stone(name: StoneName): THREE.MeshStandardMaterial {
  const r = RECIPE[name]
  return new THREE.MeshStandardMaterial({
    color: r.color,
    roughness: r.roughness,
    metalness: 0,
    vertexColors: PAINTED.includes(name),
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

  // What the windows actually put on this surface, shadowed and patterned —
  // see render/washrig.ts. Where the rig has an answer it is a much better
  // one than the fill above, so the fill is faded out in proportion: the two
  // are the same light, and the fill is only standing in where the rig
  // cannot see (outside its fit, behind a wall, facing along the nave).
  vec3 washed = sfWash( inverseTransformDirection( normal, viewMatrix ), vSunWorld );
  float covered = clamp( dot( washed, vec3( 0.333 ) ) * uWashCover, 0.0, 1.0 );
  fromGlass *= 1.0 - covered;

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

  // And only where the surface actually stands in the room — see SHELTER.
  // The face of a wall that looks out over the plaza, or the top of a
  // terrace, takes the sky like everything else outside.
  vec3 fill = ( room + window + washed * luminance ) * uRoomGain;
  reflectedLight.indirectDiffuse = mix( ambient, fill, sfSheltered );
}
`

/**
 * Whether this fragment is under a roof.
 *
 * A stone does not know which side of the wall it is on, and the enclosing
 * walls and the terrace lids are one piece with a face on each side: the
 * clerestory wall's outer face was being lit with the gold of the room it
 * was standing outside of, and came back a stripe of honey along a pale
 * front. The roof map already answers the question for the air — see
 * render/roof.ts — so the stone asks it too, a step out along its own normal,
 * which puts the inner face of a wall under the vault and the outer face
 * under the sky. It is asked once, early, so both the probe's share and the
 * room's fill can be settled by the one answer.
 */
const SHELTER = /* glsl */ `
float sfSheltered = 0.0;
{
  vec3 sfOut = inverseTransformDirection( geometryNormal, viewMatrix );
  // A step and a half out along the normal, and then a look around. The
  // step has to clear the wall it is standing in: the reveals of a window
  // are splayed, so their normals lean half sideways, and a short step from
  // one stayed inside the metre of masonry and found the terrace overhead.
  // The look around is for the same faces — a reveal is lit from both sides
  // of the wall, and the honest answer for it is a share of each.
  vec3 sfProbe = vSunWorld + sfOut * 1.5;
  vec2 sfTaps[5];
  sfTaps[0] = vec2( 0.0, 0.0 );
  sfTaps[1] = vec2( 1.5, 0.0 );
  sfTaps[2] = vec2( - 1.5, 0.0 );
  sfTaps[3] = vec2( 0.0, 1.5 );
  sfTaps[4] = vec2( 0.0, - 1.5 );
  float sfCentre = 0.0;
  float sfRing = 0.0;
  for ( int i = 0; i < 5; i ++ ) {
    vec3 sfAt = sfProbe + vec3( sfTaps[ i ].x, 0.0, sfTaps[ i ].y );
    vec4 sfClip = uRoofMatrix * vec4( sfAt, 1.0 );
    vec2 sfUv = sfClip.xy * 0.5 + 0.5;
    float sfUnder = 0.0;
    if ( sfUv.x >= 0.0 && sfUv.x <= 1.0 && sfUv.y >= 0.0 && sfUv.y <= 1.0 ) {
      sfUnder = smoothstep( 0.0, 2.0, texture2D( uRoofHeight, sfUv ).r - sfAt.y );
    }
    if ( i == 0 ) sfCentre = sfUnder;
    else sfRing += sfUnder * 0.25;
  }

  /**
   * The centre tap decides and the ring only leans.
   *
   * Averaged equally, the five taps gave the *outer* face of every enclosing
   * wall in the building a fifth of a vote for being indoors — because one
   * tap of the ring always steps back across the wall it is standing on and
   * finds the terrace over it. A fifth would be harmless if the two fills
   * were the same size, and they are nothing like it: the room's is a
   * window counted at nearly three and a floor counted at eight, against an
   * outdoor probe that has been cut hard so the towers keep their
   * modelling. Twenty per cent of the one swamped the whole of the other,
   * and the nave's flank came back a sheet of interior gold on a frame
   * taken from two streets away.
   *
   * So the fragment's own answer carries the weight, the ring is there to
   * soften a splayed reveal — which genuinely is lit from both sides — and
   * the result is pushed toward its ends, so that a face which is merely
   * *near* a roof is outdoors rather than a fifth indoors.
   */
  sfSheltered = smoothstep( 0.34, 0.86, sfCentre * 0.68 + sfRing * 0.32 );
}
iblIrradiance *= mix( uSkyFill, 1.0, sfSheltered ) * uFillScale;
`

// `uFillScale` is declared by OUTDOOR_PARS, which every indoor stone also
// gets — GLSL calls a second declaration a redefinition and refuses to
// compile the shader, and three's fallback for that is a material that
// silently draws with somebody else's program.
const SHELTER_PARS = /* glsl */ `
uniform mat4 uRoofMatrix;
uniform sampler2D uRoofHeight;
`

export interface ShelterUniforms extends Record<string, THREE.IUniform> {
  uRoofMatrix: { value: THREE.Matrix4 }
  uRoofHeight: { value: THREE.Texture }
}

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
uniform float uWashCover;
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
  uWashCover: { value: number }
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
/**
 * Warmer and much more saturated than the first guess, off the author's own
 * December frames: the wash the Passion glass throws onto the canopy at
 * three in the afternoon reads 203 117 19 through Classic Chrome — hue 32°,
 * nine tenths saturated — and 0xffc99a, at four tenths, was the colour of a
 * lamp rather than of sun through orange glass.
 */
export const GLASS_WEST = 0xffb14a

export function roomUniforms(): RoomUniforms {
  return {
    uRoomBounce: { value: unitLuminance(new THREE.Color(ROOM_LIGHT).convertSRGBToLinear()) },
    /**
     * Not all the way, and much less far than it was.
     *
     * At 0.9 the whole room went one shade of amber and the Nativity side
     * stopped being the cool half of the building, which is half of what the
     * glazing is for. At 0.68, where this sat, the failure was quieter and
     * worse: rotating two thirds of the fill onto amber and then asking the
     * tone curve to map it turned every pale stone in the building the colour of
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
    uRoomGlass: { value: 2.8 },
    /** How much of a sideways face's light is the window and not the room. */
    uGlassShare: { value: 0.26 },
    /** Half the width of the glazed envelope, so a position can be a side. */
    uNaveHalf: { value: 24 },
    /**
     * How fast the flat fill gives way to the rig that supersedes it.
     *
     * Not all the way. The rig is a *directional* source and the two maps run
     * along one axis, so it can only light what has an unobstructed line to a
     * window across the church — and most of a colonnade does not. A real
     * window is a wall of sky subtending a wide angle from everywhere in the
     * room, and the flat fill is the only thing standing for the part of it
     * that arrives round a column. Faded out entirely, the nave goes back to
     * being a cave with bright patches in it.
     */
    uWashCover: { value: 0.8 },
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
 * The fill outdoors is the sky, and there is more of it than the room gets.
 *
 * The one probe lights both, and its intensity was set low for the room —
 * past about a third the nave goes pale and blue, because the probe is sky
 * and a nave is not lit by sky. But a tower's shaded flank *is*: it faces
 * half a hemisphere of clear blue, and at the room's setting it was being
 * lit mostly by the hemisphere stand-in, which is warm, so the shade came
 * back as brown. In every photograph of this building the shade is cool —
 * it is the one thing that says the stone is standing under a sky — and
 * measured on the plaza frame the shaded front sat at hue 32° and a third
 * saturated, which is the colour of a cardboard box.
 *
 * So the envelope scales the probe's irradiance and nothing else: the sun is
 * untouched, the hemisphere is untouched, and the room never sees it.
 */
const OUTDOOR_INDIRECT = /* glsl */ `
iblIrradiance *= uSkyFill * uFillScale;
`

const OUTDOOR_PARS = /* glsl */ `
uniform float uSkyFill;
uniform float uFillScale;
`

export interface OutdoorUniforms extends Record<string, THREE.IUniform> {
  uSkyFill: { value: number }
}

export function outdoorUniforms(): OutdoorUniforms {
  return { uSkyFill: { value: 3.2 } }
}

/**
 * How much of the sky a stone of this kind can actually see.
 *
 * The envelope's fill is set for a surface standing in the open with half a
 * hemisphere of blue over it, and one stone in the building is nowhere near
 * that: the panel behind a bell tower's aperture sits a metre down a slot cut
 * in a metre of masonry, and what it can see of the sky is a letterbox. Given
 * the open figure it came back as a *lit* grey rectangle — so every opening
 * on the building read as a slightly different shade of tower rather than as
 * a hole, and the silhouette that ought to be a lattice went back to being a
 * mottled cone.
 *
 * Per stone rather than per fragment, which is the cheap half of the honest
 * answer: a real cavity term measures how much sky each point can see and is
 * what step five is for. This says only that one kind of surface is at the
 * bottom of a hole, which is true of every fragment of it by construction.
 */
const FILL_SCALE: Partial<Record<StoneName, number>> = {
  hollow: 0.16,
}

/**
 * How one stone is patched.
 *
 * Every stone gets the grain; the ones standing indoors get the ambient
 * rotation and the ones standing outside get the sky. The three are composed
 * here rather than by patching twice, because `patchForSunlight` takes one
 * patch and three's program cache keys off the one string — two materials
 * whose patches differ but whose keys agree silently share a program, and
 * the second one gets the first one's shader.
 */
export function stonePatch(
  name: StoneName,
  grain: GrainUniforms,
  room: RoomUniforms,
  wash: WashUniforms,
  outdoor: OutdoorUniforms,
  shelter: ShelterUniforms,
): SurfacePatch {
  const indoors = INDOORS.includes(name)
  const fillScale = { uFillScale: { value: FILL_SCALE[name] ?? 1 } }
  return {
    uniforms: indoors
      ? { ...grain, ...room, ...wash, ...outdoor, ...shelter, ...fillScale }
      : { ...grain, ...outdoor, ...fillScale },
    pars: indoors
      ? `${GRAIN_PARS}\n${INDOOR_PARS}\n${WASH_PARS}\n${OUTDOOR_PARS}\n${SHELTER_PARS}`
      : `${GRAIN_PARS}\n${OUTDOOR_PARS}`,
    colour: GRAIN_COLOUR,
    indirect: indoors ? SHELTER : OUTDOOR_INDIRECT,
    light: indoors ? INDOOR_LIGHT : undefined,
    key: indoors ? 'stone-room-5' : 'stone-sky-2',
  }
}

/**
 * Stones that stand inside the building — or that have a face there. The
 * walls and the terraces face both ways, and SHELTER sorts that out per
 * fragment.
 */
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
    ceramic: stone('ceramic'),
    facade: stone('facade'),
    nativity: stone('nativity'),
    passion: stone('passion'),
    white: stone('white'),
    panel: stone('panel'),
    mosaic: stone('mosaic'),
    enamel: stone('enamel'),
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
