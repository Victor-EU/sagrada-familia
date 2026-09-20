# The outside is flat, not plain

*Review, 20 September 2026, after the seven steps of `exterior.md` landed.
The building still reads as a maquette from the plaza. This is a second look
with sharper instruments, and it finds a different fault from the first one.*

The last round assumed the exterior read as a museum model because its
**surface** was wrong: one stone instead of five, no courses, no weather, no
middle-scale light. All of that was true, all of it was fixed, and the
surface is now right — measurably right, as below. The building still reads
as a casting. So the assumption was incomplete.

## How this was looked at

Eight exterior frames off the harness — `m` `n` `x` `u` `f` `t` `g` `6` — each
shot after the eye had settled, at the viewpoint's own hour, against five
reference photographs cropped to the matching framing. Four instruments, all
run over the stone only: the sky is flood-filled from the top edge of the
frame and removed, so nothing below is diluted by however much blue is in
shot.

1. **Contrast per octave.** The image is normalised by its own median so
   brightness cannot confound it, then split into difference-of-Gaussian
   bands at 1, 2, 4, 8, 16, 32 and 64 pixels. The standard deviation in each
   band says how much of the picture's structure lives at that size.
2. **Where the pixels sit.** The share of stone below 8 % luminance, below
   15 %, above 60 %, and the median.
3. **Which way a surface reads.** Mean |∂x| against mean |∂y|. A lattice is
   near 1.0; a stack of rings is low.
4. **Blank fields.** The share of stone whose local contrast over a 9-pixel
   window is under 2 %, and — the useful half — the median tone of that
   share.

## What the instruments say

### The fine octaves are fine. The coarse ones are empty.

Contrast held in each octave, as a percentage of the frame's own median:

| | <1px | <2px | <4px | <8px | <16px | <32px | <64px |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **photo** passion porch | 8.96 | 7.06 | 8.55 | 11.09 | 13.10 | 13.91 | **16.56** |
| **render** `x` porch | 7.04 | 5.75 | 8.19 | 8.07 | 7.06 | 7.58 | **7.63** |
| **photo** nativity belfry | 10.47 | 8.37 | 8.43 | 10.03 | 13.67 | **15.49** | 13.95 |
| **render** `m` belfry | 4.06 | 7.33 | 9.63 | 10.74 | 11.29 | **11.17** | 11.70 |
| **photo** towers from below | 12.19 | 7.91 | 8.98 | 9.96 | 9.34 | 9.99 | 9.83 |
| **render** `n` plaza | 12.02 | 10.76 | 10.40 | 10.01 | 10.68 | 10.50 | 10.98 |
| **photo** flank, street | 17.91 | 10.39 | 9.77 | 9.03 | 8.81 | 9.03 | 6.89 |
| **render** `f` street | 10.70 | 9.19 | 9.25 | 8.07 | 9.20 | 6.88 | 7.27 |

Read the first octave first. At one pixel the render is 12.02 against the
photograph's 12.19, 7.04 against 8.96, 10.47 against 4.06 the other way on the
belfry. **The masonry, the grain and the weathering are doing their job.**
Nothing in this review asks for more of them.

Now read along the rows. In the two close frames the photograph's spectrum
*rises* toward the coarse end — 8.96 climbing to 16.56, 10.47 climbing to
15.49 — and the render's is flat: 7.04 to 7.63, and 4.06 to 11.17. In a frame
taken from the pavement, 16 to 64 pixels is somewhere between one and a half
and eight metres of building. That is the size of a porch, a cornice, a
column and the shadow it throws, a window reveal, the gap between two towers.

The render has detail at the scale of the block and at the scale of the
tower, and almost nothing in between.

### There is no dark in it.

Share of stone in each part of the tone scale:

| | below 8 % | below 15 % | above 60 % | median |
| --- | --- | --- | --- | --- |
| **photo** passion porch | 15.1 % | 31.6 % | 39.7 % | 105 |
| **render** `x` porch | **0.3 %** | 4.1 % | **56.2 %** | **160** |
| **photo** towers from below | 3.3 % | 8.9 % | 3.4 % | 93 |
| **render** `n` plaza | 6.4 % | 9.1 % | **35.2 %** | 90 |
| **photo** plaza, nativity | 9.0 % | 21.8 % | 6.2 % | 67 |
| **render** `m` pond | 13.3 % | 18.4 % | **18.8 %** | 75 |
| **photo** flank, street | 0.9 % | 5.1 % | 21.7 % | 115 |
| **render** `f` street | 3.6 % | 5.3 % | **49.3 %** | **151** |

