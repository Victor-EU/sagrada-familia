import * as THREE from 'three'
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { transmittanceMaterial } from '../geometry/glass.ts'
import { LAYER_GLASS, LAYER_SKYLINE } from './sunrig.ts'

/**
 * The light off the glass, as light rather than as fill.
 *
 * The sun rig answers "did the sun reach this point, and through what", and
 * the sun is a disc half a degree across. A window is a hundred square metres
 * of sky. Photograph the nave at any hour and almost none of what you are
 * looking at is in direct sun: the green wash lying ten metres across an
 * aisle soffit, the orange that runs the whole height of a column shaft, the
 * lit flank of every splayed reveal — all of it is skylight that came through
 * coloured glass, and until now the model had no term for it at all. It had a
 * *fill*: a number per surface orientation, with no shadows, no falloff and
 * no pattern, which is why the room came out evenly lit and the big soft
 * patches in the photographs never appeared.
 *
 * So the glazing gets a rig of its own. It is the sun rig's two passes —
 * occlusion depth, and glass transmittance — run along the two horizontal
 * directions the nave is glazed on, and then read the same way:
 *
 *  - **it is shadowed**, so a column stands in its own band of shade and
 *    throws that band across the floor and onto the next column, which is
 *    most of what gives the nave depth;
 *  - **it carries the window's pattern**, because the transmittance map is
 *    the window — so the light landing on the far wall is lancet-shaped and
 *    lancet-coloured rather than a uniform tint;
 *  - **it is soft**, because the source is a hemisphere of sky and not a
 *    disc. A wide tap kernel stands in for that: cheap, and wrong only in
 *    that the penumbra does not grow with distance.
 *
 * Two horizontal directions and not more. The nave is a long room glazed on
 * its two long sides, and light arriving along its axis has ninety metres of
 * colonnade to get through; the apse and the fronts are handled by the same
 * two maps badly and by nothing else at all, which is the right trade for one
 * pass.
 *
 * And two more of them tilted up, because a horizontal pass cannot see a
 * soffit. The clerestory is a window like any other; what makes it different
 * is that everything it lights is *above* it, so the light leaves it going up
 * and inward and lands on the canopy. That is the same rig with the heading
 * tilted — see THROW_TILT — and it is the only source in the model that
 * reaches the vault carrying the colour of a particular window.
 *
 * Nothing here moves. The building is static and so are the directions, so
 * the renders happen once per rebuild and never again — this is the cheapest
 * light in the project at runtime and the most expensive to have left out.
 */

/**
 * How wide the source is, in metres at the model.
 *
 * A window is metres across and the blur that says so has to be stated in
 * metres: expressed in texels it would change every time the fit did.
 */
const SOFT_METRES = 1.1

/**
 * What the long wall in shade is worth against the one with the sun on it.
 *
 * The tilted pair got this first and the flat pair did not, on the argument
 * that a window is a hundred square metres of *sky* and the sky is there all
 * day. Half true, and it is why this number is not the tilted pair's tenth.
 * But at half past one in December the Nativity glazing is in its own
 * shadow while the wall opposite is a hundred metres of lit glass, and a
 * pair that took half of each was lighting every wall and vault facet it
 * reaches with the mean of Vila-Grau's two halves at every hour of the day.
 *
 * Which is a smaller correction than it sounds, and the honest place to say
 * so is here. Measured by ablation, this rig is one per cent of what lights
 * a *column*: it can only reach what has an unobstructed line to a window
 * across the church, and most of a colonnade does not — see `uWashCover`.
 * What it does carry is a wall or a soffit facing a window across an open
 * span, and on those the weight is worth having. The room's own hour is
 * somewhere else entirely, in `uWashTilt` and what reads it.
 *
 * Two fifths, against the clerestory's tenth, and the difference is not a
 * hedge. What the sunlit clerestory has that the shaded one has not is the
 * aisle roof beneath it: a hundred metres of lit stone throwing up into the
 * glass, a second multiplier on top of the sun, and that is what makes it an
 * order of magnitude up there. A nave window has no such thing. Its two
 * states are direct sun on the glass and north sky through it, which on a
 * vertical surface at these altitudes is about four to one — so the shaded
 * wall keeps rather more than a tenth, and keeps it coloured.
 *
 * ## And the pair is normalised, which the tilted pair is not
 *
 * The hour moves light between the two long walls. It does not take it out
 * of the room. On any clear day exactly one of them has the sun on it, so
 * what the clock changes is the share and not the total — and this rig
 * carries most of the interior's light, so a weight that dimmed the sum
 * would have to be bought straight back on `uWashGain`, which would then
 * overbrighten the one hour the room was calibrated at.
 *
 * There is a moment when neither wall is lit: the sun square on the
 * south-east, along the nave, mid-morning. That is the moment the Glory
 * front is blazing instead, and this rig has no heading for the Glory front.
 * Holding the pair at its calibrated total is then the least wrong thing
 * available — the light really is coming in, just through a wall the rig
 * cannot see, and the alternative is a room that goes dark at the hour the
 * building is at its brightest.
 *
 * So the symmetric hour comes out exactly as it was built, and nothing
 * downstream needs re-fitting. What the clock now does is tilt the pair.
 */
const WASH_SHADE = 0.4

