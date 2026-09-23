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
 * This was cream, on the reasoning that a saturated version would be a
 * fairground, and the photograph says otherwise. Sampling only the lit glaze
 * off `reference/ex-terraces-roofscape.jpg` — the top thirty per cent of
 * pixels by saturation in each basket, so shadow and background are out of
 * it — the four baskets in that frame run:
 *
 * | basket | sampled | hue | saturation |
 * | --- | --- | --- | --- |
 * | green-yellow | #7e6f3c | 47 | 0.52 |
 * | orange | #855327 | 28 | 0.70 |
 * | green | #836327 | 39 | 0.70 |
 * | red | #702924 | 4 | 0.67 |
 *
 * against 0.27 for the stone they stand on. The old cream sat at 0.19 — the
 * *same saturation as the stone* — which is why a roof full of baskets
 * rendered as white cauliflower. They are four hues and they are half again
 * as saturated as anything else on the building, which is the whole reason
 * people photograph them.
 *
 * The base colour is left near white because the fruit is painted per berry
 * — see `FRUIT_PALETTE` and `buildFruit` — and a tinted base would multiply
 * into every one of them.
 */
export const CERAMIC = 0xf2efe8

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
 * This was charcoal, and it was wrong, and it was wrong for a reason worth
 * writing down: the number under it was measured off the wrong photograph.
 * `ex-plaza-nativity.jpg` is not the arrival view its filename promises — it
 * is a long lens on two tower shafts in their own shade, backlit, against a
 * blown sky. The 77 66 64 quoted here as *the sunlit flank* is a reading of
 * shadow. An albedo set from it makes the oldest fabric on the building
 * darker than everything else by a factor of two and a half, and what that
 * produces is the one thing every photograph says this front is not: a black
 * cliff with four black towers on it.
 *
 * Taken instead off `ex-flank-elevation.jpg`, where low winter sun is
 * straight onto this front and three fabrics are in the same frame at the
 * same exposure:
 *
 *   Nativity shaft, sunlit     106    hue 23°   sat 0.18
 *   Nativity front body        105    hue 21°   sat 0.16
 *   central tower, panel       105    hue —     sat 0.06
 *   white terrace canopy       147    hue 17°   sat 0.06
 *
 * The old stone and the new panel are *the same luminance*. What separates
 * them is not value at all — it is that one is warm at a fifth saturated and
 * the other is neutral at a twentieth. Ninety years of Barcelona traffic did
 * not blacken these blocks; it browned them, and it blackened the places
 * rain never reaches, which is a different claim and one the weather term in
 * the masonry shader was already making. Carrying it in the albedo as well
 * was counting the soot twice — see MASONRY below, where the age of this
 * fabric now lives in full.
 *
 * Swept against the plaza frame afterwards, because a ratio in a photograph
 * is not an albedo: at 0xac9b88 the front rendered at 0.80 of the white
 * cloister beside it where the photograph has 0.72, and standing in the same
 * frame the two fabrics were hard to tell apart. Twelve per cent down puts
 * the ratio at 0.71, with the hue and saturation — 30° and a fifth, against
 * 23° and a fifth measured — left where they were.
 */
export const NATIVITY_STONE = 0x9a8b7a

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
export const NEW_WHITE = 0xaeaaa3

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
export const PANEL_STONE = 0xa39d93

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

/**
 * The lit alabaster of a lucernari.
 *
 * Warm and barely coloured: these are tungsten behind stone, so what a
 * photograph catches is a white oval with an amber edge where the alabaster
 * thickens. Sampled off `in-nave-passion-1330-dec2025`, where a dozen of
 * them stand along the aisle, the lit plate runs 244 232 206 — a twentieth
 * saturated at hue 40°, which is a white that has been through stone.
 */
export const LAMP = 0xf4e8ce

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
   * Builder's sheeting, wrapped round a tower under construction.
   *
   * Its own fabric and not the white stone beside it, which is what the
   * first attempt used. A wrap cut from the same stone as the shaft it is
   * wrapping is invisible: it read as a tower that had gone smooth. Sheet
   * is brighter than any stone on the building, almost perfectly matt, and
   * it carries no courses — the masonry table has no entry for it, which is
   * how a fabric says it is not laid.
   */
  | 'sheet'
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
   * The lit alabaster of a lucernari — see `KnotSite` in geometry/branch.ts.
   *
   * The one emissive surface in the building, and the only thing in it that
   * is a light rather than a thing lit. It stays out of `INDOORS` and out of
   * `MASONRY`: nothing about the room should reach it, because what it
   * looks like does not depend on what the room is doing.
   */
  | 'lamp'

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
  sheet: { color: 0xeeebe4, roughness: 0.97 },
  lamp: { color: LAMP, roughness: 0.42 },
}

/**
 * How much brighter than white a lucernari burns.
 *
 * It has to clear the bloom threshold, which is quoted in multiples of the
 * film's white point and divided by whatever the eye is open to — indoors
 * that is about two and a half in the buffer's own units. Under it, a lamp
 * is a pale oval with a hard edge, which is what a lamp looks like in a
 * rendering; over it, the spill happens, and the spill is the whole of why
 * these read as lights in a photograph.
 *
 * Not much over, and much less than the first attempt. At 4.2 a nave frame
 * came back as six hundred blazing rings hung in the canopy like fairy
 * lights, with a halo round each one the width of the column it stood on —
 * and their combined spill lifted the whole picture, which is measurable:
 * the share of the frame under eight per cent luminance stayed at zero with
 * the stop closed half a stop, and the saturation of every interior frame
 * fell by half, because a veil of white light is what desaturation is.
 *
 * A little over the threshold is all that is wanted. The halo is then a
 * few pixels wide, the alabaster keeps an edge, and six hundred of them
 * add up to something the room is lit by rather than something in front of
 * it.
 */
export const LAMP_RADIANCE = 2.0

/**
 * Stones whose colour is written on the geometry rather than on the material.
 *
 * One of them so far: the mosaic on a pinnacle, which is banded up its own
 * profile. Anything cut from one of these *must* carry a `color` attribute —
 * three multiplies by it, and geometry without one comes back black.
 */
/**
 * The glazes on the roof baskets, straight off the photograph above.
 *
 * Five rather than four: the sampled quartet plus a pale one, because a
 * basket that is all fruit and no highlight reads as a single lump at the
 * distance these are seen from and the real ones carry a few near-white
 * pieces that break the mass up.
 */
export const FRUIT_PALETTE = [0x8f7a33, 0x9c5d24, 0x8f6b22, 0x7e2a24, 0xd8cda6] as const