The last column but one is the same story in all four pairs and it is not
close: the render puts between one and a half and ten times as much of the
building above 60 % luminance. On the two December frames it also sits 40 and
50 points high in the median. On the porch frame the photograph has 15.1 % of
its stone in near-black and the render has **0.3 %**.

### When a surface is blank, the photograph's is black and the render's is white.

| | blank field | its median tone |
| --- | --- | --- |
| **photo** passion porch | 27.1 % | **29** |
| **render** `x` porch | 14.4 % | **169** |
| **photo** terraces | 22.5 % | 136 |
| **render** `t` terraces | 30.5 % | **189** |

This is the whole review in one table. Both pictures have large areas with
nothing happening in them. In the photograph those areas are empty because
they are in shadow — the underside of the canopy, the back of the porch, the
slot between two towers. In the render they are empty because they are a lit
plane with nothing on it.

### The Passion belfry reads as a stack of rings.

Mean vertical-line energy against horizontal:

| | V : H |
| --- | --- |
| **photo** nativity belfry | 1.07 |
| **photo** passion belfry | 1.00 |
| **render** `m` nativity belfry | 0.95 |
| **render** `x` passion belfry | **0.67** |
| **render** `u` passion belfry | **0.64** |

Both photographs read as a true lattice, equally strong in both directions.
The Nativity tower in the model matches. The Passion tower does not: its rows
run round the shaft unbroken and the rib between channels is not proud enough
to interrupt them, so it reads as something turned on a lathe. This is a
specific, local fault, not a general one.

### The setting is a hundred blank boxes.

From the scene census:

| | |
| --- | --- |
| city massing | ~100 boxes, 1 446 m across, 32 m tall, 7 956 triangles, no windows |
| trees | 81, trunk 3.4 m, canopy 9.5 m |
| lamp posts | 27 |
| pond | one flat disc, 48 triangles |
| cranes | none |
| Passion portico | 1 500 triangles |
| Nativity crust | 33 072 triangles |

Sky is 71.4 % of the plaza frame against the photograph's 51.5 %, and 60.9 %
of the street frame against 50.2 %. **Not one render frame has anything in
front of the building.** Every reference frame does: branches across the top,
a parked car, a kerb, a bin, a crane leg.

## The diagnosis

The surface is right and the **relief** is missing. There is nothing on this
building that projects far enough to throw a shadow on the thing behind it,
so there is no dark anywhere; and with no dark, the picture collects in the
top half of the tone scale, which is exactly what a plaster casting under
gallery light looks like.

The fill light makes it worse rather than causing it. `uSkyFill` at 2.1 lifts
every face that can see sky, and the ambient occlusion radius is 3 m — it
covers the joint and the boss and stops well short of the porch. The
analytic tower occlusion added last round covers 20 to 100 m. Between 3 and
20 m nothing is occluding anything, which is the same octave the spectrum
says is empty. The light has no middle scale because **the geometry has no
middle scale to cast one**.

## Why a maquette looks like a maquette

Three reasons, and the three measurements land on them one for one.

1. **A maquette is cut down from the massing.** Whatever was too fine to carve
   at the model's scale was left off, so it keeps the big shape and loses the
   projections. → the flat spectrum.
2. **A maquette is lit evenly, from a room.** Nothing in a vitrine is in deep
   shade, because there is fill from every direction. → 0.3 % below 8 %.
3. **A maquette stands on a base in an empty room.** Nothing is in front of it
   and nothing is behind it, so there is no scale and no depth. → 71 % sky, no
   foreground, a city of blank boxes.

The first round fixed a fourth thing — that a maquette is one colour — and
that is now genuinely fixed. It was just not the thing anybody was seeing.

## The plan

Three headings, ranked inside each by frame share over cost.

### A · Relief, the one-and-a-half to eight metre octave

**A1 · Reveals on every opening.** Every window on the envelope — clerestory,
aisle, apse drum, lantern, tower slit — sits flush in its wall, so it reads as
a sticker. Set the glass 0.8 m back behind a splayed jamb with a sill 0.25 m
proud. This is the machinery `tower.ts` already has for the belfry apertures,
applied to several hundred more openings, and it is one ring of quads apiece.
It is most of the terrace frame and most of the flank.
*Bar: blank field at viewpoint `t` under 25 % from 39 %, and its median tone
under 150 from 189.*