/**
 * SUN_ON_GLASS — and the one thing the weights above are built not to say.
 *
 * Both pairs are weights on where the sun is *round* the building, held at
 * a total, so at half past one in December — the sun eleven degrees off
 * square on the Passion glazing and twenty-four up — the room took in
 * exactly what it takes at noon in June, when the same wall has it at a
 * fifth of the cosine. The photographs are not held at a total. The
 * author's own camera metered the central vault at EV 6.3 at twenty past
 * one and the Passion wall at 7.7 six minutes later, and the aisle vault
 * the wall throws onto at 9.6 at five to three: the light through that
 * glass is two and three stops over the room it is in. That is what makes
 * those frames what they are, a room gone dark round a wall on fire; the
 * canopy frames of July have nothing like it, and are pale.
 *
 * So `uWashSun` is the sun on each wall and nothing else: the cosine of it
 * on the glazing's face, as a share of the noon sun, so twilight takes it
 * off with the light — 0.7 on the Passion glass on the December
 * afternoon, 0.4 on a July one, a tenth on the Nativity side at a June
 * noon. It lights the glass itself (uSunGlow in geometry/glass.ts) and
 * warms what stands in the room (uRoomSunWarmth in render/materials.ts),
 * and the eye closes down on the result — see render/meter.ts.
 *
 * Not the maps. Tried as a share of the wash and the throw handed back at
 * the glass's own colour, it lit the faces turned to the glass, which from
 * anywhere a photograph stands are the faces turned away from the camera:
 * at three times the wash it moved no December frame in the third decimal,
 * and turned a June morning's canopy green.
 */

/**
 * How far above horizontal the clerestory throws, in radians.
 *
 * Measured off the model, by casting rays up through it and writing down
 * what they hit. The central vessel is glazed at x = +/- 8.1 from 33 m up to
 * 41; its vault soffits run from about 36 to about 42 across the sixteen
 * metres between those two walls; and the aisle roof outside stands at 31.7
 * from x = 10 outward. So the clerestory is not *below* what it lights, it is
 * level with it, and the light crosses the vessel climbing only a few metres
 * in sixteen.
 *
 * Fifteen degrees is the line that threads all three. Steeper and the ray
 * leaves the vault behind and lands on the terrace above it — the first
 * build of this pass was set at thirty-eight on an assumed vault height and
 * contributed, measured, nothing at all at eighty times its gain. Shallower
 * and it arrives under the springing. At fifteen it enters the upper half of
 * the clerestory, crosses to the far soffits, and on the way out clears the
 * aisle roof by five metres and sees sky.
 *
 * One angle, not a sweep, for the same reason the rig runs two horizontal
 * directions and not eight: this is a static pass, and what it buys is a
 * shadowed, patterned, coloured source where the canopy had a constant.
 */
const THROW_TILT = THREE.MathUtils.degToRad(15)

/**
 * How wide the clerestory is as a source, in metres at the model.
 *
 * Wider than a window and narrower than the floor. The opening is eight
 * metres of glass seen from fifteen away, so it subtends most of a right
 * angle and throws a broad band rather than a lancet — but the stone above
 * it still casts an edge, and blurring past about three metres takes that
 * edge out along with everything the branches do.
 */
const THROW_METRES = 3

/**
 * What the clerestory on the shaded side of the building is still worth.
 *
 * The rest of this rig does not know where the sun is, on purpose: a window
 * is a hundred square metres of *sky*, the sky is there all day, and a map
 * that had to be rebuilt every time the hour moved would not be free. The
 * tilted pair is the one place that will not do, and the photographs say so
 * flatly. At half past one in December the canopy over the Passion wall is
 * gold from one end to the other and there is not a square metre of green
 * anywhere on it — while the model, throwing equally from both clerestories,
 * put mint-green blooms across the whole vault. What the sunlit side has and
 * the shaded side has not is the aisle roof underneath it: a hundred metres
 * of lit stone throwing up into the glass, which is the difference between a
 * window and a bright window.
 *
 * A tenth, and not nothing: the shaded clerestory still has the whole
 * northern sky in front of it. A quarter was the first try and left the
 * shaded side painting vault facets its own colour on frames where it is a
 * few per cent of what is arriving — direct sun on pale stone against north
 * sky is an order of magnitude, not a factor of four.
 *
 * This is a weight on a map that is already built, so the hour moves it for
 * the cost of a dot product on the CPU and nothing at all on the GPU.
 */
const THROW_SHADE = 0.1

/**
 * Which way the light travels. +x is the Passion wall's light heading in.
 *
 * Four now, in two pairs. The first two run horizontally and light the room;
 * the second two run the same two ways but tilted up, and light the canopy —
 * see THROW_TILT. Everything below is written against the heading, so a
 * tilted pass is the same four renders read the same way and needs no
 * special case anywhere.
 */
const HEADING = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(Math.cos(THROW_TILT), Math.sin(THROW_TILT), 0),
  new THREE.Vector3(-Math.cos(THROW_TILT), Math.sin(THROW_TILT), 0),
] as const

/**
 * How wide the floor is as a source, in metres at the model.
 *
 * Much softer than a window. A window is a few metres across and ten or
 * twenty away; the pavement is the whole plan of the building and a soffit
 * forty-five metres up sees nearly all of it at once, so what a branch casts
 * on the vault above it is a broad darkening and not a shadow with an edge.
 */
const LOFT_METRES = 4.5