const PAINTED: readonly StoneName[] = ['mosaic', 'ceramic']

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
  const material = new THREE.MeshStandardMaterial({
    color: r.color,
    roughness: r.roughness,
    metalness: 0,
    vertexColors: PAINTED.includes(name),
    // Vault webbing is thin and seen from both sides.
    side: THREE.DoubleSide,
  })
  if (name === 'lamp') {
    // Emissive rather than bright albedo, because a lamp has to be bright
    // in a dark room and in a lit one alike — an albedo is a multiplier on
    // whatever is arriving, and what is arriving at the top of a column at
    // four in the afternoon is not much.
    material.emissive = new THREE.Color(LAMP)
    material.emissiveIntensity = LAMP_RADIANCE
  }
  return material
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
  float lateral = 1.0 - abs( roomNormal.y );

  // And *which* of them, which is not the cosine against straight up.
  //
  // A room is not two lamps at the poles. It is a lower half and an upper
  // half, and what a surface takes from a half-space is ( 1 -/+ n.y ) / 2:
  // all of the lower one for a soffit, all of the upper one for a face
  // turned at the vault, and exactly half of each for anything standing
  // upright. The cosine gives a standing face *zero of both* — which is the
  // same mistake this file's own note against sfLoft records, made in the
  // same line of code, found at the same time and then not fixed here. So
  // the term that stands for light that has bounced more than once, the one
  // thing in the model that is supposed to reach a corner no window and no
  // floor can see, was identically nothing on every vertical surface in the
  // building. Ablated on the landing frame: switching the whole flat term
  // off moved a column four bays deep by one part in a thousand.
  //
  // Written the way sfLoft writes it, for the same reason: the pole is what
  // this term was fitted at and is left exactly alone, and uRoomStand is how
  // much of the half-space a standing face is believed to get. Less than one,
  // because most of what a column flank faces across the equator is not the
  // vault or the floor but the next column.
  float standingShare = uRoomStand * lateral * 0.5;

  // The room's own colour, by which half of the glazing has the sun — see
  // ROOM_LIGHT_EAST. uWashTilt is −1 when the Passion wall is lit, which is
  // every frame this room was fitted against, so there it is uRoomBounce
  // exactly.
  vec3 bounce = mix( uRoomBounce, uRoomBounceEast, clamp( 0.5 + 0.5 * uWashTilt, 0.0, 1.0 ) );
  float fromFloor = max( 0.0, -roomNormal.y );
  float fromAbove = max( 0.0, roomNormal.y );

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

  // And a face turned across the church is not looking at *a* window: it is
  // looking at the near wall or at the far one. A column standing in the
  // Passion aisle has the Passion glazing four metres off one flank and the
  // Nativity glazing forty metres off the other, and its two flanks are lit
  // in that proportion. Held equal, every shaft in the building was lit the
  // same from both sides and had no lit side and no shaded side — which is
  // the one thing that says a column is round. This is the gradient; the
  // flutes are a ripple riding on it, not a substitute for it.
  float standing = clamp( vSunWorld.x / uNaveHalf, -1.0, 1.0 );
  float nearWall = 0.5 + 0.5 * compass.x * standing;
  float sideGain = mix( uRoomFar, 1.0, nearWall );
  float fromGlass = lateral * mix( uRoomAlong, uRoomSide * sideGain, abs( compass.x ) ) * uRoomGlass;

  // What the windows actually put on this surface, shadowed and patterned —
  // see render/washrig.ts. Where the rig has an answer it is a much better
  // one than the fill above, so the fill is faded out in proportion: the two
  // are the same light, and the fill is only standing in where the rig
  // cannot see (outside its fit, behind a wall, facing along the nave).
  //
  // And the clerestory with it — the same rig tilted up, which is the only
  // window in the model whose light reaches the canopy. See sfThrow. The two
  // are added before anything else touches them because they are the same
  // claim: this is what a window put here, shadowed and coloured, and it is
  // better than the fill wherever it has an answer at all.
  vec3 washed = sfWash( roomNormal, vSunWorld ) + sfThrow( roomNormal, vSunWorld );

  // And the wash is not the pure colour of the pane it came through.
  //
  // The map is the glass, so what the rig returns is the transmittance of
  // one window at full saturation — and a surface lit by a window is not
  // lit only by that window. It is lit by the window and by every square
  // metre of pale stone the window has already landed on, which is most of
  // what arrives and is nearly neutral. Added raw at the gain the room now
  // needs, the shaded flank of every column on the Nativity side came back
  // a saturated bottle green: the colour of the glass rather than the
  // colour of light that has been in the room.
  //
  // The clerestory goes through this too, and the first build of it did not.
  // The argument for exempting it looked sound — a soffit forty metres up
  // has no pale neighbour to mix its window with, so it should take that
  // window's colour whole — and the pictures said otherwise at once. The
  // canopy's neighbour is the floor, which is most of what lights it and is
  // not blue; so a vault facet turned toward the Nativity clerestory at half
  // past one in December came back teal, on a frame whose photograph is gold
  // from one end to the other.
  //
  // Held at its own luminance, so desaturating cannot darken it.
  washed = mix( vec3( dot( washed, vec3( 0.2126, 0.7152, 0.0722 ) ) ), washed, uWashPurity );

  // How much of the floor this face can see — see sfLoft in washrig.ts. Read
  // here rather than where it is used, because it is wanted twice.
  float floorSeen = sfLoft( roomNormal, vSunWorld );

  // The fill fades where the *rig* has an answer, and only there. Not where
  // the floor does: the floor and the window are two different lights that
  // add, where the fill and the rig are two accounts of the same one. Told
  // otherwise — measured — the fill went to nothing on every surface in the
  // building, and with it the near-wall-to-far-wall gradient that is the one
  // thing saying a column is round.
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
  //
  // And *when*, which is the third of the three and was the last to arrive.
  // Which way a face points and where it stands are both fixed; which half
  // of the glazing has the sun standing outside it is not, and at half past
  // one in December the Nativity side is in its own shadow while the Passion
  // wall opposite is a hundred metres of lit glass. A room told only the
  // first two lights a column flank turned east with east's green at that
  // hour — and the photograph of that flank at that hour is gold, 80 55 35,
  // thirty-nine per cent warm. It is not lit by the window it faces. It is
  // lit by a room that is full of the other window.
  //
  // See uWashTilt: −1 all Passion, +1 all Nativity, and zero at the hour
  // this room was fitted at, so the fitting still stands.
  float toward = clamp(
    compass.x * 0.72 + standing * 0.58 + uWashTilt * uRoomHour, -1.0, 1.0
  );
  vec3 glassRaw = mix( uGlassPassion, uGlassNativity, smoothstep( -0.45, 0.45, toward ) );
  vec3 glass = glassRaw;

  // A sideways face is not looking only at a window. It is looking at a
  // window and at ninety metres of stone, and what a hundred square metres
  // of sky through leaded glass throws onto a shaft is mostly *grey*: in
  // every photograph the columns are the most neutral thing in the room —
  // the granite shaft in in-column-shaft-twist reads 90 87 83, eight per
  // cent saturated — and the colour lands on the walls beside the windows
  // and on the canopy overhead. This used to mix the glass with the room's
  // gold instead, so a sideways face had no neutral in it at all and every
  // column in the building came out chocolate at seventy per cent while the
  // vault over it stayed white: the photograph, with the two swapped.
  glass = mix( vec3( 1.0 ), glass, uGlassShare );

  // The two are not mixed toward the room's average, because they are not
  // the same kind of claim. The room bounce is a guess at what colour a room
  // full of sandstone returns, and a guess gets blended with the probe it is
  // correcting. The glazing is not a guess: it is the light itself, arriving
  // through a known colour, and diluting it with Barcelona sky is how the
  // Passion side ends up the same temperature as the Nativity side.
  // What the floor is the colour of, and therefore what it throws back up.
  //
  // Pale polished stone under a room lit through Vila-Grau's glazing, so
  // it is the room's own gold carrying a share of whichever half of the
  // church is overhead — the nave floor under the Passion side is orange
  // at four in the afternoon and green at ten in the morning, and the
  // canopy above it takes that colour on. A share rather than the whole,
  // because the floor is stone before it is a mirror.
  vec3 hearth = mix( ambient, luminance * bounce, uRoomWarmth )
    * mix( vec3( 1.0 ), glassRaw, uLoftTint );

  // And how much of the floor a face sees decides how coloured that light
  // is, not only how much of it there is.
  //
  // A soffit hangs over one bay. Most of what it sees is the pavement
  // directly beneath it, lit through the window of that bay, and it takes
  // that bay's colour — which is why the canopy in every photograph of this
  // building is gold under the Passion side and green under the Nativity.
  // A shaft does not: it stands in the floor's plane, so what it sees is a
  // hundred metres of pavement at a grazing angle, both halves of
  // Vila-Grau's scheme at once and the far end of the nave as well, and the
  // average of all of it is very nearly grey. The photographs are emphatic
  // about this — the columns are the most neutral thing in the room, eight
  // per cent saturated in in-column-shaft-twist, standing under a canopy at
  // fifty. Given the soffit's colour, a shaft came out the colour of a
  // terracotta pot.
  //
  // But *which* average, and the answer had been a constant.
  //
  // What the argument above actually says is that a shaft sees both halves
  // of the scheme at once — and that holds while both of them are lit. At
  // half past one in December one is in its own shadow, the hundred metres
  // of pavement is gold from end to end, and averaging it is averaging gold
  // with gold. So the target is the two window colours mixed in the
  // proportion the hour gives them — see uWashSide.
  //
  // As a *departure* from the even hour's proportion, not as the colour
  // itself. The two glazings are (3.04, 0.49, 0.02) and (0.41, 1.20, 0.72)
  // at unit luminance and their plain mean is two thirds warm, so the grey
  // this pools to today is not what they average to in absolute terms — it
  // is a fitted constant that a great deal downstream was fitted against.
  // Dividing through by the even mix keeps that constant exactly where it
  // is and leaves only what the clock did, which is the whole change.
  //
  // First try, and it was wrong: relax the *pooling* when the hour is
  // one-sided, on the argument that there is then only one half to average.
  // The argument is sound and the mechanism is not, because the pooling is
  // holding back two different things at once — the far half's window colour
  // and the pavement's own sandstone. Let it go and a June morning under the
  // green glazing came back at two thirds saturated and hotter than the
  // December frame it was supposed to be the opposite of: not the hour's
  // light at all, just uRoomBounce with the lid off.
  vec3 hourly = mix( uGlassPassion, uGlassNativity,
    uWashSide.y / ( uWashSide.x + uWashSide.y ) );
  // The max is for a glazing recoloured to nothing in some channel: both of
  // these are normalised to unit *luminance*, which says nothing about any
  // one of the three, and a zero here would put a NaN on every indoor stone.
  vec3 tide = 2.0 * hourly / max( uGlassPassion + uGlassNativity, vec3( 1e-4 ) );
  // Both mixes are of unit-luminance colours, but their ratio is not one, so
  // it is put back — or pooling would darken the thing it recolours.
  tide /= dot( tide, vec3( 0.2126, 0.7152, 0.0722 ) );

  // Held at its own luminance, so pooling cannot darken it.
  float pooled = ( 1.0 + roomNormal.y ) * uLoftPool;
  vec3 average = dot( hearth, vec3( 0.2126, 0.7152, 0.0722 ) )
    * mix( vec3( 1.0 ), tide, uRoomTilt );
  vec3 hearthHere = mix( hearth, average, clamp( pooled, 0.0, 1.0 ) );

  // The light from below, with its shadows. This is what lights the canopy,
  // and until it existed the canopy was lit by a constant: a soffit faces
  // the two horizontal wash directions edge-on and took nothing from them.
  vec3 lofted = hearthHere * floorSeen;

  // What is left of the flat term. Small, and for the light that has
  // bounced more than once — the fill in a corner the floor cannot see.
  //
  // The standing share takes the same colour as the two poles, and that was
  // not obvious. The floor's standing share is pooled hard toward neutral —
  // see uLoftPool — on the argument that a shaft stands *in* the floor's
  // plane and sees a hundred metres of it at a grazing angle, both halves of
  // Vila-Grau's scheme at once, where a soffit hangs over one bay and takes
  // that bay's colour. The same words fit this term and the argument does
  // not, because what they are about is the glazing: hearth carries the
  // window overhead through uLoftTint and the hour through uWashSide, and
  // there is a direction in it to pool away. uRoomBounce is the colour a
  // room full of sandstone returns after two bounces and three. It has no
  // window in it and no hour in it, so pooling it removes the stone's own
  // gold and nothing else.
  //
  // Measured at viewpoint w, against the photograph it is built to match,
  // on the granite the interior README has been recording as too cold for
  // two passes — pooled at the floor's own 0.85, half of it, and none:
  //
  //   | pooled | shaft sat | shaft warm | wall sat | photograph  |
  //   | 0.85   | 0.41      | 0.26       | 0.29     | 0.50 - 0.60 |
  //   | 0.5    | 0.48      | 0.32       | 0.34     |  / 0.33 - 0.43 |
  //   | 0      | 0.56      | 0.39       | 0.40     |  wall 0.62 / 0.44 |
  //
  // Every surface moves toward the photograph as the pooling comes off.
  vec3 roomTone = mix( ambient, luminance * bounce, uRoomWarmth );
  vec3 room = roomTone * ( uRoomFloor * fromFloor + uRoomSky * fromAbove
    + ( uRoomFloor + uRoomSky ) * standingShare );
  vec3 window = luminance * glass * fromGlass;

  // And only where the surface actually stands in the room — see SHELTER.
  // The face of a wall that looks out over the plaza, or the top of a
  // terrace, takes the sky like everything else outside.
  vec3 fill = ( room + window + washed * luminance + lofted ) * uRoomGain;
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
float sfSheltered = smoothstep(
  0.34,
  0.86,
  sfRoofed( vSunWorld, inverseTransformDirection( geometryNormal, viewMatrix ) )
);