**A2 · A cornice at every change of plane.** Parapet head, terrace edge, tower
foot, the springing of every gable: 0.4–0.6 m proud with a drip under it. At
the December sun's 17° a half-metre overhang throws a metre and a half of
shadow, which puts a continuous dark line under every horizontal in the
building. That line is how a viewer separates one storey from the next.
*Bar: above-60 % share at viewpoint `f` under 30 %, from 49.3 %.*

**A3 · The Passion portico has to become the front.** It exists — six legs, a
canopy box, thirteen blades, 1 500 triangles in total, one twenty-second of
what the Nativity crust spends — and from the pavement it reads as a small
white bow tie floating on a blank wall. In the photograph the porch *is* the
bottom half of the frame: legs leaning out over the steps, a canopy
overhanging far enough to throw the whole wall behind it into shade, and a
comb of raking prisms along its edge putting a row of teeth across the
soffit. Three numbers first — the soffit is at `portalHeight * 0.82` = 16.4 m,
the reach 9.5 m, the slab 1.3 m — then the legs need a section that is not a
seven-sided prism.
*Bar: contrast in the 32–64 px octave at viewpoint `x` above 13, from 7.6.*

**A4 · Break the Passion belfry's rows.** Stand the rib between channels about
0.5 m proud of the aperture band so it interrupts every row it crosses.
*Bar: V:H between 0.9 and 1.1 at `u` and `x`, from 0.64.*

**A5 · The central towers are smooth cones and should be polygons.** A hard
arris at every facet corner, a step in the profile roughly every 12 m, and
openings in them. This is what stops viewpoint `f` reading as folded card.

**A6 · The Nativity porches are a patterned slab.** Three cavities eight to
ten metres deep under the towers. The darkness is the object; the figures
stay out, as before.

### B · Shadow, the bottom of the scale

**B1 · `uSkyFill` 2.1 is why there are no blacks.** Lower it and put the
brightness back through exposure, so the sunlit faces hold their measured
values and the shaded ones fall away. Note that the last round's modelling
test — sunlit over shaded, 3.38 against a photograph's 3.54 — will keep
passing at any fill, because it is a ratio between two lit faces. It needs a
dark-end bar beside it.
*Bar: 10–15 % of stone below 8 % luminance at viewpoint `x`, from 0.3 %.*

**B2 · Nothing occludes between 3 m and 20 m.** Widen the ambient occlusion
radius, or add a second wide pass at low weight. The same octave as A.

**B3 · The two new fabrics were let off on a ratio argument.** `exterior.md`
records `white` at 194 189 182 against a photograph's 160 156 152 and `panel`
at 204 198 189 against 157 151 143, and explains the 34 and 47 points by the
test frame being a June morning. The December frames say otherwise: `f` and
`x` are 49 % and 56 % above 60 % luminance where their photographs are 22 %
and 40 %. Both fabrics are simply too light.

**B4 · The building meets the plaza with no darkening at the base.**

### C · Setting, because it is still on a table

**C1 · The cranes.** There is at least one in every exterior reference frame
and two in three of them, and in `ex-flank-elevation` the crane is the second
largest object in the picture. For anybody who has seen this building in the
last forty years the crane is as much of its outline as the towers are. A
lattice mast, a jib, a counterweight, a hook block — a few hundred triangles,
and the highest recognition per triangle of anything in this document.

**C2 · Something in the foreground.** Put the plane trees *between* the camera
and the building at `m` and `n`, not only behind it, and give `f` its road
with cars parked along the kerb.

**C3 · The trees are 9 m tall and should be 12–18 m,** with a trunk that forks
and, for the three December viewpoints, no leaves.

**C4 · The city is blank boxes.** The Eixample reads off one feature — a
balcony on every floor, which stripes every façade horizontally — plus a
level cornice line and a chamfered corner at every crossing. A shader band
would do most of it. Roof clutter, tanks and aerials and pitched sheds, is
what the terrace frame is short of.

**C5 · No aerial perspective.** Distant blocks are the same value as near
ones; distance should wash toward the sky colour.

**C6 · Scale figures.** There is already a 1.65 m figure in the dev panel.
A scatter of them on the pavement is the cheapest statement of 172 m
available. The no-figures rule is about the sculpture of the fronts and this
is a different thing, but it is the author's call, not this document's.

## What this review does not ask for

- **No more masonry.** The sub-pixel octave already matches the photographs
  and beats them on one frame. That work is finished.