/**
 * The patch of floor a standing face asks about: how far out along its own
 * heading, and how wide, in metres at the model.
 *
 * Straight down from a column shaft is the shaft's own footprint, and the
 * map answers, correctly, that the floor there is blocked — by the column.
 * Which is not the question. A shaft is not lit by the flagstones it stands
 * on, it is lit by the aisle it faces, so the lookup steps out along the
 * face's own heading before it asks. Far enough to clear the thickest
 * column in the building and no further: past that a shaft starts reporting
 * on the next bay along.
 *
 * The same number sets the kernel, because stepping out three metres inside
 * a kernel nine metres wide is no step at all — measured, it moved the
 * frame by two per cent, which is what a displacement a third of the blur
 * it sits in is worth. A standing face asks about three metres of floor
 * three metres away; a soffit asks about the nine metres beneath it.
 *
 * Both are zero for a soffit, which faces straight down and has no heading,
 * so the canopy is untouched and stays lit by LOFT_METRES of floor.
 */
const LOFT_REACH = 3

/**
 * Floors, and the plaza they stand on.
 *
 * The one pass in this rig that looks *up* has to be told to ignore them.
 * It is asking how much of the pavement each soffit can see, and a camera
 * under the building looking up meets the pavement before it meets anything
 * else — so left in, the floor shadows the entire building from its own
 * light and the map comes back uniformly black. Matched by name, the way
 * roof.ts excludes the porches, and for the same kind of reason: this is a
 * question about what stands *between* two things, and the source is not in
 * between itself.
 */
const UNDERFOOT = /^(pavement|base-|presbytery|plaza)/

export interface WashUniforms extends Record<string, THREE.IUniform> {
  uWashMatrixA: { value: THREE.Matrix4 }
  uWashMatrixB: { value: THREE.Matrix4 }
  uWashDepthA: { value: THREE.Texture | null }
  uWashDepthB: { value: THREE.Texture | null }
  uWashTintA: { value: THREE.Texture | null }
  uWashTintB: { value: THREE.Texture | null }
  uWashDirA: { value: THREE.Vector3 }
  uWashDirB: { value: THREE.Vector3 }
  uWashSoft: { value: number }
  uWashBias: { value: number }
  uWashGain: { value: number }
  uWashBlur: { value: number }
  /** What each long wall is worth at this hour — see WASH_SHADE. */
  uWashSide: { value: THREE.Vector2 }
  /**
   * The same statement as one signed number: −1 all Passion, +1 all
   * Nativity, 0 when neither wall has the sun. The room's own terms read
   * this rather than the pair, because what they want to know is not how
   * bright a window is but which half of the building the light is in.
   */
  uWashTilt: { value: number }
  /** The sun standing on each wall, not normalised away — see SUN_ON_GLASS. */
  uWashSun: { value: THREE.Vector2 }
  /** The clerestory, throwing up and inward — the same four maps, tilted. */
  uThrowMatrixA: { value: THREE.Matrix4 }
  uThrowMatrixB: { value: THREE.Matrix4 }
  uThrowDepthA: { value: THREE.Texture | null }
  uThrowDepthB: { value: THREE.Texture | null }
  uThrowTintA: { value: THREE.Texture | null }
  uThrowTintB: { value: THREE.Texture | null }
  uThrowDirA: { value: THREE.Vector3 }
  uThrowDirB: { value: THREE.Vector3 }
  uThrowSoft: { value: number }
  uThrowBias: { value: number }
  uThrowGain: { value: number }
  uThrowBlur: { value: number }
  /** What each tilted side is worth at this hour — see THROW_SHADE. */
  uThrowSide: { value: THREE.Vector2 }
  /** The light from below: world → the up-looking map's clip space. */
  uLoftMatrix: { value: THREE.Matrix4 }
  uLoftDepth: { value: THREE.Texture | null }
  uLoftSoft: { value: number }
  uLoftReach: { value: number }
  uLoftStand: { value: number }
  uLoftBias: { value: number }
  uLoftGain: { value: number }
}

interface Side {
  camera: THREE.OrthographicCamera
  depth: THREE.WebGLRenderTarget
  colour: THREE.WebGLRenderTarget
}