// Outdoors the skyline shades this the same as anything else; indoors the
// room's own fill takes over and the towers are irrelevant. See
// OUTDOOR_INDIRECT for what the term is.
{
  vec3 sfSkyN = inverseTransformDirection( normal, viewMatrix );
  float sfHidden = 0.0;
  for ( int i = 0; i < 18; i ++ ) {
    if ( i >= uSkylineCount ) break;
    vec4 sfTower = uSkyline[ i ];
    vec2 sfTo = sfTower.xy - vSunWorld.xz;
    float sfDist = length( sfTo );
    if ( sfDist < sfTower.z * 1.25 ) continue;
    float sfRise = sfTower.w - vSunWorld.y;
    if ( sfRise <= 0.0 ) continue;
    float sfPatch =
      ( asin( clamp( sfTower.z / sfDist, 0.0, 1.0 ) ) / 3.14159265 ) *
      ( atan( sfRise / sfDist ) / 1.5707963 );
    vec3 sfDir = normalize( vec3( sfTo.x, sfRise * 0.5, sfTo.y ) );
    sfHidden += sfPatch * max( 0.0, dot( sfSkyN, sfDir ) ) * 2.0;
  }
  float sfOpen = uSkyFill * ( 1.0 - clamp( sfHidden, 0.0, 0.88 ) );
  iblIrradiance *= mix( sfOpen, 1.0, sfSheltered ) * uFillScale;
}
`

// `uFillScale` is declared by OUTDOOR_PARS, which every indoor stone also
// gets — GLSL calls a second declaration a redefinition and refuses to
// compile the shader, and three's fallback for that is a material that
// silently draws with somebody else's program.
const SHELTER_PARS = /* glsl */ `
uniform mat4 uRoofMatrix;
uniform sampler2D uRoofHeight;

/**
 * How much of the sky has been taken away from a point by something standing
 * over it. 0 is open, 1 is roofed.
 *
 * A step and a half out along the surface's own normal, and then a look
 * around. The step has to clear the wall the fragment is standing in: the
 * reveals of a window are splayed, so their normals lean half sideways, and
 * a short step from one stayed inside the metre of masonry and found the
 * terrace overhead. The look around is for the same faces — a reveal is lit
 * from both sides of the wall and the honest answer is a share of each.
 *
 * The centre tap decides and the ring only leans. Averaged equally, the five
 * taps gave the *outer* face of every enclosing wall in the building a fifth
 * of a vote for being roofed, because one tap of the ring always steps back
 * across the wall it stands on and finds the terrace over it.
 */
float sfRoofed( vec3 world, vec3 outward ) {
  vec3 probe = world + outward * 1.5;
  vec2 taps[5];
  taps[0] = vec2( 0.0, 0.0 );
  taps[1] = vec2( 1.5, 0.0 );
  taps[2] = vec2( - 1.5, 0.0 );
  taps[3] = vec2( 0.0, 1.5 );
  taps[4] = vec2( 0.0, - 1.5 );
  float centre = 0.0;
  float ring = 0.0;
  for ( int i = 0; i < 5; i ++ ) {
    vec3 at = probe + vec3( taps[ i ].x, 0.0, taps[ i ].y );
    vec4 clip = uRoofMatrix * vec4( at, 1.0 );
    vec2 uv = clip.xy * 0.5 + 0.5;
    float under = 0.0;
    if ( uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0 ) {
      under = smoothstep( 0.0, 2.0, texture2D( uRoofHeight, uv ).r - at.y );
    }
    if ( i == 0 ) centre = under;
    else ring += under * 0.25;
  }
  return centre * 0.68 + ring * 0.32;
}
`

export interface ShelterUniforms extends Record<string, THREE.IUniform> {
  uRoofMatrix: { value: THREE.Matrix4 }
  uRoofHeight: { value: THREE.Texture }
}

const INDOOR_PARS = /* glsl */ `
uniform vec3 uRoomBounce;
uniform vec3 uRoomBounceEast;
uniform float uRoomWarmth;
uniform float uRoomGain;
uniform float uRoomFloor;
uniform float uRoomSky;
uniform float uRoomStand;
uniform float uRoomSide;
uniform float uRoomAlong;
uniform float uRoomFar;
uniform float uRoomGlass;
uniform float uGlassShare;
uniform float uNaveHalf;
uniform float uWashCover;
uniform float uWashPurity;
uniform float uLoftTint;
uniform float uLoftPool;
uniform float uRoomHour;
uniform float uRoomTilt;
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
  uRoomBounceEast: { value: THREE.Color }
  uRoomWarmth: { value: number }
  uRoomGain: { value: number }
  uRoomFloor: { value: number }
  uRoomSky: { value: number }
  /** How much of the room's two halves a face standing upright is given. */
  uRoomStand: { value: number }
  uRoomSide: { value: number }
  uRoomAlong: { value: number }
  /** What the far wall's glazing is worth against the near wall's. */
  uRoomFar: { value: number }
  uRoomGlass: { value: number }
  uGlassShare: { value: number }
  uNaveHalf: { value: number }
  uWashCover: { value: number }
  /** How much of the glass's own saturation survives the room it crosses. */
  uWashPurity: { value: number }
  /** How far the floor's bounce is tinted by the glazing above it. */
  uLoftTint: { value: number }
  uLoftPool: { value: number }
  uRoomHour: { value: number }
  uRoomTilt: { value: number }
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
/**
 * Deeper and more saturated than it was, and now it can afford to be.
 *
 * This colour used to reach every surface in the building — it was what a
 * sideways face's window light was mixed toward — so it had to be mild or
 * the whole room went one shade of amber. It now reaches only the faces
 * that look at the floor and the canopy, which is exactly where the
 * photographs put the gold, and there it was measurably too weak: the vault
 * in `in-nave-axial-canopy` runs from 142 112 70 at half a stop over to
 * 74 46 9 in its depths — a fifth to seven eighths saturated — against a
 * render that could not get past a quarter.
 *
 * Swept against that frame: at 0xffd8a8 the canopy came out 0.24 saturated
 * and at this value 0.41, with the columns under it moving only from 0.196
 * to 0.205, which is the whole point. The two are no longer one number.
 *
 * Not further, even though the photograph's deepest patch is 0.87. The
 * canopy here is lit by a *constant* — see `uRoomFloor` — so every extra
 * point of saturation is spread flat across the whole of it, and past
 * about four tenths the vault stops reading as pale stone under gold light
 * and starts reading as a terracotta ceiling. What the photograph has that
 * this cannot yet have is variation, and that is a missing source rather
 * than a missing colour.
 */