- **No more colour.** Whole-frame saturation is within 0.05 and the hue
  spread within a few degrees on all four pairs. The five fabrics were the
  right call and they landed.
- **Nothing more on the Nativity crust.** It is 33 072 triangles, twenty-two
  times the Passion portico, for the front that already reads best. The next
  triangles belong on the Passion side.

## Risks

- Lowering the fill and raising the exposure moves every interior frame too.
  The indoor and outdoor fills are separate uniforms, but the film pass and
  the eye stop are shared — regress the nave, the crown, the apse and the
  shaft on the floor before and after.
- Reveals multiply draw calls if each becomes its own kind. They have to go
  into the existing opening's geometry, not beside it.
- A5 changes the tower profile, which is the one silhouette the whole
  phase-4 recognisability test is scored on. Shoot `n` before touching it.

---

# What was actually missing, and what got built

*20 September 2026, later the same day. The review above was told, correctly,
that it had buried the plain fact under its instruments.*

## The correction

The measurements in the first half are sound and they are not the point. A
reader looking at this model does not think "the thirty-two pixel octave is
down by half"; they think **there is nothing on it**. And there wasn't. The
project had twenty geometry generators at the start of this round —

> tree column · vault cell · portico leg · hood · crust · tower shaft ·
> louvre · column base · cypress · bridge · arch fringe · gable · column ·
> pinnacle · cross · star · fruit · hypar · glass panel · hyperboloid

— and **every one of them makes structure**. Not one made ornament. There was
no letter, no gargoyle, no crocket, no niche, no figure, no railing, no door,
no crane, no scaffold anywhere in the model. What the first half measured as
a missing octave of contrast is, said plainly, a building with its contents
left off.

Take one crop of `reference/ex-apse-flank-west.jpg` — about forty metres of
the apse. In it: four carved words in relief (*Amen*, *Acció de Gràcies*,
*Honor*, *Poder*), a dozen pinnacles no two alike, a gable that is a pierced
lattice with dark behind it, ceramic fruit, railings at four levels, a statue
in a canopied niche, oculi with radial tracery, crockets down every rake, and
two tower tops in netting with scaffold inside. The model's answer to all of
it was smooth stone.

## The useful part of the reframe

Most of what is missing is **not sculpture and does not need a sculptor**.
Sorted by what the thing mechanically is:

- **It is text.** The towers carry *Sanctus Sanctus Sanctus*; the apse gables
  each carry a word; the Passion lintel carries the titulus. One stroke font
  serves all of it.
- **It is a small form repeated along an edge.** Crockets, gargoyles, fruit
  baskets, balustrades. The project already had the machinery — what was
  missing were the placement rules.
- **It is construction.** Cranes, scaffold, netting. No artistry at all.
- **It is the street.** Left out this round, deliberately: at 25 to 140 m a
  1.7 m figure is fourteen pixels and buys nothing.

Figurative sculpture on the fronts stays out. The no-figures rule holds.

## Built

### The Scriptures · `src/geometry/letters.ts`

The omission the author called out by name, and the largest single addition.
A **stroke font** rather than an outline font, because these letters are not
printed, they are carved in relief: a raised bar of near-constant width
throwing a shadow down one side. The skeleton *is* the letter and the width
is a property of the chisel — so each glyph is a handful of polylines through
a unit em and the builder sweeps a rectangular section along each one. Thirty
glyphs, only the ones the building uses, no imported asset, no triangulator.

Three placements:

| Where | What it says | Cap height |
| --- | --- | --- |
| Every bell tower's raised ring | *Sanctus* / *Hosanna* / *Excelsis*, repeated round the shaft | 1.01 m |
| Every nave and aisle gable | the Sanctus in order, one word to a gable | 0.16 of the rise |
| The Passion canopy fascia | *IESUS NAZARENUS REX IUDAEORUM* | fitted to the front |

The tower letters are set flat and then **wrapped onto the shaft's own star
section**, so they follow it into its valleys rather than chording over them,
and the repeat count is derived from the circumference rather than typed —
a slimmer tower carries fewer words without anything having to know which
tower it is. Sizing is off `ex-plaza-nativity.jpg`: against a four-metre
shaft the word *Sanctus* measures about 3.7 m of arc with roughly 0.9 m
capitals.

44,622 triangles for every inscription on the building, 1.7 % of the scene.

### The fruit was a measured mistake