export class WashRig {
  readonly uniforms: WashUniforms
  private readonly sides: Side[] = []
  private readonly depthMaterial: THREE.MeshBasicMaterial
  private readonly transmitMaterial: THREE.MeshBasicMaterial
  private readonly bounds = new THREE.Box3(
    new THREE.Vector3(-30, 0, -30),
    new THREE.Vector3(30, 60, 30),
  )
  private readonly centre = new THREE.Vector3()
  /** Top of the room, from `setBounds`; the up-looking pass stops there. */
  private ceiling = 45
  private readonly loftCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)
  private readonly loftTarget: THREE.WebGLRenderTarget
  private valid = false
  /** How many times the four passes have actually run. Dev instrumentation. */
  runs = 0
  private quad: FullScreenQuad | null = null

  constructor(readonly resolution = 1024) {
    for (let i = 0; i < HEADING.length; i++) {
      const depthTexture = new THREE.DepthTexture(resolution, resolution)
      depthTexture.type = THREE.UnsignedIntType
      depthTexture.minFilter = THREE.NearestFilter
      depthTexture.magFilter = THREE.NearestFilter
      const depth = new THREE.WebGLRenderTarget(resolution, resolution, {
        depthTexture,
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
      })

      // Its own depth buffer, so a pane on the far wall cannot colour light
      // that a nearer pane already coloured — the same reason the sun rig
      // keeps one.
      const glassDepth = new THREE.DepthTexture(resolution, resolution)
      glassDepth.type = THREE.UnsignedIntType
      glassDepth.minFilter = THREE.NearestFilter
      glassDepth.magFilter = THREE.NearestFilter
      const colour = new THREE.WebGLRenderTarget(resolution, resolution, {
        type: THREE.HalfFloatType,
        // Mipmapped, because this one is read *blurred*, and a blur is what
        // a mip chain is. The window's pattern projected sharp is a gobo: a
        // razor-edged slide of the glazing thrown across the nave, which is
        // what a point source would do and is nothing like a window. The
        // source is a wall of sky metres across, so the pattern it throws is
        // soft at a metre and gone at ten — one `textureLod` away.
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
        generateMipmaps: true,
        depthTexture: glassDepth,
      })
      colour.texture.colorSpace = THREE.NoColorSpace

      this.sides.push({ camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100), depth, colour })
    }

    // The up-looking map. Depth only: what is overhead is not glass, and the
    // colour of what the floor throws back is a property of the floor rather
    // than of anything this pass can see.
    const loftDepth = new THREE.DepthTexture(resolution, resolution)
    loftDepth.type = THREE.UnsignedIntType
    loftDepth.minFilter = THREE.NearestFilter
    loftDepth.magFilter = THREE.NearestFilter
    this.loftTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
      depthTexture: loftDepth,
      format: THREE.RedFormat,
      type: THREE.UnsignedByteType,
    })

    this.depthMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide })
    this.transmitMaterial = transmittanceMaterial()

    this.uniforms = {
      uWashMatrixA: { value: new THREE.Matrix4() },
      uWashMatrixB: { value: new THREE.Matrix4() },
      uWashDepthA: { value: this.sides[0]!.depth.depthTexture },
      uWashDepthB: { value: this.sides[1]!.depth.depthTexture },
      uWashTintA: { value: this.sides[0]!.colour.texture },
      uWashTintB: { value: this.sides[1]!.colour.texture },
      uWashDirA: { value: HEADING[0].clone() },
      uWashDirB: { value: HEADING[1].clone() },
      /** Tap spacing, in texture units. This is the softness of the source. */
      uWashSoft: { value: 3.5 / resolution },
      /** Depth bias in metres, along the light. */
      uWashBias: { value: 0.22 },
      uWashGain: { value: 9 },
      /**
       * Mip level the window is read at.
       *
       * Four, which at this fit is about a metre and a half of blur — a
       * lancet's width. Below that the nave gets a stencilled pattern of
       * individual lights; above it every window in the building averages to
       * one colour and the bay structure that the photographs are full of
       * disappears with it.
       */
      uWashBlur: { value: 4 },
      uWashSide: { value: new THREE.Vector2(1, 1) },
      uWashTilt: { value: 0 },
      uWashSun: { value: new THREE.Vector2() },

      uThrowMatrixA: { value: new THREE.Matrix4() },
      uThrowMatrixB: { value: new THREE.Matrix4() },
      uThrowDepthA: { value: this.sides[2]!.depth.depthTexture },
      uThrowDepthB: { value: this.sides[3]!.depth.depthTexture },
      uThrowTintA: { value: this.sides[2]!.colour.texture },
      uThrowTintB: { value: this.sides[3]!.colour.texture },
      uThrowDirA: { value: HEADING[2].clone() },
      uThrowDirB: { value: HEADING[3].clone() },
      /** Tap spacing, in texture units — set from THROW_METRES on render. */
      uThrowSoft: { value: 3 / resolution },
      /**
       * Depth bias in metres, along the light.
       *
       * Larger than the horizontal pass's. A tilted map runs its depth
       * gradient across the vault's soffits at a glancing angle, and the
       * canopy is the one surface in the building made of hyperboloids that
       * are nearly tangent to it — so the acne this bias exists to stop is
       * worse here than anywhere.
       */
      uThrowBias: { value: 0.5 },
      /**
       * How much light the clerestory is.
       *
       * Large against the horizontal pass's nine, and it has to be: this
       * light arrives at fifteen degrees, so the cosine at a soffit is a
       * quarter where the floor's is one, and it arrives through a window
       * that occupies a hundredth of the map rather than a wall of them.
       * Turned down to the same figure as the flat pair it moved the vault
       * by nothing measurable. Most of it is off at any hour besides, since
       * only one clerestory has the sun behind it — see THROW_SHADE.
       *
       * What it buys is not brightness. Over the whole canopy it is worth
       * about five per cent of the mean, which is not the reason for it;
       * what it is for is that the canopy had no *direction* in it at all.
       * Every other term that reaches a soffit — the floor, the flat fill,
       * the probe — is the same wherever the soffit faces, so a fan of
       * twenty facets came back as twenty copies of one tone, and adding
       * colour to that only made it a painted ceiling. This is the one
       * source up there that a facet can face or turn away from.
       *
       * Pushed past about a hundred and twenty it stops being light and
       * starts being paint: the facets turned at the far clerestory go
       * flatly the colour of its glass, which no photograph of this
       * building shows.
       */
      uThrowGain: { value: 90 },
      /**
       * Mip level the clerestory is read at.
       *
       * One higher than the horizontal pass, not lower, which is the
       * opposite of where this started. That pass is read by surfaces a few
       * metres from their window and wants a lancet's width of blur. This
       * one is read by a vault fifteen metres away and across at a glancing
       * angle, where a lancet's width of pattern arrives as a stencil of
       * hard-edged blotches — the window printed on the ceiling rather than
       * thrown onto it.
       */
      uThrowBlur: { value: 5 },
      uThrowSide: { value: new THREE.Vector2(1, 1) },

      uLoftMatrix: { value: new THREE.Matrix4() },
      uLoftDepth: { value: loftDepth },
      /** Tap spacing, in texture units — set from LOFT_METRES on render. */
      uLoftSoft: { value: 4.5 / resolution },
      /**
       * How far out along its own heading a face asks about the floor, in
       * texture units — set from LOFT_REACH on render.
       */
      uLoftReach: { value: 3 / resolution },
      /**
       * How much of the floor's horizon a standing face is credited with.
       *
       * One would be an infinite plane with nothing on it. This room has
       * four hundred columns on it, and a shaft at eye height sees the far
       * half of that floor through all of them — where a soffit forty-five
       * metres up looks down on the lot. The map cannot tell the two apart:
       * its kernel is nine metres across and the occlusion in question is at
       * forty. So the horizon is discounted and the floor underfoot is not,
       * which is also the direction the error runs.
       */
      uLoftStand: { value: 0.45 },
      /** Depth bias in metres, straight down toward the source. */
      uLoftBias: { value: 0.3 },
      /**
       * How much light the floor is.
       *
       * It is the largest surface in the building, it is pale polished
       * stone, and every soffit in the place faces it — so this is not a
       * garnish, it is what lights the canopy. The flat term it replaces
       * stood at 8 and then 4; this is the same light with the shadows put
       * back, so it starts near the figure that was standing in for it.
       */
      uLoftGain: { value: 3.4 },
    }
  }

  /**
   * What the rig has to cover, and what it must not.
   *
   * Only the room. Fitted to the whole model the frustum has to hold a
   * hundred and seventy metres of tower to light a nave twenty-six metres
   * high, and the glazing ends up occupying about three per cent of the map —
   * which is how the first build of this came out reading black almost
   * everywhere: not because the pass failed, but because the window was four
   * texels wide and the ray from most receivers landed in the stone beside
   * it. `ceiling` is the top of the room, and everything above it is a tower
   * that lights nothing indoors.
   */
  setBounds(box: THREE.Box3, ceiling: number): void {
    const capped = box.clone()
    capped.max.y = Math.min(capped.max.y, ceiling + 6)
    if (capped.equals(this.bounds) && ceiling === this.ceiling) return
    this.bounds.copy(capped)
    this.ceiling = ceiling
    this.valid = false
  }

  /**
   * Which side of the building has the sun behind its glass.
   *
   * Nothing is re-rendered. The maps say where the glass is and what colour
   * it is, which the hour does not change; this says how much light is
   * standing outside each of them, which it does. Four weights, a dot
   * product each, and the whole of what the clock costs this rig.
   *
   * The two pairs are weighted differently on purpose — see WASH_SHADE for
   * why the long walls keep two fifths where the clerestory keeps a tenth,
   * and why the flat pair is renormalised afterwards and the tilted pair is
   * not.
   */
  setSun(direction: THREE.Vector3, strength = 1): void {
    /** The cosine of the sun on the wall this pass enters through. */
    const toward = (heading: THREE.Vector3): number =>
      // That wall faces back against the heading, so it has the sun on it
      // when the sun lies the way the light travels.
      -(direction.x * heading.x + direction.z * heading.z)
    /** How much sun is standing outside the wall this pass enters through. */
    const litness = (heading: THREE.Vector3): number =>
      // Height does not come into it: a wall at noon in June is lit, steeply.
      THREE.MathUtils.smoothstep(toward(heading), -0.15, 0.55)

    // And here height does come into it — see SUN_ON_GLASS.
    this.uniforms.uWashSun.value.set(
      Math.max(0, toward(HEADING[0])) * strength,
      Math.max(0, toward(HEADING[1])) * strength,
    )

    const throwSide = this.uniforms.uThrowSide.value
    for (let i = 2; i < HEADING.length; i++) {
      const lit = litness(HEADING[i]!)
      throwSide.setComponent(i - 2, THREE.MathUtils.lerp(THROW_SHADE, 1, lit))
    }

    const a = THREE.MathUtils.lerp(WASH_SHADE, 1, litness(HEADING[0]))
    const b = THREE.MathUtils.lerp(WASH_SHADE, 1, litness(HEADING[1]))
    // Held at a mean of one, so the hour tilts this pair without dimming it.
    this.uniforms.uWashSide.value.set(a, b).multiplyScalar(2 / (a + b))
    // And the tilt itself, on its own scale: both weights live between
    // WASH_SHADE and one, so their difference over that span is exactly −1
    // to +1 and needs no magic number at the far end to read it.
    this.uniforms.uWashTilt.value = (b - a) / (1 - WASH_SHADE)
  }

  /** Force the next `render` to run, after geometry has changed under it. */
  invalidate(): void {
    this.valid = false
  }

  get stale(): boolean {
    return !this.valid
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    // Per axis, not a bounding sphere. What the frustum has to hold is the
    // model's shadow on the plane across the heading — and a sphere big
    // enough to contain a long thin building wastes most of the map on the
    // air around its corners.
    this.bounds.getCenter(this.centre)
    const half = this.bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5)
    // How far the box reaches along any one direction. Written out rather
    // than read off an axis because two of the four headings are tilted, and
    // for those the building's height is part of its width.
    const reach = (axis: THREE.Vector3) =>
      half.x * Math.abs(axis.x) + half.y * Math.abs(axis.y) + half.z * Math.abs(axis.z)

    const previousTarget = renderer.getRenderTarget()
    const previousClear = renderer.getClearColor(new THREE.Color())
    const previousAlpha = renderer.getClearAlpha()
    const previousOverride = scene.overrideMaterial
    const previousBackground = scene.background
    scene.background = null

    const across = new THREE.Vector3(0, 0, 1)
    const up = new THREE.Vector3()
    for (const [i, side] of this.sides.entries()) {
      const heading = HEADING[i]!
      // The camera's own up: across the heading, in the plane the heading
      // is tilted in. Kept pointing at the sky, or the two tilted maps would
      // come out upside down against the two flat ones and be unreadable
      // side by side in the debug view.
      up.set(-heading.y, heading.x, 0).normalize()
      if (up.y < 0) up.negate()
      const halfAcross = Math.max(reach(across), 1) * 1.02
      const halfUp = Math.max(reach(up), 1) * 1.02
      const depth = Math.max(2 * reach(heading), 1) * 1.02

      // Softness in metres rather than in texels, so the source stays the
      // same size whatever the building's extent does to the fit.
      const soft = (i < 2 ? SOFT_METRES : THROW_METRES) / (2 * Math.max(halfAcross, halfUp))
      if (i < 2) this.uniforms.uWashSoft.value = soft
      else this.uniforms.uThrowSoft.value = soft

      const camera = side.camera
      camera.left = -halfAcross
      camera.right = halfAcross
      camera.top = halfUp
      camera.bottom = -halfUp
      camera.near = 0.1
      camera.far = depth + 10
      // Stand off against the heading and look along it.
      camera.position.copy(this.centre).addScaledVector(heading, -(depth / 2 + 5))
      camera.up.copy(up)
      camera.lookAt(this.centre)
      camera.updateMatrixWorld(true)
      camera.updateProjectionMatrix()

      camera.layers.set(0)
      camera.layers.enable(LAYER_SKYLINE)
      scene.overrideMaterial = this.depthMaterial
      renderer.setRenderTarget(side.depth)
      renderer.setClearColor(0x000000, 1)
      // Explicit, because the composer leaves `autoClear` off: without this
      // the depth attachment keeps the last frame's, the glass fails its own
      // depth test on every frame after the first, and the map goes black.
      renderer.clear(true, true, true)
      renderer.render(scene, camera)

      camera.layers.set(LAYER_GLASS)
      scene.overrideMaterial = this.transmitMaterial
      renderer.setRenderTarget(side.colour)
      // Black, not white: unlike the sun's, this map is the *source*. Where
      // there is no glass there is no window, and a hole in the wall would
      // otherwise pour unfiltered white light into the room from every
      // direction the map happens to see sky in.
      renderer.setClearColor(0x000000, 1)
      renderer.clear(true, true, true)
      renderer.render(scene, camera)

      const matrix = [
        this.uniforms.uWashMatrixA,
        this.uniforms.uWashMatrixB,
        this.uniforms.uThrowMatrixA,
        this.uniforms.uThrowMatrixB,
      ][i]!
      matrix.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    }

    this.renderLoft(renderer, scene)

    scene.overrideMaterial = previousOverride
    scene.background = previousBackground
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClear, previousAlpha)
    this.valid = true
    this.runs++
  }

  /**
   * How much of the pavement each point overhead can see.
   *
   * The two side passes answer "which window is this surface looking at",
   * and they cannot answer anything for the canopy: they run along the two
   * horizontal axes because the nave is glazed on its two long sides, and a
   * soffit faces a horizontal source edge-on. Above the clerestory heads
   * there is no opening for them to see through in any case. So the vault
   * took none of it, and was lit by a constant — measured, switching the
   * side passes off changed the canopy by nothing at all, to the byte.
   *
   * What actually lights it is underneath. A hundred metres of pale
   * polished pavement, lit through the glazing, throwing back up; every
   * soffit in the building faces it, and it is the reason the vaults
   * photograph brighter than the columns holding them up. This is that
   * source with its shadows in it — one orthographic pass straight up, so
   * a soffit over open floor is lit and a soffit behind a branch, a boss or
   * a column is not, which is the modelling the photographs are full of and
   * the model had no way to produce.
   *
   * Depth only, and the floors are left out of it: see UNDERFOOT.
   */
  private renderLoft(renderer: THREE.WebGLRenderer, scene: THREE.Scene): void {
    const { min, max } = this.bounds
    const margin = 8
    // Below everything, looking straight up. Nothing is clipped by the near
    // plane; the floors are taken out by name instead, which is exact where
    // a plane would have to guess at the height of the pavement.
    const eye = min.y - margin - 10
    const camera = this.loftCamera
    camera.left = min.x - margin
    camera.right = max.x + margin
    camera.bottom = min.z - margin
    camera.top = max.z + margin
    camera.near = 0.1
    camera.far = this.ceiling + margin - eye
    camera.position.set((min.x + max.x) / 2, eye, (min.z + max.z) / 2)
    // `up` along +z, so the map's y axis runs with the world's z and the
    // lookup in the shader is a plain multiply with no axis swap in it.
    camera.up.set(0, 0, 1)
    camera.lookAt((min.x + max.x) / 2, eye + 1, (min.z + max.z) / 2)
    camera.updateMatrixWorld(true)
    camera.updateProjectionMatrix()

    const spanX = camera.right - camera.left
    const spanZ = camera.top - camera.bottom
    this.uniforms.uLoftSoft.value = LOFT_METRES / Math.max(spanX, spanZ)
    this.uniforms.uLoftReach.value = LOFT_REACH / Math.max(spanX, spanZ)

    const hidden: THREE.Object3D[] = []
    scene.traverse((node) => {
      if (node.visible && UNDERFOOT.test(node.name)) {
        node.visible = false
        hidden.push(node)
      }
    })

    camera.layers.set(0)
    camera.layers.enable(LAYER_SKYLINE)
    scene.overrideMaterial = this.depthMaterial
    renderer.setRenderTarget(this.loftTarget)
    renderer.setClearColor(0x000000, 1)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)

    for (const node of hidden) node.visible = true

    this.uniforms.uLoftMatrix.value.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    )
  }

  /**
   * Draw one of the rig's maps over the frame, for looking at.
   *
   * `which` counts the four sides — the two flat, then the two tilted — and
   * then counts them again for their depth: 0 to 3 for a tint, 4 to 7 for
   * the occlusion behind it.
   */
  debugShow(renderer: THREE.WebGLRenderer, which: number): void {
    const side = this.sides[which % this.sides.length]!
    const texture =
      which < this.sides.length
        ? side.colour.texture
        : (side.depth.depthTexture as unknown as THREE.Texture)
    if (!this.quad) {
      this.quad = new FullScreenQuad(
        new THREE.MeshBasicMaterial({ depthTest: false, depthWrite: false, toneMapped: false }),
      )
    }
    const material = this.quad.material as THREE.MeshBasicMaterial
    material.map = texture
    material.needsUpdate = true
    this.quad.render(renderer)
  }

  dispose(): void {
    for (const side of this.sides) {
      side.depth.dispose()
      side.colour.dispose()
    }
    this.loftTarget.dispose()
    this.depthMaterial.dispose()
    this.transmitMaterial.dispose()
  }
}

