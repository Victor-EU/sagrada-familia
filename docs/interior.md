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

## The vault was lit by a constant, and now it is lit by the floor

*Second pass, same day.*

The canopy came out of the work above still wrong, and wrong in a way no
grading could reach. Measured on a frame under the crown, switching the
glazing's shadowed rig off changed the vault by nothing whatsoever — 92 73
54 before and after, to the byte — and ambient occlusion moved it by four
parts in 255 at any radius from three metres to nine. It had one tone.

The reason was structural. The wash rig runs along the two horizontal axes,
because the nave is a long room glazed on its two long sides — and a soffit
faces a horizontal source edge-on, so `dot(n, −heading)` is zero over the
whole canopy. Above the clerestory heads there is no opening for those rays
to pass through in any case. Every ray the rig cast at the nave vault was
stopped by the wall below it, and what was left standing in for the light
was `uRoomFloor`: one number, the same for a soffit over open pavement and
a soffit tucked behind a branch.

### Tilting the existing rig does not work

The first idea was to lean the two headings upward, which costs nothing.
It does not survive the arithmetic. Traced back from a column flank at ten
metres, a heading tilted thirty degrees leaves the building below ground —
the ray that lights that flank enters the far wall at y = −3 — so every
column in the room goes dark to buy the vault. Light that lands on a
downward-facing surface has to be travelling *upward*, and there is no
upward-travelling light from a window.

### What actually lights the canopy is the floor

A hundred metres of pale polished pavement, lit through the glazing, and
every soffit in the building faces it. That is why the vaults photograph
brighter than the columns holding them up, and it is a source that can be
rendered exactly: **one orthographic pass straight up**.

The map is depth only — what is overhead is not glass — and the floors are
left out of it by name, the way `roof.ts` excludes the porches. A camera
under the building looking up meets the pavement before it meets anything
else, so left in, the floor shadows the whole building from its own light
and the map comes back black. The plaza needed a name to be excluded by;
it now has one.

A receiver asks the map whether anything stands between it and the floor.
Nine taps spread four and a half metres, because the floor is not a window:
a soffit forty-five metres up sees nearly the whole plan at once, so what a
branch casts on the vault above it is a broad darkening with no edge in it.
The cosine is `max(0, −n.y)`, which is the whole of the term and also a
free early-out: a vertical surface takes nothing and pays nothing.

The colour is the floor's own — the room's gold carrying a quarter of
whichever half of the church is overhead, so the canopy over the Passion
aisle is warm at four in the afternoon and the canopy over the Nativity
aisle is not. At a half the branch undersides came back terracotta, which
is the glazing's colour and not the pavement's.

### What it bought

| | before | after |
| --- | --- | --- |
| Canopy, mean luminance | 41.3 | 59.3 |
| Canopy, response to its own light source | none, to the byte | ×1.44 |
| Vault ÷ column, measured by surface | — | 1.66 |
| Vault ÷ column, in the photograph | — | 1.50 |
| `uRoomFloor`, the constant it replaces | 4 | 0.7 |

The surface figures are taken by blacking out every albedo except the one
being measured and reading the frame back — there is no global illumination
here, so a black neighbour changes nothing about how the kept stone is lit.
That also settled a number this README had been quoting wrongly: the real
nave does **not** run its vault 2.4 times its columns. Measured on
`in-nave-axial-canopy`, vault patches at 50 and 116 against column patches
at 71 and 40 give 1.50, and the render now sits at 1.66.

The canopy has light and shade in it for the first time: the star plates
read, the funnel throats go deep, and a branch darkens the vault above it.
The frame under the crown holds at 2.5 per cent dark and 4.7 contrast while
its saturation goes to 0.46, which is the level that used to turn the
ceiling terracotta when it was applied flat. Colour stops being a stain
once there is modelling underneath it.

The loft pass runs once per rebuild, not per frame.

### Still open

The columns read darker than a bright midday photograph shows them, though
they match the author's own December frames, which are the ones with the
minute-accurate sun. And the canopy takes the floor's light but not the
clerestory's: light entering a window and travelling up-and-inward off a
sunlit aisle roof is real, and is not modelled. Both are smaller than what
was fixed.

---

# The floor is a plane, and the clerestory throws up

*Third pass, 21 September 2026, against the two items left open above.*

## The columns were dark because the floor could not reach them

The instrument for "too dark" cannot be the column's own brightness,
because that moves with the exposure. It is the column's brightness
**divided by the frame's median**, which does not:

| | photograph | render, before |
| --- | --- | --- |
| Pale shaft, `in-nave-axial-canopy` | 1.15 | — |
| Left porphyry shaft, same frame | 0.98 | — |
| Right porphyry shaft, same frame | 0.86 | — |
| All column stone, under the crown | — | 0.81 |
| All column stone, down the nave | — | 0.61 |

A quarter to a third short, on every interior viewpoint, and the saturation
too high to match — 0.42 where the photographs give 0.32 to 0.35.

The cause was one line in the pass written the round before. `sfLoft`
weighted the floor's light by `max(0, −n.y)`: the cosine against straight
down. That is the right answer for a lamp directly underneath and the wrong
one for a floor, and the difference is not small. What a surface takes from
an **infinite plane below it** is

    ( 1 − n.y ) / 2

— all of it for a soffit, which sees nothing else; exactly **half** for
anything standing upright, which has floor across half its sky; none for a
face turned at the vault. The old term gave a vertical surface *zero*. So
the largest, palest, best-lit surface in the building lit the vault and lit
nothing that stood on it, and four hundred columns were left with the
windows alone.

Worth checking what else was keyed to up-or-down while this was being
looked at: `uRoomFloor · max(0,−n.y) + uRoomSky · max(0,n.y)`, the flat
term for light that has bounced more than once, is **also** zero at
`n.y = 0`. Every term in the model that stood for "the room" skipped the
one orientation the room is mostly made of.

### The half is split, because half of it is a guess

    facing = max( 0, −n.y ) + uLoftStand · ( 1 − |n.y| ) / 2

The two sum to the infinite plane exactly. The first is the floor directly
beneath, which this map answers precisely. The second is the rest of the
plane out to the horizon — most of what a standing face is lit by, and the
part a nine-tap kernel nine metres across can say the least about, because
at forty metres the floor of this room is behind a colonnade and the kernel
has no way to know. `uLoftStand` is 0.45: the horizon discounted, the floor
underfoot not.

A standing face also asks a **different question** from a soffit. Straight
down from a shaft is the shaft's own footprint, which the map correctly
reports as blocked — by the column. So the lookup steps three metres out
along the face's own heading, and takes its nine taps three metres apart
rather than four and a half, because a shaft is lit by the aisle it faces
and not by the next bay in every direction. Both are zero for a soffit,
which has no heading, so the canopy is untouched.

Stepping out three metres inside a kernel nine metres wide is no step at
all — measured, it moved the frame by two per cent. Tying the spread to the
same number is what makes the step mean anything.

### And the floor's colour is not the same for both

The floor's light carries the room's gold and a quarter of whichever half
of the glazing is overhead. Given to a column unchanged, that puts the
building's colour straight back onto the one surface the photographs insist
is neutral — the same inversion this document opens with, arriving by a new
route. Measured: column saturation went from 0.43 to 0.63, worse than
before the first pass.

A soffit hangs over one bay and takes that bay's colour. A shaft stands
*in* the floor's plane, so what it sees is a hundred metres of pavement at
a grazing angle — both halves of Vila-Grau's scheme at once, and the far
end of the nave as well — and the average of all of it is very nearly grey.
`uLoftPool` at 0.85 pools a standing face's floor light toward its own
luminance on that argument, and leaves a soffit's alone.

### And the constant it replaces had to give the light back

`uRoomGlass`, the flat lateral fill, was at 0.8 — a number fitted when the
floor could not reach a column at all, so most of what it was worth on a
shaft was never the window. Left there, the room was lit twice: the frame
went half a stop up and its contrast from 5.8 to 2.9, which is the failure
this document already records twice under other names. It is now 0.3, which
is what is left once the pavement is a term of its own. What that 0.3 still
does is the near-wall-to-far-wall gradient, which is this term's alone.

One thing that was tried and reverted: folding the floor's visibility into
`covered`, the factor that fades the flat fill where the rig supersedes it.
That reads well and is wrong. The fill and the rig are two accounts of the
same light, so one replaces the other; the floor and the window are two
different lights that add. Told otherwise, the fill went to nothing on
every surface in the building and took the shaft gradient with it —
`uRoomGlass` switched off changed the frame by 0.1 per cent.

## The canopy was lit from below, and the clerestory is also below it

The second item. The canopy had the floor and nothing else, so every facet
of a twenty-facet fan came back the same tone: the floor's light does not
know which way a soffit faces beyond `n.y`, and neither does the flat fill,
and neither does the probe. Colour applied to that is paint, which is
exactly what "past four tenths it becomes a terracotta ceiling" describes.

