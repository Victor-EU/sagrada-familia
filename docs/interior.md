# The colour was on the stone and not in the light

*Review and rework, 21 September 2026, against ten interior photographs —
the author's own December frames and six from the reference folder. The
brief was three words: columns, light, colour.*

The interior did not give the wow the photographs give, and the reason was
not that anything was missing. Every piece of machinery the room needs was
already built — coloured transmittance through the glazing, a shadowed
wash rig for the windows as an area source, volumetric air, ambient
occlusion, a film with a grade on it. The fault was in how much each of
them was allowed to contribute, and in one inversion that put the building's
colour on exactly the wrong surfaces.

## How this was looked at

Ten photograph–render pairs, matched frame for frame off the curated
viewpoints, measured over the whole frame and then over named boxes on a
column shaft and on the vault above it. Five instruments, all on the
delivered eight-bit frame, because what is being judged is the picture:

1. **Median luminance**, and the share of the frame under 8 % and over 85 %.
2. **Contrast**, as the ratio of the 95th to the 5th percentile luminance.
3. **Saturation**, mean over the frame and over the midtones alone.
4. **Named boxes** — a lit shaft, a shaded shaft, two patches of vault — as
   mean RGB, so hue and saturation can be compared to a photograph's.
5. **Term ablation**: each light in the model switched off in turn, on a
   settled frame, to find out what each is actually worth.

The fifth one is where the answer was.

## What the instruments said

### The colour was on the columns and not on the vault

| | photograph | render, before |
| --- | --- | --- |
| Column shaft, saturation | 0.046 to 0.28 | 0.55 to 0.70 |
| Vault, saturation | 0.51 to 0.87 | 0.21 to 0.31 |
| Glazing, saturation | 0.55 to 0.94 | 0.00 to 0.53 |
| Frame over 85 % luminance | 1.1 to 6.9 % | 0.0 % |
| Frame under 8 % luminance | 1.4 to 18.8 % | 0.0 to 2.1 % |
| Contrast, p95 ÷ p5 | 4.7 to 20.3 | 2.3 to 4.0 |

The granite shaft in `in-column-shaft-twist` reads 90 87 83 — a warm grey
at eight per cent saturation. The same shaft rendered 106 60 33, chocolate
at sixty-nine. Meanwhile the canopy overhead, which every photograph shows
as a field of gold, rendered as white plaster.

This was not the albedo and it was not the film. Swept live in the browser:
every interior stone set to a neutral grey, the film set to a flat
response, both glass tints set to white, the sun switched off entirely and
the occlusion switched off — and the columns stayed brown while the vault
stayed white through all of it.

It was one line. A sideways-facing surface had its window light computed as
`mix(uRoomBounce, glass, uGlassShare)` with the share at 0.26, so three
quarters of everything lighting every column in the building was the
constant amber of `ROOM_LIGHT`, whatever colour the glass was and whether
or not any light was arriving through it. Downward-facing surfaces took the
sky probe instead. The building's two great surfaces had their colours
exchanged.

The fix is that a shaft's fill is mixed toward **white**, not toward the
room's gold, and the gold is left to the faces that look at the floor and
the canopy — which is where the photographs put it.

### One flat number was the whole of the light

Ablation on a frame looking down the nave, each term switched off in turn:

| term switched off | median | under 8 % | saturation | contrast |
| --- | --- | --- | --- | --- |
| nothing — as it stood | 0.307 | 0.0 % | 0.301 | 2.3 |
| the glazing's shadowed wash rig | 0.307 | 0.0 % | 0.299 | 2.3 |
| ambient occlusion, 0.55 → 0.9 | 0.306 | 0.0 % | 0.302 | 2.3 |
| the hemisphere | 0.307 | 0.0 % | 0.301 | 2.3 |
| the volumetric air | 0.299 | 0.0 % | 0.281 | 2.4 |
| **the flat window fill** | **0.248** | **28.0 %** | **0.478** | **106.9** |

Everything except the last row is a rounding error. `uRoomGlass` at 2.8 —
one unshadowed, distance-invariant, pattern-free constant — was the entire
illumination of the interior, and the carefully built rig that knows where
the windows are, casts their shadows and carries their pattern was
contributing two thousandths of a saturation point underneath it.

A room lit by a constant has no shape in it. That is the plainest available
statement of why the interior had no wow, and it is the same mistake the
README already records for `uRoomGain` — made once, fixed, and then
reintroduced under a different name.

The flat fill is now 0.9 and the wash rig's gain is 9. Swept across that
trade, a frame down the nave moves from 2.3 to 5.8 on contrast and 0.30 to
0.38 on saturation, and gets its blacks back.

### The columns were corrugated, not round

The indoor fill asked which way a face pointed and handed a face turned
along the nave 0.16 against a face turned across it 1.15 — a ratio of
seven to one. A twisted shaft's flutes alternate between those two answers
face by face, so a twenty-four-sided column came back as a stack of bright
and dark stripes: bark, not stone. The photographs have a shallow ripple
riding on one broad gradient from the lit flank to the shaded one, and it
is the gradient that says the thing is a cylinder.

Three changes. The along-the-nave figure is 0.7, so the ripple is under two
to one. The gradient is now built rather than absent: a face is asked how
far it is from the wall it faces as well as which way it points, so the
flank turned to the near glazing is twice the flank turned to the far one.
And above the plinth the exact crease normals are leaned half way toward
the radial, ramped in over the first twist stage, so the star at the foot
keeps its edges while the fluting above reads as a round thing with creases
in it.