/**
 * And yellower going in than it looks coming out.
 *
 * The frames this was fitted on held their luminance and missed their hue:
 * measured frame-wide on the stone, `w` and `v` came out at 16 and 17
 * degrees against 26 in both photographs, and `1` at 17 against 37 — salmon
 * and terracotta where the photographs are amber. Not the grade: with the
 * film at identity the hue is 18. Not the glass or the stone: a yellower
 * Passion glazing moves it two degrees and grey stone one. It is the light
 * itself, multiplied in linear light by a warm vault and a warm floor on
 * its way to the eye, and every multiply by a warm colour takes green out
 * faster than red. So the constant is set where it has to be for what
 * arrives to be amber: at this value the three frames read 24, 25 and 26,
 * with every luminance unchanged to two decimals, since the colour is held
 * at unit luminance either way.
 */
export const ROOM_LIGHT = 0xffe244

/**
 * The colour of the light inside when the gold is not in it — the Nativity
 * half lit, the Passion half in its own shadow.
 *
 * ROOM_LIGHT is the room with the Passion glazing lit — and every photograph
 * that colour was fitted against was taken with it lit: the December
 * afternoons, the nave at four o'clock. It was then the room's colour at
 * every hour of the day, so a June morning with the sun on the green and
 * blue Nativity side came out the same terracotta as a December afternoon,
 * and measured across five hours in two seasons the nave never left 0.34 to
 * 0.57 saturated at 18 to 23 degrees of hue. The photographs of this nave
 * that are not December afternoons run 0.17 to 0.20 saturated, and one of
 * them is on the cool side of grey.
 *
 * So the room has a second colour, and the hour chooses between them by
 * the same signed number the rest of the room reads: which half of the
 * glazing has the sun standing outside it. With the Nativity side lit the
 * light that fills the room has come through green and blue glass and off
 * pale stone, and what the photographs show it arriving as is pale warm
 * grey. Past noon the gold comes back, and at every hour a frame in this
 * model was ever fitted at — all of them with the Passion side lit — it is
 * exactly what it was.
 *
 * A cream and not a grey, which is not what the argument says and is what
 * the screen needs. Swept on the June landing and on the nave at nine, a
 * neutral here came back slate-teal: a fifth of the sky probe is still in
 * the mix, the floor carries a share of the green glass above it, and the
 * grade cools the shadows. Pale grey on the stone takes a warm cream going
 * in. At this value both frames land at 0.15 and 0.17 saturated and 30 and
 * 34 degrees, against 0.17 to 0.20 and 25 to 34 in the photographs of the
 * nave that are not December afternoons — and 0.34 to 0.39, at 18 to 21,
 * before.
 */