The fix is the wash rig with its heading **tilted up**, which the round
before had rejected — rightly, for the wrong reason. Tilting the *existing*
pair robs the columns. Adding a second pair costs two more renders per
rebuild and takes nothing from anything.

### Fifteen degrees, measured rather than chosen

The first build of this was set at thirty-eight degrees, from the glazing's
bounding boxes and an assumed vault height, and contributed **nothing at
eighty times its gain**. Casting rays up through the model and writing down
what they hit gives the real figures:

| | |
| --- | --- |
| Central-vessel clerestory | x = ±8.1, y 33 → 41 |
| Nave vault soffits | y ≈ 36 → 42, across x ∈ [−8, 8] |
| Aisle roof outside | y = 31.7, from x = 10 outward |

The clerestory is not below what it lights. It is level with it, and the
light crosses the sixteen metres between the two walls climbing only a few.
Steeper than about twenty degrees and the ray leaves the vault behind and
lands on the terrace above it; shallower than about ten and it arrives
under the springing, or has to come up through the aisle roof to get in.
Fifteen enters the upper half of the clerestory, crosses to the far
soffits, and on the way out clears the aisle roof by five metres.

### What the hour does to it

The rest of this rig does not know where the sun is, on purpose: a window
is a hundred square metres of *sky*, and the sky is there all day. The
tilted pair is the one place that will not do, and the photographs say so
flatly. At half past one in December the canopy over the Passion wall is
gold from one end to the other, and there is not a square metre of green on
it — while the model, throwing equally from both clerestories, put
mint-green blooms across the whole vault. What the sunlit side has and the
shaded side has not is the aisle roof underneath it.

So each tilted pass carries a weight — a dot product between the sun and
the wall it enters through, floored at `THROW_SHADE` = 0.1, because a
shaded clerestory still has the whole northern sky in front of it. No map
is rebuilt when the hour moves; only the weight on two of them.

### What it bought, and what it cost

Measured on identical frames with the terms switched in and out:

| under the crown | before | after | photograph |
| --- | --- | --- | --- |
| Column ÷ frame median | 0.81 | **0.90** | 0.86 – 1.15 |
| Column saturation | 0.417 | **0.321** | 0.32 – 0.35 |
| Vault ÷ column | 1.86 | **1.47** | 1.24 – 1.65 |
| Frame median | 0.192 | 0.231 | 0.12 – 0.46 |
| Frame contrast, p95 ÷ p5 | 5.8 | 4.2 | 5.3 – 37.7 |

| down the nave | before | after |
| --- | --- | --- |
| Column ÷ frame median | 0.61 | **0.73** |
| Column saturation | 0.387 | **0.320** |
| Vault ÷ column | 2.53 | **1.97** |

Three instruments into the photographs' range on the axial frame, and the
two column figures improved on every interior viewpoint. The frame is a
quarter-stop brighter and its contrast is down by a quarter — the two are
the same fact, since p95 ÷ p5 falls when fill is added, and at a matched
median the contrast comes back to 5.1. The median stays inside the band the
photographs occupy, so the exposure was left where the December frames put
it.

Exterior frames are unchanged to three decimal places on every viewpoint
tested — the fill these terms feed is gated by `sfSheltered`, so a stone
standing outside never sees any of it. The rig still renders once per
rebuild, four passes now instead of two. The added per-fragment cost is
below the noise floor of a timing loop on this machine.

### What the throw is actually worth

Not brightness: about five per cent of the canopy's mean. What it is for is
that the canopy had no *direction* in it, and now a facet can face the
clerestory or turn away from it. That is the difference between the two
frames of the vault wash in `reference/.shots` — one is a single terracotta
tone with the volumetric shafts crossing it, the other has form.

Two things were got wrong on the way there and are worth recording.
Exempting the throw from the wash's desaturation, on the argument that a
soffit forty metres up has no pale neighbour to mix its window with: it
does, it is the floor, and the exemption turned facets teal on a frame
whose photograph is gold throughout. And driving the gain by the vault's
p99 ÷ median spread until it matched the photographs' 2.1 — which reached
the number at a gain that makes the canopy a printed stencil of the window
rather than a wash. The measurement was right and the population was wrong.

### Still open

One thing, and it is the same fault one level out. The **horizontal** pair
is still blind to the hour, so at half past one in December the shaded
Nativity glazing washes column flanks and vault facets as strongly as the
blazing Passion glazing opposite, and they come back cooler than any
photograph of that hour shows. The tilted pair now has a weight for exactly
this. Giving the flat pair the same one is a line of code and a
recalibration of the whole room, because that rig carries most of the
interior's light.