## What else was built

- **The lucernaris.** Every branching knot in the real building carries an
  oval of lit alabaster, they are the only light at column height, six of
  the ten reference photographs have a dozen in shot, and the model had
  none. Three of them to a knot, half sunk into the stone, on the knots that
  are at least six tenths of their tree's largest. Built twice wrongly
  first: a bright collar round the knot's waist reads as a bangle from every
  angle, and six hundred bangles at a radiance of 4.2 lifted every interior
  frame so far that the saturation of the whole model halved.
- **The windows are bimodal.** Every pane used to sit at one lightness, so
  every pane crossed the film's white point together — which is why the
  gain had to be held at 1.7, and why no window in the building was ever
  the brightest thing in it. A tenth of the quarries are now near-clear and
  clip; the rest are deep and keep their hue at the same exposure. The gain
  is 6 and the frame finally has 0.3 to 0.9 per cent of itself blown, where
  the photographs have 1.1 to 6.9.
- **The leading is not a grid.** A lancet's panes were a regular array of
  identical rectangles, which reads as pixel art. Its interior grid nodes
  now wander and its edge nodes do not, so the cames stay a continuous net
  and every quarry is a slightly different quadrilateral.
- **A shaded window is still a window.** From the room, a pane the sun was
  not behind was handed the *outdoor* value — a fifth of the lit one — so
  at four in the afternoon the entire Nativity wall was a field of dark
  tiles while the Passion wall blazed. Every photograph has both walls lit
  at once. It is now 0.45 of the sunlit value, which is what the shaded wall
  measures in `in-glazing-nativity-side`.
- **The inside of a wall is not coursed.** The masonry shader draws
  four-hundred-millimetre courses in running bond, which is a claim about a
  weathered outside wall; the two stones that carry it have a face on each
  side, and the nave was lined in brickwork. The roof map already answers
  which side of a wall a fragment is on, so the laying, the block-to-block
  tone and the weather now fade to a tenth on the inner face.
- **The canopy is calmer.** Sixteen pleats at 0.16 of the local radius on
  every funnel, boss and branch tip left no flat surface anywhere in the
  vault; the eye could not find the 7.5 m cell. Halved.
- **The air was a slab when you turned to face the sun.** The phase function
  peaks at six times isotropic at g = 0.5 and falls to a third behind, so a
  frame looking toward the sun gets eighteen times the scattering the
  density was tuned for — on the December frame across the nave, the air in
  the left of the picture was a featureless sheet at 178 of 255, brighter
  than any stone in the building. At g = 0.35 the swing is six to one and
  the frames looking across the sun measure the same to three decimals.
- **The march dithers less.** Each ray starts at its own offset into its
  first step, worth three and a half metres over a hundred-metre ray, and
  the reconstruction was two taps wide — narrower than the dither's own
  period, so the pattern was resolved rather than averaged. Sixteen taps and
  forty-eight steps take the high-frequency residual on the worst frame in
  the harness from 2.05 to 1.94.

## Where it landed

Whole-frame figures, photograph against render, after:

| frame | median | under 8 % | over 85 % | saturation | contrast |
| --- | --- | --- | --- | --- | --- |
| down the nave, photograph | 0.46 | 2.0 % | 6.9 % | 0.24 | 4.7 |
| down the nave, render | 0.22 | 2.1 % | 0.3 % | 0.40 | 4.8 |
| canopy, photograph | 0.38 | 1.4 % | 2.6 % | 0.41 | 6.1 |
| canopy, render | 0.19 | 1.5 % | 0.3 % | 0.46 | 4.7 |
| vault wash, photograph | 0.17 | 18.8 % | 1.1 % | 0.90 | 20.3 |
| vault wash, render | 0.31 | 1.4 % | 0.0 % | 0.53 | 4.5 |
| Passion wall, photograph | 0.25 | 11.1 % | 2.6 % | 0.62 | 12.0 |
| Passion wall, render | 0.33 | 0.9 % | 0.6 % | 0.24 | 6.3 |

The two axial frames are close on every instrument. The two December wall
frames are not: they are still too bright, too flat and half as saturated
as they should be, and they have one cause in common with the canopy.

## The one thing left, and it is the big one

**The vault is lit by a constant, and nothing reaches it.** Measured on a
frame under the crown, switching the glazing's shadowed rig off changes the
vault by nothing whatsoever — 92 73 54 before and after, to the byte — and
ambient occlusion moves it by four parts in 255 at any radius from three
metres to nine.

The reason is structural. The wash rig runs along the two horizontal axes
because the nave is a long room glazed on its two long sides, and a soffit
faces a horizontal source edge-on and takes nothing from it; above the
clerestory heads there is no opening for it to see in any case, so every
ray it casts at the nave vault is stopped by the wall below. The real
canopy is lit from underneath — by the clerestory throwing up and inward,
and by a hundred metres of pale pavement — and neither of those is in the
model.

So the canopy has exactly one tone, and colour can only be added to it
flat. At four tenths saturation it is pale stone under gold light; pushed
to the 0.55 the photographs measure it stops being lit stone and becomes a
terracotta ceiling. `ROOM_LIGHT` is parked at the first of those.

Until the vault has a source with shadows in it, no amount of grading fixes
the canopy — and the canopy is a sixth of every frame taken inside this
building.