export const ROOM_LIGHT_EAST = 0xf8dcb4

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
    uRoomBounceEast: { value: unitLuminance(new THREE.Color(ROOM_LIGHT_EAST).convertSRGBToLinear()) },
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
     *
     * Back up, now that this term no longer reaches the columns. It only
     * ever applied to the faces that look at the floor and the sky — the
     * vault — and the vault is exactly where the photographs *do* have the
     * gold: the canopy in every frame of the nave is a warm field over
     * neutral shafts. At 0.45 it came out white, because the fill under it
     * was eight times the ambient and the film took anything that bright
     * to white regardless of hue. The stop is closed now and the colour
     * survives, so it can be the colour the photographs show.
     *
     * And nearly all the way, now that it reaches only the canopy and the
     * soffits. What it is displacing there is the sky probe, and the sky is
     * the one thing a vault soffit forty-five metres inside a building
     * cannot see; leaving a third of it in was leaving a third of the
     * canopy the colour of Barcelona daylight.
     *
     * Four fifths rather than the whole way: the last fifth is what keeps
     * the canopy from being one flat hue, and a flat saturated ceiling is
     * a worse picture than a flat pale one.
     */
    uRoomWarmth: { value: 0.8 },
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
    /**
     * Four, not eight.
     *
     * Eight was set against a column flank getting a sixth of what it gets
     * now, and it is the term that has no structure in it at all: the wash
     * rig runs along the two horizontal axes, so a soffit facing straight
     * down takes nothing from it and is lit by this constant alone. At
     * eight the canopy was a flat slab of tone seven to eleven times
     * anything under it, against the two and a half the photographs
     * measure between vault and column — and flat is exactly what a frame
     * looking up the nave came back as.
     *
     * And now it is nearly nothing, because the thing it was standing in
     * for has been built. This was a constant pretending to be the floor:
     * it gave every soffit the same light whether it stood over open
     * pavement or behind a branch, which is why the canopy had exactly one
     * tone and no amount of colour would model it. `sfLoft` in
     * washrig.ts is that light with its shadows in it. What is left here is
     * what a constant is honestly for — the second and third bounce, the
     * fill in a corner the floor cannot see at all.
     */
    uRoomFloor: { value: 0.7 },
    /**
     * And up at the canopy, which is not a small source at all.
     *
     * 1.2 was set when overhead meant the lucernaris and the clerestory,
     * both of them small. What an upward-facing surface in this building is
     * actually looking at is forty-five metres of lit vault covering the
     * whole plan — the brightest large surface in the room, and the reason
     * the pavement in every photograph of the nave throws a sheen back up
     * the aisle. Given a fifth of what the vault gets from the floor, the
     * floor came back near black under a luminous canopy, which is the
     * exchange running one way only.
     */
    uRoomSky: { value: 2.6 },
    /**
     * And how much of either half a surface standing upright is given.
     *
     * Not one, which is what the geometry alone would say. Most of what a
     * column flank faces across the equator is not the floor and not the
     * vault: it is the next column, four metres away, and the one behind
     * that. The same discount uLoftStand applies to the floor's horizon, for
     * the same reason, and it lands in the same place.
     *
     * Fitted on the granite, at viewpoint w, against the photograph that
     * viewpoint is built to match — the surface the interior README has
     * carried as too cold through two passes, where it is quoted at 0.29
     * saturated against a photographed 0.50 to 0.60, and 0.18 warm against
     * 0.33 to 0.43. Two shafts, at the exposure that holds the vault-wash
     * canopy on its own photograph:
     *
     *   | stand | near shaft   | far shaft    | frame contrast |
     *   | 0     | 0.45 / 0.29  | 0.38 / 0.23  | 4.08           |
     *   | 0.15  | 0.51 / 0.35  | 0.42 / 0.27  | 3.50           |
     *   | 0.25  | 0.55 / 0.38  | 0.46 / 0.29  | 3.26           |
     *   | 0.50  | 0.60 / 0.43  | 0.51 / 0.34  | 2.85           |
     *
     * 0.5 puts both shafts inside the band and is too far. This term has no
     * shadow in it — it is the light that has stopped having a direction —
     * and a room lit by a constant has no shape in it, which is the failure
     * this README records under three different names. Priced: every extra
     * tenth past a quarter costs about three per cent of the frame's
     * contrast, on frames that already run below the photographs' own. A
     * quarter is where the granite arrives and the shadows are still there:
     * across the crossing it holds 4.9 per cent of its frame under eight per
     * cent luminance, against 6.7 to 12.1 in the two photographs of that
     * room, where half a unit leaves 0.4.
     */
    uRoomStand: { value: 0.25 },
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
     *
     * And not a seventh of the across figure either, which is what 0.16
     * was. The flutes of a shaft alternate between these two answers face
     * by face, so the ratio between them is the depth of the corrugation
     * the eye sees: at seven to one a twenty-four-sided shaft came back as
     * bark. In the photographs the flutes are a ripple of ten or fifteen
     * per cent on a broad gradient from the lit flank to the shaded one —
     * see `uRoomFar`, which is where that gradient now comes from — and
     * under three to one is where a shaft with creases in it reads as a
     * round thing with creases in it.
     *
     * And higher again, because the ninety-metres-of-colonnade argument is
     * wrong about what is at the end of the ninety metres. A column face
     * turned along the nave is looking at the next column, which is lit, at
     * the pavement, which is lit, and at the vault, which is the brightest
     * surface in the building. It is not looking into a tunnel. Held at a
     * sixth of the across figure, the faces a walker actually sees — the
     * ones turned up and down the nave, in every frame taken along it —
     * were seven times darker than the canopy over them, against the two
     * and a half the photographs measure.
     */
    uRoomAlong: { value: 0.7 },
    /**
     * The far wall's glazing, as a share of the near wall's.
     *
     * A column in an aisle stands four metres from one wall of glass and
     * forty from the other, and the flank turned to the far one is lit by
     * a source a tenth the angle. Not a tenth here, because the room's
     * bounce fills it from everywhere.
     *
     * A half rather than the third the December columns measure, because
     * this factor is applied to walls as well as to shafts and a wall is
     * not a shaft. The inner face of the Nativity front faces the whole
     * length of the church, so it takes the far figure everywhere at once
     * — at a third, the frame looking out through that doorway came back
     * with fifty-five per cent of its pixels under eight per cent
     * luminance. At a half it is twenty-seven, and the two axial frames
     * down the nave land at 2.1 and 1.5 per cent against the 1.4 and 2.0
     * their photographs measure, with the contrast ratio at 4.8 against
     * the photograph's 4.7.
     */
    uRoomFar: { value: 0.5 },
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
    /**
     * And then down again by a factor of three, because it had become the
     * mistake it was written to fix.
     *
     * Measured by switching each term off in turn on a frame down the
     * nave. With this at 2.8, the rest of the lighting model was
     * decoration: turning the glazing's own shadowed rig off moved the
     * frame's saturation by two thousandths, taking ambient occlusion from
     * 0.55 to 0.9 moved the median by one thousandth, and turning the
     * hemisphere off moved nothing at all. Turning *this* off took the
     * share of the frame below eight per cent luminance from zero to
     * twenty-eight, and the contrast ratio from 2.3 to 107.
     *
     * One flat, unshadowed, distance-invariant number was the whole of the
     * light in the building. A room lit by a constant has no shape in it,
     * and that is the plainest statement of what was wrong with the
     * interior. The rig that knows where the windows are carries the room
     * now and this fills in behind it: on the same frame, contrast goes
     * from 2.3 to 5.8 and saturation from 0.30 to 0.38, with two and a
     * half per cent of the picture finally dark.
     *
     * And down again, hard, from eight tenths to three, now that the floor
     * reaches a standing surface as well as a soffit — see sfLoft. Most of
     * what this number was worth on a column was never the window at all:
     * it was the pavement, arriving with no direction, no shadow and no
     * falloff because there was nothing else for it to arrive as. Given a
     * term of its own the constant has to give the same light back, or the
     * room is lit twice and the picture goes flat. What is left is the
     * near-wall-to-far-wall gradient, which is this term's own and nothing
     * else's.
     */
    uRoomGlass: { value: 0.3 },
    /**
     * How far a sideways face's light is tinted by the window it faces.
     *
     * The rest is neutral. A quarter to a third puts a column in the
     * Passion aisle at fifteen to twenty per cent saturated, which is the
     * top of the range the photographed shafts occupy, and a column in the
     * nave centre — lit by both walls — nearer to eight.
     *
     * A fifth rather than a third: at a third the two flanks of a shaft
     * came back one green and one pink, and a two-tone column is as wrong
     * as a brown one. The tint has to be something you notice about the
     * light rather than something you notice about the stone.
     *
     * And a seventh rather than a fifth, because the two halves of the
     * building are not equally saturated and this number is shared. The
     * colours are normalised to unit luminance before they get here, which
     * amplifies whatever is dark in them: the Passion amber comes out as
     * (1.92, 0.81, 0.14), so even a fifth of it puts a shaft at a third
     * saturated while the same fifth of the Nativity mint puts one at a
     * twelfth. Measured by blacking out every albedo but the two column
     * stones, this term alone was worth 0.15 of saturation on the shafts.
     */
    uGlassShare: { value: 0.15 },
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
    uWashCover: { value: 0.9 },
    // Three fifths. Enough that a wall beside a window is plainly the
    // colour of that window and a column ten metres off is plainly not.
    uWashPurity: { value: 0.6 },
    // A quarter. The pavement is warm stone first, and what it returns is
    // its own colour bent toward the light landing on it rather than
    // replaced by it — at a half the branch undersides came back a
    // saturated terracotta, which is the glazing's colour and not the
    // floor's.
    uLoftTint: { value: 0.25 },
    /**
     * How completely a standing face averages the room's floor to grey.
     *
     * Nearly completely. A shaft is in the floor's own plane, so the nearest
     * pavement it sees is edge-on and worth almost nothing, and what it is
     * actually lit by is the far half of the building — both sides of the
     * glazing at once, which is what Vila-Grau's scheme averages to, which
     * is grey. A soffit is at the other end of the same argument and keeps
     * all of its bay's colour.
     */
    uLoftPool: { value: 0.85 },
    /**
     * How much the hour is worth in deciding which window a face is lit by.
     *
     * The crossfade beside it runs on a smoothstep whose edges are at plus
     * and minus 0.45, so this is exactly the width of the crossfade itself:
     * the hour alone can carry a face that has no strong opinion all the way
     * to one window, and cannot move one that is pressed against the other.
     * A column standing four metres off the Nativity glass is the one thing
     * in the building that stays green at a Passion hour, and it should be.
     *
     * Worth about a hundredth of warmth on a shaft and two on a vault
     * facet — small, because the flat fill it steers is a fifth of what
     * lights a column and uGlassShare dilutes its colour to a seventh of
     * that. It is here because it is the true statement and it is free, not
     * because it carries the pass. What carries the pass is uRoomTilt.
     */
    uRoomHour: { value: 0.45 },
    /**
     * How far the floor's pooled colour follows the hour.
     *
     * Four fifths rather than all of it, and the fifth that is missing is
     * the honest part. The departure is symmetric by construction — it is
     * the hour's mix of the two glazings *divided by* the even hour's mix —
     * while the building is not: the Passion amber is (3.04, 0.49, 0.02) at
     * unit luminance and the Nativity mint is (0.41, 1.20, 0.72), so the one
     * is nearly monochromatic and the other is barely tinted. Dividing
     * through by their mean is what keeps the even hour exactly where it was
     * fitted, and it is also what flattens that asymmetry out.
     *
     * So the weight that takes the departure whole overshoots the cool side
     * before it arrives at the warm one. Measured on the granite shafts,
     * against photographs of both hours:
     *
     * | uRoomTilt | Dec 13:30 | photo | Jun 09:00 | photo |
     * | --- | --- | --- | --- | --- |
     * | 0 | 0.11 | | 0.09 | |
     * | 0.6 | 0.16 | | −0.02 | |
     * | **0.8** | **0.18** | 0.33–0.43 | **−0.06** | −0.04–0.11 |
     * | 1.0 | 0.20 | | −0.09 | |
     *
     * — warmth as (R−B)/(R+B) on the screen, which is where the JPEG lives
     * too. Four fifths is where the cool side stops overshooting. The warm
     * side is left short by something no weight here can reach: this pools
     * to a *departure from grey*, and the grey it departs from is itself
     * wrong — the two glazings average to two thirds warm, not to grey. That
     * is a recalibration of the room's whole colour and not of its hour.
     */
    uRoomTilt: { value: 0.8 },
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
/**
 * How much sky the eighteen leave each other.
 *
 * The one thing missing from the exterior's light was the scale in the
 * middle. Cast shadows are there, and ambient occlusion runs at three metres
 * — but between three metres and a hundred there was nothing at all, and
 * that band is where this building's exterior lives. In every photograph of
 * a group of four bell towers the *inner* flanks are markedly darker than
 * the outer ones, and it is not shadow: it is that a tower standing seven
 * and a half metres from three others can only see a third of the sky, and
 * the sky is what lights everything the sun has missed. Given the open
 * hemisphere for all of them, the four came back as four identical objects
 * that happen to be near each other, which is the reading that makes a
 * model of a group rather than a group.
 *
 * Analytic, off the towers themselves, because they are the only occluders
 * at this scale and there are eighteen of them. Each is a vertical shaft at
 * an (x, z) with a radius and a top; the half-angle it subtends horizontally
 * and the elevation it reaches together give the patch of sky it hides, and
 * a surface loses it in proportion to how squarely it faces it. A fragment
 * standing on a tower skips that tower, which is what the radius test is
 * for — otherwise every shaft occludes itself completely and the whole
 * skyline goes out.
 *
 * It costs eighteen iterations of about fifteen operations on outdoor stone
 * only. The alternative — baking a sky-visibility term into the geometry —
 * would have to be redone on every rebuild, and the geometry here is rebuilt
 * whenever a slider moves.
 */
const SKYLINE_MAX = 18