`CERAMIC` was `0xd9d2b0` at saturation 0.19 on the stated reasoning that
anything stronger would be "a fairground". Sampling only the lit glaze off
`ex-terraces-roofscape.jpg` — the top thirty per cent by saturation in each
basket, so shadow and background are out of it — gives four hues at
saturation 0.52 to 0.70, against 0.27 for the stone beside them. The model
was painting the only colour on the building at *the same saturation as the
stone it stands on*, which is exactly why eighty-four baskets rendered as
white cauliflower.

Five glazes now, painted per berry with one dominant per basket, because in
the photograph each basket is plainly *the green one* or *the red one* and an
even mix of five is a bowl of sweets.

### Gargoyles · `buildGargoyle`

Forty-two of them, at the middle of every bay down both flanks and between
every pair of pinnacles round the chevet. A tube swept along a curve that
leaves the wall level, arcs out and falls, with a shoulder near the root and
a flare at the head. No face, no limbs, no creature: at the only distance any
viewpoint here sees them from, a gargoyle is a dark knuckle standing two
metres out of a cornice and throwing a shadow back onto it, and that is worth
a hundred and thirty triangles. 5,586 for all forty-two.

### The plant · `src/geometry/works.ts`

Two tower cranes. One generator does the mast, both jibs and any scaffold
tower that gets built later: a square lattice of four legs with ties every
bay and one diagonal a face, handed off the bay index so a long jib does not
read as a zip.

The steel is sampled off the three cranes in `reference/`, which come back at
hue 20–37 and saturation 0.40–0.56 — one paint, not three. The render lands
at **181 142 99, hue 32, saturation 0.45**, inside that range on the first
try.

They stand where the work is: one against the apse, one off the Glory front,
both slewed across the building, because in every photograph here the jib
crosses the towers.

## Tried and taken out

**Tracery in the gable faces.** Built twice. The first version kept the
upward cells of a subdivided triangle and dropped the downward ones, which is
arithmetically a lattice and visually a disaster — upward cells meet only at
their corners, so the face came back as disconnected triangles with the
gable's own back showing through, and a row of them along the nave read as
dithering. The second version had it the right way round, solid with openings
cut, and then measured out at about one pixel per opening from every
viewpoint in the harness. An invisible feature is not worth its risk, so it
is gone. The real pierced screens are the big apse gables, which this model
does not have as separate objects yet.

## What the numbers say, including the ones that did not move

Contrast per octave, the instrument from the first half:

| | <1px | <2px | <4px | <8px | <16px | <32px | <64px |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **photo** passion porch | 8.96 | 7.06 | 8.55 | 11.09 | 13.10 | 13.91 | 16.56 |
| render, before | 7.04 | 5.75 | 8.19 | 8.07 | 7.06 | 7.58 | 7.63 |
| render, after | 5.56 | 5.43 | 8.21 | 8.13 | 7.12 | 7.57 | **7.59** |

**It did not move, and it was not going to.** That instrument measures
relief — the porch, the cornice, the reveal, the one-and-a-half to eight
metre architecture — and this round was ornament. The two are different
things and the flat line is the proof. Section A of the plan above is still
entirely open and is still the largest single thing wrong with the outside.

What did move is colour on the roofline. Most saturated five per cent of the
roofline band, which is the glaze:

| | sampled | hue | saturation |
| --- | --- | --- | --- |
| photograph, `ex-terraces-roofscape` | #4c2613 | 20 | 0.75 |
| render, before | #623923 | 21 | 0.64 |
| render, after | #532314 | 14 | **0.75** |

and the mean over the whole roofline band went 0.25 → 0.35.

The flank frame also came down on the bright end, which the cranes and the
baskets did between them: above 60 % luminance 49.3 % → 45.9 %, median
151 → 143, against a photograph's 21.7 % and 115. Better, still wrong, and
wrong for the reason section B names.

## Still open

- **Relief.** Section A above, untouched by agreement: reveals on every
  opening, a cornice at every change of plane, and the Passion portico —
  which is 1,500 triangles against the Nativity crust's 33,072 and still
  reads from the pavement as a white bow tie on a blank wall.
- **The light.** Section B. 0.1 % of the stone at the porch is below 8 %
  luminance where the photograph has 15.1 %.
- **Netting and scaffold.** The generator is there; nothing is wrapped yet.
- **Figures.** Out by decision, on the fronts and on the street both.
- **A pre-existing artifact**, found while looking at the gables and not
  caused by this round: the valleys *between* two gables dither in a
  checkerboard at middle distance. Worth chasing separately.