export const WASH_PARS = /* glsl */ `
uniform mat4 uWashMatrixA;
uniform mat4 uWashMatrixB;
uniform sampler2D uWashDepthA;
uniform sampler2D uWashDepthB;
uniform sampler2D uWashTintA;
uniform sampler2D uWashTintB;
uniform vec3 uWashDirA;
uniform vec3 uWashDirB;
uniform float uWashSoft;
uniform float uWashBias;
uniform float uWashGain;
uniform float uWashBlur;
uniform vec2 uWashSide;
uniform float uWashTilt;
uniform vec2 uWashSun;
uniform mat4 uThrowMatrixA;
uniform mat4 uThrowMatrixB;
uniform sampler2D uThrowDepthA;
uniform sampler2D uThrowDepthB;
uniform sampler2D uThrowTintA;
uniform sampler2D uThrowTintB;
uniform vec3 uThrowDirA;
uniform vec3 uThrowDirB;
uniform float uThrowSoft;
uniform float uThrowBias;
uniform float uThrowGain;
uniform float uThrowBlur;
uniform vec2 uThrowSide;
// Per stone, not per rig: how much of the clerestory this material takes.
// Set in render/materials.ts — see THROW_SHARE there.
uniform float uThrowShare;
uniform mat4 uLoftMatrix;
uniform sampler2D uLoftDepth;
uniform float uLoftSoft;
uniform float uLoftReach;
uniform float uLoftStand;
uniform float uLoftBias;
uniform float uLoftGain;

/**
 * Irradiance from one glazed side.
 *
 * Five taps rather than twenty-five. The kernel is standing in for the
 * angular size of a sky, which is a smooth thing, and a cross of five samples
 * two texels apart blurs a 1 m lancet at this fit about as well as a full
 * square does — for a fifth of the fetches, in a shader that is already
 * sampling two shadow maps for the sun.
 */
vec3 sfWashFrom(
  const in sampler2D depthMap,
  const in sampler2D tintMap,
  const in mat4 matrix,
  const in vec3 heading,
  const in float soft,
  const in float bias,
  const in float blur,
  const in vec3 shadingNormal,
  const in vec3 world
) {
  // The light travels along the heading, so a surface lit by it faces back up.
  float facing = dot( shadingNormal, -heading );
  if ( facing <= 0.0 ) return vec3( 0.0 );

  vec4 clip = matrix * vec4( world - heading * bias, 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;
  if ( coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0 ) {
    return vec3( 0.0 );
  }

  // Only glass in front of this point may be the window it is lit by. Behind
  // it there is a wall, and a wall is not a light.

  vec2 o = vec2( soft, 0.0 );
  float lit =
    step( coord.z, texture2D( depthMap, coord.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy + o.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy - o.xy ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy + o.yx ).x ) +
    step( coord.z, texture2D( depthMap, coord.xy - o.yx ).x );
  if ( lit <= 0.0 ) return vec3( 0.0 );

  // Black here means no glass on this ray, which is the same statement as
  // no window — so the map needs no companion depth test to say it.
  vec3 tint = textureLod( tintMap, coord.xy, blur ).rgb;

  return ( lit * 0.2 ) * tint * facing;
}

/**
 * Both glazed sides, in world space, each worth what the hour makes it.
 *
 * The weights are the only thing here the clock touches, they average to one
 * — see WASH_SHADE — and their whole effect is that the two walls stop being
 * interchangeable. Which matters because they are not the same colour: the
 * Passion side is glazed amber and red and the Nativity side green and blue,
 * and a sum that always took half of each gave the same mixture to every
 * surface in the building at every hour of the day.
 */
vec3 sfWash( const in vec3 shadingNormal, const in vec3 world ) {
  return uWashGain * (
    uWashSide.x * sfWashFrom(
      uWashDepthA, uWashTintA, uWashMatrixA, uWashDirA,
      uWashSoft, uWashBias, uWashBlur, shadingNormal, world
    ) +
    uWashSide.y * sfWashFrom(
      uWashDepthB, uWashTintB, uWashMatrixB, uWashDirB,
      uWashSoft, uWashBias, uWashBlur, shadingNormal, world
    )
  );
}

/**
 * The clerestory, throwing up and inward — the canopy's second source.
 *
 * The same read as sfWash, along a heading tilted fifteen degrees above
 * horizontal — see THROW_TILT — which is the only line that gets in at the
 * clerestory head, out over the aisle roof behind it, and onto the vault.
 * A soffit is edge-on to the horizontal pair and takes nothing from them;
 * tilted, the dot product turns positive for anything whose face has a
 * downward component, which is the whole canopy — and every upright face
 * that can see a clerestory, at four times the canopy's cosine, which is why
 * only the vault's own stone takes it. See THROW_SHARE in materials.ts.
 *
 * Where the floor's light is one broad tone from underneath, this arrives
 * from a particular window and carries its colour and its pattern — the gold
 * band running along one flank of a vault while the other flank stays pale is
 * this, and it is not something a term with no direction in it can produce.
 */
vec3 sfThrow( const in vec3 shadingNormal, const in vec3 world ) {
  // The canopy's light and nobody else's — see THROW_SHARE in materials.ts.
  if ( uThrowShare <= 0.0 ) return vec3( 0.0 );
  return uThrowShare * uThrowGain * (
    uThrowSide.x * sfWashFrom(
      uThrowDepthA, uThrowTintA, uThrowMatrixA, uThrowDirA,
      uThrowSoft, uThrowBias, uThrowBlur, shadingNormal, world
    ) +
    uThrowSide.y * sfWashFrom(
      uThrowDepthB, uThrowTintB, uThrowMatrixB, uThrowDirB,
      uThrowSoft, uThrowBias, uThrowBlur, shadingNormal, world
    )
  );
}

/**
 * How much of the floor this point can see — the light from below.
 *
 * Nine taps rather than five, and spread four and a half metres rather than
 * one. The floor is not a window: it is the whole plan of the building seen
 * from a soffit forty-five metres up, so what a branch casts on the vault
 * over it is a broad darkening with no edge anywhere in it. A five-tap
 * cross at the window's spacing gives a hard-edged shadow of a branch,
 * which is what a point source does and is nothing like a floor.
 *
 * And it is a plane, not a lamp underneath. What a surface takes from an
 * infinite plane below it is ( 1 - n.y ) / 2 — all of it for a soffit, which
 * sees nothing else; exactly half for anything standing upright, which has
 * floor across half its sky; none for a face turned at the vault. The cosine
 * against straight down is the answer for a *point* directly beneath, and
 * for every vertical surface in the building that answer is zero. Which is
 * how the columns came to take nothing at all from the largest, palest,
 * best-lit surface in the room while the vault above them took all of it.
 */
float sfLoft( const in vec3 shadingNormal, const in vec3 world ) {
  // ( 1 - n.y ) / 2, split where the confidence splits. The first term is
  // the floor directly beneath — a cosine against straight down, which is
  // what this map is an exact answer for. The second is the rest of the
  // plane, out to the horizon, which is what a standing face is mostly lit
  // by and what nine taps across nine metres can say the least about: at
  // forty metres the floor of this room is behind a colonnade, and the
  // kernel has no way to know. Held at one the two sum to the infinite
  // plane exactly; uLoftStand is how much of that horizon is believed.
  float facing = max( 0.0, - shadingNormal.y )
    + uLoftStand * ( 1.0 - abs( shadingNormal.y ) ) * 0.5;
  if ( facing <= 0.0 ) return 0.0;

  // Toward the source, which is straight down.
  vec4 clip = uLoftMatrix * vec4( world - vec3( 0.0, uLoftBias, 0.0 ), 1.0 );
  vec3 coord = clip.xyz / clip.w * 0.5 + 0.5;

  // And a standing face asks a different question from a soffit — see
  // LOFT_REACH. It asks about the floor it faces, three metres out along
  // its own heading and three metres across, where a soffit asks about the
  // nine metres directly beneath it. Asked the soffit's question, a shaft
  // reports on the floor under its own feet, which its own footprint
  // blocks, and on the next bay in every direction, which it cannot see.
  // The map's u runs with world x and its v with world z, so the step out
  // is the heading itself; a soffit has no heading and does not move.
  float upright = 1.0 - abs( shadingNormal.y );
  coord.xy += shadingNormal.xz * uLoftReach;
  if ( coord.x < 0.0 || coord.x > 1.0 || coord.y < 0.0 || coord.y > 1.0 || coord.z > 1.0 ) {
    return 0.0;
  }

  float spread = mix( uLoftSoft, uLoftReach, upright );
  float lit = 0.0;
  for ( int j = -1; j <= 1; j ++ ) {
    for ( int i = -1; i <= 1; i ++ ) {
      vec2 tap = coord.xy + vec2( float( i ), float( j ) ) * spread;
      lit += step( coord.z, texture2D( uLoftDepth, tap ).x );
    }
  }

  return uLoftGain * ( lit / 9.0 ) * facing;
}
`