const OUTDOOR_INDIRECT = /* glsl */ `
{
  vec3 sfSkyN = inverseTransformDirection( normal, viewMatrix );
  float sfHidden = 0.0;
  for ( int i = 0; i < ${SKYLINE_MAX}; i ++ ) {
    if ( i >= uSkylineCount ) break;
    vec4 sfTower = uSkyline[ i ];
    vec2 sfTo = sfTower.xy - vSunWorld.xz;
    float sfDist = length( sfTo );
    // Standing on it. A shaft cannot shade itself with itself, and asking it
    // to puts every tower in the building into its own shadow.
    if ( sfDist < sfTower.z * 1.25 ) continue;
    float sfRise = sfTower.w - vSunWorld.y;
    if ( sfRise <= 0.0 ) continue;

    // The wedge of sky it stands in front of: how wide it is from here, and
    // how high it reaches.
    float sfHalf = asin( clamp( sfTower.z / sfDist, 0.0, 1.0 ) );
    float sfElev = atan( sfRise / sfDist );
    float sfPatch = ( sfHalf / 3.14159265 ) * ( sfElev / 1.5707963 );

    // And only for a face that is looking at it.
    vec3 sfDir = normalize( vec3( sfTo.x, sfRise * 0.5, sfTo.y ) );
    sfHidden += sfPatch * max( 0.0, dot( sfSkyN, sfDir ) ) * 2.0;
  }
  // And anything standing directly over this point has taken the sky away
  // from it, which the envelope had no way of knowing.
  //
  // The skyline term above handles a tower shading its neighbours, which is
  // the twenty-to-a-hundred-metre scale. It cannot see a roof: the soffit of
  // a porch twelve metres under its own canopy was being handed the whole
  // hemisphere at the open-sky gain, and no amount of turning that gain down
  // reaches it, because the gain is the same number for the open wall beside
  // it. Ambient occlusion cannot reach it either — three metres of radius
  // against twelve metres of overhang.
  //
  // What can see it is the roof-height map the interior has used since phase
  // five to decide what is a room. Thresholded the same way, so a face that
  // is merely near a roof stays outdoors, and left with seven per cent,
  // because a soffit over a sunlit pavement is not black.
  float sfUnderRoof = smoothstep(
    0.18,
    0.92,
    sfRoofed( vSunWorld, inverseTransformDirection( geometryNormal, viewMatrix ) )
  );
  float sfOpenSky = ( 1.0 - clamp( sfHidden, 0.0, 0.88 ) ) * ( 1.0 - sfUnderRoof * 0.88 );
  iblIrradiance *= uSkyFill * uFillScale * sfOpenSky;
  // And the same to the *reflection* of the sky, which is the half of this
  // that was missing and the reason the outside had no blacks in it.
  //
  // Three splits the environment two ways, a diffuse irradiance and a
  // specular radiance, and only the first of them was being scaled. Sandstone at roughness 0.84 reflects about four per cent, which
  // sounds like nothing until you notice it is four per cent of the whole
  // sky arriving on a surface that cannot see any of it — the underside of a
  // porch, the back of a portal — with no occlusion term anywhere near it.
  // Measured on the December porch frame with everything else already turned
  // down as far as it would go: 0.1 % of the stone below eight per cent
  // luminance with this line missing, 16.0 % with it, against 15.1 % in the
  // photograph. A surface that is hidden from the sky is hidden from its
  // reflection too.
  //
  // Only the occlusion, not the fill's own gain: uSkyFill is an *amplifier*
  // — it stands at 2.1 to make up for an open-hemisphere probe — and putting
  // it on the specular term would double the sky reflected in every wall on
  // the building. This line can only ever darken, which is what it is for.
  radiance *= sfOpenSky;
}
`

const OUTDOOR_PARS = /* glsl */ `
uniform float uSkyFill;
uniform float uFillScale;
uniform vec4 uSkyline[ ${SKYLINE_MAX} ];
uniform int uSkylineCount;
`

export interface OutdoorUniforms extends Record<string, THREE.IUniform> {
  uSkyFill: { value: number }
  /** Each tower as (x, z, radius, top). Shared by every outdoor stone. */
  uSkyline: { value: THREE.Vector4[] }
  uSkylineCount: { value: number }
}

export function outdoorUniforms(): OutdoorUniforms {
  return {
    /**
     * Down from 3.2, now that the towers take their share of it.
     *
     * The old figure was set with nothing shading the envelope at all, so it
     * had to stand for both an open sky and a sheltered one at once and was
     * too bright for the second. With the skyline term doing that job the
     * open figure can be what an open figure should be.
     */
    uSkyFill: { value: 2.1 },
    uSkyline: { value: Array.from({ length: SKYLINE_MAX }, () => new THREE.Vector4()) },
    uSkylineCount: { value: 0 },
  }
}

/**
 * Tell the envelope where the towers are standing.
 *
 * Called on a rebuild, because a slider can move every one of them.
 */
export function setSkyline(
  outdoor: OutdoorUniforms,
  towers: readonly { x: number; z: number; radius: number; top: number }[],
): void {
  const list = outdoor.uSkyline.value
  const n = Math.min(SKYLINE_MAX, towers.length)
  for (let i = 0; i < n; i++) {
    const t = towers[i]!
    list[i]!.set(t.x, t.z, t.radius, t.top)
  }
  outdoor.uSkylineCount.value = n
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
 * Which stones the clerestory lights — see sfThrow in render/washrig.ts.
 *
 * The canopy, and only the canopy. The throw's gain was fitted on a soffit,
 * which meets a heading fifteen degrees off level at a quarter cosine; a
 * shaft or a branch flank standing upright meets it at 0.97. So every column
 * and every branch in the building that could see a clerestory was taking
 * four times the canopy's share, at a gain nobody had fitted for it — at 21
 * June, ten o'clock, 86 per cent of the throw's light landed on things that
 * are not the vault. Through a five-tap binary depth test on a nearest map
 * that is not light but a stencil: hard-edged pale blocks up every shaft and
 * across every flat facet of every branch, the first thing anybody saw on
 * walking in.
 *
 * Gating on how far a face turns downward was tried first and was not
 * enough. It took the shafts out and left the undersides of the branches,
 * which are low-poly and flat-faced, so each facet took one value and the
 * blocks moved up a storey. What the throw was built for is the vault, and
 * the vault is its own stone; everything else is already lit by these same
 * windows through the horizontal pair, which is what that pair is.
 */
const THROW_SHARE: Partial<Record<StoneName, number>> = {
  vault: 1,
}

/**
 * The masonry, and it is the claim that this building is made of pieces.
 *
 * Every exterior surface in every reference photograph is laid stone, and at
 * the distances anybody stands from this one the laying shows: courses about
 * four hundred millimetres tall, blocks between two thirds of a metre and a
 * metre and a half long, a joint every few pixels even from the far side of
 * the plaza. On the Nativity front the joints are *lighter* than the blocks,
 * because the stone went black and the mortar did not; on the Passion front
 * they are darker. That reversal is half of what tells the two fronts apart
 * at a glance, and it is a sign in a uniform.
 *
 * The grain shader that was already here says something different and
 * smaller — that one block is not quite the colour of the next — at a scale
 * of one metre eight, and at exterior exposure it is invisible. What was
 * missing is the *edges*. A hundred metres of surface with no edge in it is
 * an extrusion, and an extrusion is a 3D print.
 *
 * Three things make a joint rather than a stripe of paint:
 *
 *  1. **It is a recess**, so the surface tips at it. Drawn as tone alone a
 *     course line stays put when the sun moves, which is the giveaway. Drawn
 *     as a tilt it catches the sun on one side and loses it on the other,
 *     and a wall of them turns over as the hour slider moves.
 *  2. **It retires.** Each line knows its own filter width and fades out
 *     once a whole course is down to a couple of pixels — the same
 *     machinery the pavement uses, and for the same reason: there is no
 *     texture here to mip, so a line that outlives its sampling rate becomes
 *     moiré. A tower seen from across the Eixample must go smooth, not
 *     sparkly.
 *  3. **The courses break joint.** Every row is offset half a block from the
 *     one below, plus a little per row, because a stack bond is a tile and a
 *     running bond is a wall.
 *
 * The frame is world space, which matters twice over: a piece's masonry
 * belongs to where it stands in the building rather than to its own local
 * coordinates, so the four hundred instanced pieces that share one geometry
 * are not all marked identically; and the courses come out of world `y`, so
 * they ring a tower and run level along a wall without either needing to say
 * which it is.
 *
 * The along-wall coordinate is the awkward one, because there is no single
 * world axis that runs along every surface. It is snapped to whichever
 * horizontal axis the face is *not* pointing down — z for a wall facing x,
 * x for a wall facing z. On a tower that switches four times round the
 * circumference, and what a switch costs is one vertical break in the
 * bonding pattern at each of the four diagonals. Masonry has those; a
 * seam-free blend of two stripe fields, which is the alternative, has a band
 * of mush at every diagonal instead, and mush is not a thing stone does.
 */
const MASONRY_PARS = /* glsl */ `
uniform vec4 uMasonry;
uniform vec4 uWeather;
uniform vec2 uSeam;
uniform float uMasonryRoom;

/** Distance from x to the nearest line of a grid of this period. */
float sfToLine( const in float x, const in float period ) {
  return abs( fract( x / period + 0.5 ) - 0.5 ) * period;
}

/**
 * How much of this pixel a joint covers.
 *
 * The pavement's function, moved up the wall. The first smoothstep is the
 * joint's own edge softened by the filter width, so a line narrower than a
 * pixel comes back grey rather than stippled; the second retires the line
 * once a whole course is down to a couple of pixels.
 */
float sfSeam( const in float distance, const in float halfWidth, const in float filterWidth, const in float period ) {
  float edge = 1.0 - smoothstep( halfWidth - filterWidth, halfWidth + filterWidth, distance );
  return edge * ( 1.0 - smoothstep( period * 0.14, period * 0.5, filterWidth ) );
}

float sfCellHash( const in vec2 cell ) {
  return fract( sin( dot( cell, vec2( 127.1, 311.7 ) ) ) * 43758.5453123 );
}
`

/**
 * What the masonry does to a fragment.
 *
 * Runs where the normal has just been established: see `SurfacePatch.surface`.
 * A stone whose course height is zero opts out entirely, which is every
 * monolithic shaft in the building — a column here is a turned drum and not
 * a wall, and coursing one would be a different and wrong claim.
 */
const MASONRY_SURFACE = /* glsl */ `
if ( uMasonry.x > 0.0 ) {
  vec3 sfWorld = vSunWorld;
  vec3 sfFace = inverseTransformDirection( normal, viewMatrix );

  /**
   * And not on the face that is standing in the room.
   *
   * Coursing is a claim about a weathered outside wall, and the two stones
   * that carry it have a face on each side: the clerestory wall and the
   * terrace lids. Inside, the same shader was drawing four-hundred-
   * millimetre courses and broken joints on every wall of the nave, and a
   * nave lined in running bond reads as a brick warehouse — the openings
   * stop being a stone net and become slots punched in masonry. The real
   * inner faces are dressed ashlar in large panels, faceted round the
   * reveals, with joints you have to look for.
   *
   * The roof map answers which side of the wall this fragment is on, and
   * the indirect term is already asking it; the answer is wanted earlier
   * here, so it is asked again rather than reordered. A tenth is left, so
   * an inner face is dressed stone rather than plaster.
   *
   * The shading normal and not geometryNormal: three has not declared that
   * one yet this early in the chain — see the note at the foot of this
   * block, which is the same trap from the other side.
   */
  float sfLaid = 1.0;
  if ( uSeam.x < 0.5 && uMasonryRoom > 0.5 ) {
    sfLaid = mix( 1.0, 0.1, smoothstep( 0.34, 0.86, sfRoofed( sfWorld, sfFace ) ) );
  }

  // The horizontal axis this face runs along — see the note above.
  float sfAlongFlip = abs( sfFace.x ) > abs( sfFace.z ) ? 1.0 : 0.0;
  float sfAlong = mix( sfWorld.x, sfWorld.z, sfAlongFlip );
  vec3 sfAlongDir = mix( vec3( 1.0, 0.0, 0.0 ), vec3( 0.0, 0.0, 1.0 ), sfAlongFlip );
  float sfUp = sfWorld.y;

  float sfFwUp = max( fwidth( sfUp ), 1e-6 );
  float sfFwAl = max( fwidth( sfAlong ), 1e-6 );

  float sfShade = 0.0;
  float sfTone = 0.0;
  vec3 sfTilt = vec3( 0.0 );

  if ( uSeam.x > 0.5 ) {
    // Panel, not masonry. The six towers over the crossing are hoisted in
    // prefabricated pieces, so what shows is a long horizontal seam every
    // few metres and the diagonal lattice of the facing — no bond, no
    // courses, and nothing that could be mistaken for a block.
    float sfBed = sfSeam( sfToLine( sfUp, uMasonry.x ), uMasonry.z, sfFwUp, uMasonry.x );
    float sfDiagA = sfToLine( ( sfAlong + sfUp ) * 0.7071, uMasonry.y );
    float sfDiagB = sfToLine( ( sfAlong - sfUp ) * 0.7071, uMasonry.y );
    float sfFwD = max( sfFwUp, sfFwAl );
    sfShade = max(
      sfBed,
      max(
        sfSeam( sfDiagA, uMasonry.z, sfFwD, uMasonry.y ),
        sfSeam( sfDiagB, uMasonry.z, sfFwD, uMasonry.y )
      )
    );
    sfTilt = vec3( 0.0, - sign( fract( sfUp / uMasonry.x + 0.5 ) - 0.5 ) * sfBed, 0.0 );
  } else {
    float sfRow = floor( sfUp / uMasonry.x );
    // A course is not laid in one length of block. Ashlar comes out of the
    // quarry in whatever the bed gave and is laid to whatever the mason had,
    // so the length changes from course to course — and held constant, a
    // wall of it reads as brick, which is the wrong material by two orders
    // of size and the one thing this shader must not say.
    float sfLen = uMasonry.y * ( 0.78 + sfCellHash( vec2( sfRow, 7.0 ) ) * 0.52 );
    // Break joint: half a block every course, and a little more so the
    // pattern does not repeat every two rows.
    float sfStagger = ( mod( sfRow, 2.0 ) * 0.5 + sfCellHash( vec2( sfRow, 3.0 ) ) * 0.28 ) * sfLen;
    float sfRun = sfAlong + sfStagger;

    float sfBed = sfSeam( sfToLine( sfUp, uMasonry.x ), uMasonry.z, sfFwUp, uMasonry.x );
    float sfPerp = sfSeam( sfToLine( sfRun, sfLen ), uMasonry.z, sfFwAl, sfLen );
    sfShade = max( sfBed, sfPerp );

    // One block, one tone. Blocks were cut at different times from different
    // beds of the same quarry and they have never matched.
    sfTone = ( sfCellHash( vec2( floor( sfRun / sfLen ), sfRow ) ) - 0.5 ) * uWeather.x;

    sfTilt =
      vec3( 0.0, - sign( fract( sfUp / uMasonry.x + 0.5 ) - 0.5 ) * sfBed, 0.0 ) +
      sfAlongDir * ( - sign( fract( sfRun / sfLen + 0.5 ) - 0.5 ) * sfPerp );
  }

  /**
   * The weather, which is where the age of a fabric actually lives.
   *
   * Three things, all of them things water does. What faces the sky is
   * rained on and comes back paler than the wall it belongs to. What faces
   * away is sheltered, never washed, and on hundred-year-old Montjuïc stone
   * that is where the black crust is. And between the two, the runnels: dirt
   * carried down a vertical face in streaks, which is the single most
   * legible sign of age on any masonry building and costs one noise lookup.
   */
  float sfSky = max( 0.0, sfFace.y );
  float sfUnder = max( 0.0, - sfFace.y );
  float sfVertical = 1.0 - abs( sfFace.y );
  float sfRun = sfValueNoise( vec3( sfAlong * 2.3, sfUp * 0.09, 17.0 ) );
  float sfWeather =
    1.0
    + uWeather.z * sfSky
    - uWeather.y * sfUnder
    - uWeather.w * sfVertical * smoothstep( 0.42, 0.95, sfRun );

  // Everything the laying does — the joints, the block-to-block tone, the
  // weather that runs down them — belongs to the outside face and fades
  // together with it. The albedo is the one thing that does not: a wall is
  // the same stone on both sides.
  sfShade *= sfLaid;
  sfTone *= sfLaid;
  sfTilt *= sfLaid;
  sfWeather = mix( 1.0, sfWeather, sfLaid );

  diffuseColor.rgb *= ( 1.0 + sfShade * uMasonry.w ) * ( 1.0 + sfTone ) * sfWeather;
  // A joint is cut and a block face is dressed, so the joint is the rougher
  // of the two — and a weathered block is rougher than a clean one.
  roughnessFactor = clamp( roughnessFactor + sfShade * 0.08, 0.0, 1.0 );

  // The shading normal only. There is no geometryNormal at this point in the
  // chain: three declares that one from this one further down, in
  // lights_fragment_begin, so tipping this tips both — and naming the other
  // here is naming an identifier the shader has not met yet.
  if ( uSeam.y > 0.0 ) {
    normal = normalize( normal + mat3( viewMatrix ) * sfTilt * uSeam.y );
  }
}
`

/**
 * One fabric's masonry.
 *
 * `course` and `block` are metres; `joint` is the half-width of the cut, in
 * metres, so it is a real gap and not a fraction of anything. `tone` is
 * signed on purpose: a joint is *darker* than the stone on every fabric here
 * except the Nativity front, where the blocks have taken the dirt and the
 * mortar has stayed cleaner than they have. Getting that one sign wrong
 * loses the front.
 *
 * This is also where the Nativity front's age lives, now that its albedo has
 * stopped claiming to be soot. `soot` blackens what faces away from the sky
 * and is never washed, `streak` runs dirt down the vertical faces, and
 * `vary` lets one block differ from the next — all three of them strong
 * here, and all three of them things that leave the sunlit, rained-on face
 * of a block exactly the warm stone colour the photographs show it to be.
 */
interface Masonry {
  course: number
  block: number
  joint: number
  tone: number
  /** Block-to-block tone, soot on sheltered faces, rain-wash, dirt runnels. */
  vary: number
  soot: number
  wash: number
  streak: number
  /** Panel seams rather than courses, and how far a joint tips the normal. */
  seam: boolean
  relief: number
}

const NO_MASONRY: Masonry = {
  course: 0,
  block: 0,
  joint: 0,
  tone: 0,
  vary: 0,
  soot: 0,
  wash: 0,
  streak: 0,
  seam: false,
  relief: 0,
}

/**
 * Which stones are laid, and how.
 *
 * Only the ones that are walls. A column in this building is a turned shaft
 * and the vault is a thin web; coursing either would be a different claim
 * and a false one, and the interior has been matched against photographs
 * without it. What is missing here is missing deliberately.
 */
const MASONRY: Partial<Record<StoneName, Masonry>> = {
  // Gaudí's own front: small stone, finely jointed, black with pale mortar,
  // and every sheltered face of it crusted.
  nativity: {
    course: 0.38, block: 0.95, joint: 0.022, tone: 0.14,
    vary: 0.17, soot: 0.52, wash: 0.14, streak: 0.32, seam: false, relief: 0.75,
  },
  // Sixties work, larger blocks, joints darker than the stone.
  passion: {
    course: 0.46, block: 1.3, joint: 0.02, tone: -0.15,
    vary: 0.07, soot: 0.12, wash: 0.07, streak: 0.11, seam: false, relief: 0.62,
  },
  // New white stone, cut large and barely weathered at all.
  white: {
    course: 0.56, block: 1.65, joint: 0.016, tone: -0.1,
    vary: 0.04, soot: 0.05, wash: 0.04, streak: 0.05, seam: false, relief: 0.5,
  },
  // Not laid at all: panels, seamed long and straight, and a diamond facing.
  panel: {
    course: 2.6, block: 3.2, joint: 0.03, tone: -0.13,
    vary: 0.03, soot: 0.03, wash: 0.03, streak: 0.03, seam: true, relief: 0.42,
  },
  // The generic envelope, and the two that face both ways.
  facade: {
    course: 0.46, block: 1.25, joint: 0.02, tone: -0.14,
    vary: 0.07, soot: 0.1, wash: 0.06, streak: 0.09, seam: false, relief: 0.6,
  },
  shell: {
    course: 0.46, block: 1.25, joint: 0.02, tone: -0.13,
    vary: 0.06, soot: 0.08, wash: 0.07, streak: 0.07, seam: false, relief: 0.55,
  },
  wall: {
    course: 0.44, block: 1.3, joint: 0.018, tone: -0.12,
    vary: 0.06, soot: 0.06, wash: 0.05, streak: 0.06, seam: false, relief: 0.55,
  },
}

export interface MasonryUniforms extends Record<string, THREE.IUniform> {
  uMasonry: { value: THREE.Vector4 }
  uWeather: { value: THREE.Vector4 }
  uSeam: { value: THREE.Vector2 }
  /** Whether this fabric has a face inside the building, so it can go smooth there. */
  uMasonryRoom: { value: number }
}

function masonryUniforms(name: StoneName, indoors: boolean): MasonryUniforms {
  const m = MASONRY[name] ?? NO_MASONRY
  return {
    uMasonry: { value: new THREE.Vector4(m.course, m.block, m.joint, m.tone) },
    uWeather: { value: new THREE.Vector4(m.vary, m.soot, m.wash, m.streak) },
    uSeam: { value: new THREE.Vector2(m.seam ? 1 : 0, m.relief) },
    uMasonryRoom: { value: indoors ? 1 : 0 },
  }
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
  const throwShare = { uThrowShare: { value: THROW_SHARE[name] ?? 0 } }
  const laid = masonryUniforms(name, indoors)
  return {
    uniforms: indoors
      ? { ...grain, ...room, ...wash, ...outdoor, ...shelter, ...fillScale, ...throwShare, ...laid }
      : { ...grain, ...outdoor, ...shelter, ...fillScale, ...laid },
    pars: indoors
      ? `${GRAIN_PARS}\n${INDOOR_PARS}\n${WASH_PARS}\n${OUTDOOR_PARS}\n${SHELTER_PARS}\n${MASONRY_PARS}`
      : `${GRAIN_PARS}\n${OUTDOOR_PARS}\n${SHELTER_PARS}\n${MASONRY_PARS}`,
    colour: GRAIN_COLOUR,
    surface: MASONRY_SURFACE,
    indirect: indoors ? SHELTER : OUTDOOR_INDIRECT,
    light: indoors ? INDOOR_LIGHT : undefined,
    key: indoors ? 'stone-room-13' : 'stone-sky-6',
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
    sheet: stone('sheet'),
    facade: stone('facade'),
    nativity: stone('nativity'),
    passion: stone('passion'),
    white: stone('white'),
    panel: stone('panel'),
    mosaic: stone('mosaic'),
    enamel: stone('enamel'),
    hollow: stone('hollow'),
    shell: stone('shell'),
    lamp: stone('lamp'),
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

/**
 * The street trees, which were the last thing on the plaza still made of
 * primitives.
 *
 * A cathedral seen across bare ground is an object on a table, and the city
 * already understood that — every reference frame has this building seen
 * *through* something. What it had to see it through was an icosahedron on a
 * cylinder, and a sphere of flat green has exactly the property the whole
 * exterior was failing on: a smooth closed outline, with no edge anywhere in
 * it. At eight metres tall and twenty from the camera that is the most
 * conspicuously modelled object in the frame.
 *
 * What a tree actually gives a photograph is a *ragged silhouette* — a few
 * thousand small holes round its edge that break the light behind it. So the
 * crown is three quads crossed about the trunk and the leaves are cut out of
 * them: a radial falloff for the overall shape, two octaves of noise for the
 * edge, and an alpha test rather than blending, so there is no sorting to get
 * wrong and the shadow of a leaf is the shape of the leaf.
 *
 * The mask is drawn in the quad's own coordinates, which is what the vertex
 * hook is carrying — see `SurfacePatch.vertex`. The noise is offset by where
 * the tree stands, so two hundred instances of one geometry are two hundred
 * different trees.
 */
const FOLIAGE_PARS = /* glsl */ `
varying vec3 vLeafLocal;
uniform vec2 uCanopy;
`

const FOLIAGE_VERTEX_PARS = /* glsl */ `
varying vec3 vLeafLocal;
`

const FOLIAGE_VERTEX = /* glsl */ `
  vLeafLocal = position;
`

const FOLIAGE_COLOUR = /* glsl */ `
{
  // How far out in the crown this fragment is, as a fraction of its radius.
  vec3 sfFromHeart = vLeafLocal - vec3( 0.0, uCanopy.x, 0.0 );
  sfFromHeart.y *= 1.25;
  float sfOut = length( sfFromHeart ) / max( uCanopy.y, 0.01 );

  // Three octaves, offset by where this tree is standing so no two instances
  // are cut the same way. The finest one is what a leaf is: at two octaves
  // the crown came back cut into scallops the size of a hand of bananas,
  // which from the pavement is a shape no tree has.
  vec3 sfSeed = vLeafLocal * 3.4 + floor( vSunWorld * 0.37 ) * 5.3;
  float sfLeaf =
    sfValueNoise( sfSeed ) * 0.46 +
    sfValueNoise( sfSeed * 2.7 ) * 0.33 +
    sfValueNoise( sfSeed * 7.1 ) * 0.21;

  // Dense in the middle, ragged at the edge, gone past it.
  diffuseColor.a = smoothstep( 1.06, 0.18, sfOut ) * ( 0.46 + sfLeaf * 1.0 );

  // A leaf that has sky behind it is brighter than one that has the tree
  // behind it, and the crown's own depth is the only thing that says so.
  diffuseColor.rgb *= 0.72 + 0.5 * smoothstep( 0.95, 0.25, sfOut );
}
`

export interface FoliageUniforms extends Record<string, THREE.IUniform> {
  /** Where the crown's middle is above the foot, and how wide it is. */
  uCanopy: { value: THREE.Vector2 }
}

export function foliagePatch(fill: CityUniforms, heart: number, radius: number): SurfacePatch {
  const canopy: FoliageUniforms = { uCanopy: { value: new THREE.Vector2(heart, radius) } }
  return {
    uniforms: { ...fill, ...canopy },
    pars: `${GRAIN_PARS}\n${CITY_PARS}\n${FOLIAGE_PARS}`,
    vertex: { pars: FOLIAGE_VERTEX_PARS, body: FOLIAGE_VERTEX },
    colour: FOLIAGE_COLOUR,
    light: CITY_LIGHT,
    key: 'foliage-1',
  }
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
