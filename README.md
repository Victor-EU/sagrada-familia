# Sagrada Família in 3D

A browser app for flying around Sagrada Família and walking through its interior.
Geometry is **generated from Gaudí's own ruled-surface rules**, not downloaded as
a mesh — the real vaults are hyperboloids and the real columns are intersections
of counter-rotating prisms, so computing them is the same construction the
builders use. Photographs are the acceptance test, not the source.

Design doc: the reasoning, the surface families, the light model and the scope
phases live there. This README covers running the code.

## Status: phases 0 to 5 complete, and then the colour

The scope phases finished and the model was still wrong in the way that
mattered most: it looked like a 3D print of a cathedral. Everything opaque was
one white plaster, the interior ambient was Barcelona sky pouring through walls
it should not have been able to see, and the interface was a parameter panel
three hundred and ten pixels wide standing next to it.

All three are gone. The building is cut from the stones the Basilica publishes
and the model has recorded since phase 2 — Montjuïc sandstone on the side
naves, granite down the middle, basalt round the crossing, red porphyry at the
centre — the ambient indoors is the colour of the light that actually arrives
through Vila-Grau's glazing, and the app opens on the building, from across
the plaza, with a door to go in by. There was a nine-stop guided visit for a
while; it asked to be followed, and what a person wants from a cathedral is
to walk round it and then go in, so it went. The panel is still there behind
`?dev` or the P key; it is no longer the first thing anyone sees.



Each phase carried its own bar. Phase 0: *you can load a photo, match a camera
to it, and tune a parameter live.* Phase 1, the nave bay and the go/no-go: it
passed on light and material and failed on framing, because one cell is open at
both ends and a third of an eye-height frame came back sky. Phase 2 tiled that
cell into a nave. Phase 3's bar was *the interior is continuous and navigable
throughout*, and it is met — ninety metres of walk from the Glory wall to the
chevet, stopped only where the plan says. Phase 4's bar was *the silhouette is
recognisable from street level*, and it is: eighteen towers, the terraces that
close every vessel, and three fronts as massing.

Phase 3 began by taking phase 2 apart. Three of the nave's numbers were wrong
and the Basilica's own information booklets say so: the column grid is 7.5 m in
**both** directions, so the nave is 45 m long and not 90; 90 is the whole
church, being 45 of nave, 15 of crossing and 30 of apse; and the central nave is
eight-pointed grey granite, not the ten phase 2 argued itself into. With the
grid right the crossing places itself — four columns of red porphyry at the
corners of a 15 m square and eight of basalt around them, which is the twelve
the sources count.

Then the floor. It was one grey disc of radius 320 doing two jobs at one
height with nothing on it — and measured on a frame taken standing in the nave,
**16 %** of the picture, the third largest thing in it after two orders of
column, every pixel the same number. It is now paved on the building's own
module, the church stands on a podium instead of being pushed into the plaza,
every shaft has a foot, and the presbytery — two metres of solid plaster the
camera used to walk into and stand inside up to the shoulders — has a flight up
onto it.

Then the transept, which until now was not one: the crossing was fifteen
metres of the nave with its vaults raised, ending on the nave's own wall line,
and a Latin cross with no arms is a cross drawn in section only. The published
figures fix how far they should stand out — **90 m long, 60 m wide, 45 m of
nave** — and the difference is 7.5 m a side, which is one module exactly. So
an arm is not a new kind of thing here. It is one more **band** on the
crossing's own two stations: two more columns a station, one more cell a
strip, and the wall and the clerestory that fall out of a band being lower
than the one inside it. The transept is a room sixty-two metres tip to tip
that you can walk, against forty-eight before.

Phase 4 put an outside on it. Until now every vault in the model was a surface
with nothing over it: from anywhere above forty metres you looked straight down
into the nave. What closes it is not a lid but the **terraces** the real
building carries, one per vessel at that vessel's own crown, with holes and
collars where the vaults are open to the sky — you can walk on the naves of
Sagrada Família, and the stepped profile of those terraces seen end-on is the
section of the building. On top of that stand the eighteen, on published
heights and on the grid's own positions: each bell tower is **one module
across**, so four of them side by side is the thirty metres of the transept
front.

Then the outside. With the colour settled the model was still a maquette
from the plaza, and the reasons were measurable rather than atmospheric. It
was cut from **one stone** where the building has four fabrics whose dates a
visitor reads before anything else — the Nativity front black with ninety
years of city air, the Passion front pale and half a century younger, the
portico white, the six towers over the crossing grey panel craned into place
after 2016. Its **towers were striped** where the photographs show a ladder:
level rows of hooded apertures cut in the channels between ribs, on a pitch
of about a metre and a third, with a stone hood over each one that takes the
sun on top and throws a hard shadow into the slot beneath. It was **not made
of pieces** — a hundred metres of coursed masonry at one flat albedo, with
the grain shader saying something true at a scale nothing outdoors can see.
And it had **no light at the scale of the group**: between the three metres
ambient occlusion reaches and the hundred a shadow map covers there was
nothing at all, which is the band this building's exterior lives in.

All four are built, and each was judged on a number off a photograph rather
than on looking better. The Passion belfry lands at 158 143 120 against the
photograph's 159 139 122; the apertures count 23 rows on the strip where the
photograph counts 22, against 12 before; the spread between the sunlit and
shaded stone in a plaza frame is 3.38 where two photographs give 3.54 and
3.58, against 2.68 before. The plaza got trees with edges instead of green
balls, lamp posts to say how big the building is, and a pond that reflects.
The Nativity front got the two things it reads by from across the square and
had neither of: the bridge between its middle towers, and the cypress.

Phase 5's bar is *someone can send a link to a specific moment of light*, and
it was met first: the address bar is the save format, because nothing about this
building's light is authored and a moment is therefore only a camera, a day and
an hour. Before that it built the **air**, which had been the one high-value
item on the beauty list since phase 0 and the last one unbuilt — light that
lands on surfaces but never fills the space is not what any photograph of this
interior shows. And after it, the **way in**. A building whose walls hold from
both sides and whose ground outside is a disc you cannot stand on is a building
you can only enter by flying over the parapet, which is the one thing a visitor
to a cathedral never does. There are eight doorways now, set out by the fronts
in front of them, and the podium's edge is a flight of steps rather than 1.35 m
of sheer plaster: you arrive on the plaza, you climb, and you walk in. Last,
the **shadows**. One orthographic map has to cover a 172 m tower and the
quarter-kilometre of ground its shadow falls on, which left every shadow
indoors at a tenth of a metre to the texel; there are two now, and the second
follows the camera at 2.9 cm — four to seven times finer over the only part of
the building anyone is standing in.

Then the inside, which was the half of the building none of that had looked
at. It had every piece of machinery a room needs — coloured transmittance
through the glazing, a shadowed rig for the windows as an area source, lit
air, occlusion, a film with a grade on it — and it was **lit by one flat
number** with all of them switched on underneath it: turning the wash rig
off moved a nave frame's saturation by two thousandths, turning occlusion
from 0.55 to 0.9 moved its median by one thousandth, and turning off the
constant took its blacks from nothing to twenty-eight per cent of the
picture. It had also put the building's colour on the wrong surfaces —
every column three quarters lit by one amber, at 0.55 to 0.70 saturation
where a photographed shaft is 0.046 to 0.28, under a canopy that
photographs as a field of gold and rendered as white plaster. Both are
fixed, and with them the flutes that read as corrugation, windows whose
panes all crossed white together, a nave lined in running bond, and the
lucernaris — the lit ovals on every branching knot, which are the only
light at column height and were simply not there. See `docs/interior.md`
for the ten photograph pairs and the ablation table.

Last, the **canopy**, which came out of all that still lit by a constant:
switching the glazing's own rig off changed the vault by nothing at all, to
the byte, because the rig runs along the two horizontal axes and a soffit
faces those edge-on. Light that lands on a downward-facing surface has to
be travelling upward, and there is no upward-travelling light from a
window — so what lights the canopy is the floor, a hundred metres of pale
pavement that every soffit in the building faces. That is one orthographic
pass straight up, and a soffit now asks it how much of the pavement it can
see. The vault gains half as much light again, a branch darkens the vault
above it, and the star plates read for the first time.

That pass then turned out to be weighted wrongly, and in a way that
explained the last complaint anyone had about the interior — that the
columns are too dark. It weighted the floor by the cosine against straight
down, which is the answer for a *lamp* underneath. What a surface takes
from a *plane* below it is `(1 − n.y) / 2`: all of it for a soffit, half
for anything standing upright, and the old term gave a vertical surface
zero. So the largest, palest, best-lit surface in the building lit the
vault and lit nothing that stood on it. Corrected, and with the flat fill
it had been standing in for taken down to match, a column measures 0.90 of
the frame's median where the photographs give 0.86 to 1.15 and the render
gave 0.81, at 0.32 saturation against a photographed 0.32 to 0.35. The
canopy meanwhile got the **clerestory**: the same rig tilted fifteen
degrees above horizontal — measured off the model, not chosen — which is
the only line that enters at the clerestory head, crosses to the far
soffits and clears the aisle roof behind it. It is the one source up there
that a facet can face or turn away from, and it is weighted by which
clerestory has the sun behind it, because a canopy photographed at half
past one in December is gold from end to end and the model was putting
mint-green blooms across it.

Which left the rest of the room not knowing what time it was. Same camera,
three hours spanning the sun from one side of the church to the other, and
the columns came back 0.089, 0.150 and 0.106 warm — a scatter, not a trend,
on a building whose two halves are glazed amber and mint on purpose. The
fix that was obvious was to weight the two horizontal wash passes by which
wall has the sun on it, as the clerestory already is. Measured, that was
worth **one per cent**: ablate the terms feeding a column shaft and the
floor is half of what lights it, the flat fill is a fifth, and the wash rig
— which does carry a wall facing a window across an open span — is nothing
at all, because most of a colonnade has no line to a window. So the hour
went where the light is: into the colour the flat fill crossfades between
the two glazings, and into the grey the floor's light pools to for anything
standing upright. That grey is what Vila-Grau's two halves average to
*while both of them are lit*; with one in shadow the hundred metres of
pavement a shaft sees is gold end to end, and averaging it is averaging
gold with gold. Written as a departure from the even hour, so the hour
everything was fitted at is untouched: every Passion frame warms by 0.02 to
0.11, every Nativity frame cools by 0.05 to 0.08, every exterior is
unchanged to a thousandth, and eleven of twelve interiors hold their median
to within one per cent.

| Built | Where |
| --- | --- |
| Hyperboloid generator — surface + straight generators | `src/geometry/hyperboloid.ts` |
| Photo-match overlay, letterboxed to the photo's aspect | `src/dev/overlay.ts` |
| Live parameter panel, camera and geometry presets | `src/dev/params.ts`, `src/dev/presets.ts` |
| Free-fly camera with vertical-line correction | `src/camera/freecam.ts` |
| The four stones, and which order is cut from which | `src/render/materials.ts` |
| The ambient indoors is the room; outdoors it is the sky | `src/render/materials.ts` |
| Stone grain — two octaves on world position, laid in courses | `src/render/materials.ts` |
| Bloom above the white point, so only the glazing spills | `src/render/scene.ts` |
| The film: AgX, then a Classic Chrome grade — muted, deep, hard shadows | `src/render/film.ts` |
| Grain, vignette and halation — a photograph, not a frame | `src/render/film.ts` |
| Four ages of stone, plus glass mosaic and enamel, assigned by front and date | `src/render/materials.ts` |
| Masonry drawn from world position: courses, blocks, joints that tip the light | `src/render/materials.ts` |
| Weathering — rain-washed above, sooty beneath, runnels down every face | `src/render/materials.ts` |
| The belfry from the photographs: level rows, channels, a hood over every slot | `src/geometry/tower.ts` |
| A panel tower is faceted, untwisted and lit by slits, not pierced by sound holes | `src/geometry/tower.ts`, `src/plan/towers.ts` |
| Venetian glass on the twelve crowns, banded up the profile | `src/geometry/tower.ts` |
| How much sky the eighteen leave each other | `src/render/materials.ts` |
| The occlusion radius follows the camera back | `src/render/scene.ts` |
| Leaves cut out of crossed quads, and lamp posts for scale | `src/plan/city.ts`, `src/render/materials.ts` |
| The bridge between two towers, the cypress, and a fringe over every portal | `src/geometry/portico.ts`, `src/plan/shell.ts` |
| A stone asks the roof map which side of the wall it is on | `src/render/materials.ts` |
| The envelope takes the sky; the eye closes a stop on the plaza | `src/render/materials.ts`, `src/camera/viewer.ts` |
| Double-twist column, all four orders, from the published rule | `src/geometry/column.ts` |
| Branching node — ellipsoid knots, orders stepping down by level | `src/geometry/branch.ts` |
| Vault — skylight funnels and column bosses, plus the hypar family | `src/geometry/vault.ts` |
| The 7.5 m module and the four vault heights | `src/plan/module.ts` |
| Church assembly — nave, crossing, projecting arms, Glory end | `src/plan/church.ts` |
| One transverse station and the cells between two of them | `src/plan/section.ts` |
| Apse — ten columns on a semicircle, ambulatory, drum, lantern | `src/plan/apse.ts` |
| Floor — paving set out on the module, podium, the apse turning polar | `src/plan/floor.ts` |
| Part registry, so every region shares one instanced field | `src/plan/parts.ts` |
| Tessellation from feature size, not from typed-in counts | `src/geometry/detail.ts` |
| Instanced level of detail, switched on measured error | `src/render/field.ts` |
| Ambient occlusion — GTAO at half res, glass gated out | `src/render/scene.ts` |
| Frame census: what is in this picture, by surface | `src/dev/probe.ts` |
| Solar position for 41.40° N, 2.17° E, with CET/CEST | `src/light/sun.ts` |
| Analytic sky, and the environment light it casts | `src/light/sky.ts` |
| Coloured transmittance — sunlight that remembers the glass | `src/render/sunrig.ts` |
| Two shadow maps: one on the model, one that follows the camera | `src/render/sunrig.ts` |
| Volumetric shafts — single scattering through the same two maps | `src/render/shafts.ts` |
| Roof map: where the air is indoors, from the stepped section | `src/render/roof.ts` |
| Vila-Grau glazing: jittered panes, graded by height and side | `src/geometry/glass.ts` |
| Walls — stone frames, no holes cut; aisle and clerestory | `src/plan/clerestory.ts` |
| Tower generator — paraboloid shaft, star section, pierced | `src/geometry/tower.ts` |
| The eighteen, on published heights and on the grid | `src/plan/towers.ts` |
| Shell — terraces, parapets, roof lanterns, the three fronts | `src/plan/shell.ts` |
| Seventeen curated viewpoints, on the number and letter keys | `src/dev/viewpoints.ts` |
| The building's bearing, measured off its footprint: 314.4° | `src/light/sun.ts` |
| Three frames matched to the author's own December photographs | `src/dev/viewpoints.ts`, `reference/SOURCES.md` |
| Three more at the lens the photographs use: twenty-four millimetres, eye height, up | `src/dev/viewpoints.ts` |
| Walk and fly as one camera, with a continuous transition | `src/camera/freecam.ts` |
| Two-thumb touch controls, with a stick that appears under the thumb | `src/camera/touch.ts` |
| The address bar as the save format — a link to a moment of light | `src/share.ts` |
| Envelope: a rectangle for the nave, a disc for the apse, a terrace you can climb | `src/camera/envelope.ts` |
| Doors — a window with no glass in it, placed by the front in front of it | `src/plan/clerestory.ts`, `src/plan/church.ts` |
| A podium you can climb: the skirt as a flight of steps round the footprint | `src/plan/floor.ts` |
| The plaza as ground — the same plan at its outside faces, keeping you out | `src/camera/envelope.ts` |
| Two ways of being with a building: an orbit outside, a walk inside, and a door between them | `src/camera/viewer.ts` |
| The interface — the way in, the way out, what the cursor does here, and the hour | `src/ui/controls.ts` |
| Figures, canopies, carved growth and cresting — the Nativity front's sculpture | `src/geometry/statuary.ts` |
| The cover — Gaudí's hanging chains, dropped, settled and turned over while the stone is cut | `src/ui/cover.ts` |
| Light census: whether there is any modelling in this frame, in numbers | `src/dev/probe.ts` |
| The room's colour is in its light, not on its stone | `src/render/materials.ts` |
| The lucernaris — three lit ovals set into every branching knot | `src/plan/parts.ts`, `src/geometry/branch.ts` |
| A fluted shaft that reads as round, and a window that is not a grid | `src/geometry/column.ts`, `src/geometry/window.ts` |
| The light from below: how much pavement each soffit can see | `src/render/washrig.ts` |
| The floor as a plane, so it reaches a shaft and not only a soffit | `src/render/washrig.ts` |
| The clerestory throwing up and inward, weighted by which side has the sun | `src/render/washrig.ts`, `src/render/scene.ts` |
| Which half of the glazing has the sun on it, as one signed number | `src/render/washrig.ts` |
| The room's own colour following the hour, not only the plan | `src/render/materials.ts` |

## Running

```bash
npm install
npm run dev
```

The dev server takes its port from `$PORT` and otherwise lets Vite pick a free
one, so it never collides with another project's server.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build
```

## Controls

The app opens across the plaza, in an orbit. Inside, it is a walk. The two
are different relationships with the building and the controls mean
different things in each — which is what the line at the bottom of the
screen says, and changes when it changes.

| Outside | |
| --- | --- |
| drag | turn the building — about whatever was under the cursor |
| scroll / pinch | come closer, back off |
| double-click a door, or **Go inside** | fly to it and walk in |
| Enter | the same, through the door you are looking at |
| W A S D, space / C | free flight, for the viewer who would rather fly |
| Escape | back to the opening frame |

| Inside | |
| --- | --- |
| drag | look |
| click the floor | walk there |
| scroll | a pace or two forward |
| W A S D | walk; shift to hurry |
| space / C | rise and settle; the height holds |
| Escape, or **Step outside** | out through the nearest door |

| Anywhere | |
| --- | --- |
| the scrubber | the hour of the day, and the whole model relit for it |
| L | copy a link to exactly this frame and hour |
| P | the parameter panel and the readouts (also `?dev` in the address) |
| O, X, `[` `]` | the reference photo, difference blend, its opacity — with the panel |
| drop an image | load it as a reference |
| 1–9, 0, N D G T U M F X W V | the curated viewpoints — **only with the panel open** |

The curated viewpoints are the regression harness rather than a visit: they
move the camera without telling the interface, so they live behind the same
switch as the panel.

The render adapts its resolution to the machine: it drops device pixels
while frames are slow and takes them back when they have been fast for a
while. The readout shows where it currently stands.

On a touch device the left thumb walks — a stick appears where it lands, and
deflection is proportional — the right thumb looks, and two fingers rise and
fall together and pinch for speed. The render gets the whole screen on every
device now, because nothing is standing beside it.

## Links

The address bar is the save format, and it holds everything a moment of this
building needs: where the camera stands, where it looks, the lens, and the
day and hour the sun is computed from.

```
#at=4.2,1.65,17&look=-0.163,0.598&lens=68,0.62&sun=262,16
```

It is readable on purpose. `sun=262,16` is the nineteenth of September at
four in the afternoon, and you can change it to `sun=172,9.6` by hand and get
midsummer morning without going near the app. Pasting one into a tab that is
already open moves the camera there, since the page does not reload for a
hash. Decoding is all-or-nothing — the right hour at the wrong place is worse
than no link at all.

`window.harness` exposes the camera, overlay, parameters and a `rebuild()` for
driving the harness from the console.

## The photo-match loop

1. Drop a reference photograph on the window. The render letterboxes itself to
   the photo's aspect ratio — without this a 3:2 reference can never be matched
   inside a 16:9 viewport, however good the camera is.
2. Fly until the view roughly agrees. Set **vertical correction** to match how
   the photo was shot; architectural photographs of tall interiors are usually
   shift-corrected, and a camera that cannot do the same will never match one.
3. Press `X` for difference blend and tune until edges cancel.
4. Save a preset — it stores the camera *and* the geometry parameters together,
   because that pairing is the unit of verified work.
5. Export to clipboard and commit the numbers.

A parameter counts as verified when it locks against **two photos from different
viewpoints**. A single photo can be satisfied by geometry that is wrong in depth.

## Notes

- **A sky fill that is an amplifier cannot be turned down to make a shadow.**
  `uSkyFill` stands at 2.1 to make up for an open-hemisphere probe, so
  lowering it darkens the underside of a porch and the open wall beside it
  by exactly the same proportion. Swept from 2.1 to 0.5 with the exposure
  raised to match, the share of stone below eight per cent luminance at the
  December porch moved from 0.1 % to 0.1 %. Ambient occlusion could not
  reach it either — three metres of radius against twelve metres of
  overhang, and 3, 9, 16 and 22 m all measured the same.
- **What can see a soffit is the roof-height map.** The interior has used it
  since phase five to decide what is a room; the envelope never consulted
  it. A point with something standing over it now loses its sky, on the same
  threshold, keeping twelve per cent because a soffit over a sunlit pavement
  is not black. The five-tap probe the shelter test carried inline is now one
  function both call.
- **The reflection of the sky was never occluded at all.** Three splits the
  environment into a diffuse irradiance and a specular radiance and only the
  first was being scaled. Four per cent of the whole sky, arriving on
  surfaces that cannot see any of it.
- **The Passion porch was a shelf and is a tent.** Six legs that splay — feet
  wider and further out than their heads — under a roof that climbs from an
  arced leading edge at 18 m to a ridge at 28 m against the wall, reaching
  twelve metres out, with a comb of thirty-two raking prisms on the edge. It
  is 3,324 triangles against 1,500 before; the count was never the problem.
- **A pane sits at the waist of the funnel, so a wall's thickness is the
  depth of its reveal.** At 0.9 m the glass stood 450 mm behind the face and
  every window outside read as a coloured rectangle on a flat wall. A metre
  and a half is modest for a wall carrying a forty-five metre vault.
- **Sheeting is a skin, not a net.** A half-open net at tower-top range is a
  field of sub-pixel holes, which is moiré. A photograph of sheeting shows a
  closed pale surface with folds in it. In its own fabric, too: cut from the
  white stone beside it, a wrap reads as a tower that has gone smooth.
- **The viewer will not stand somewhere it has been asked to look through.**
  Aimed at a point behind the new canopy, it stepped back thirty metres and
  rose to the terraces for a clear line. Aim at the thing, not past it.
- **Twenty generators, and not one of them made ornament.** Tree column,
  vault cell, portico leg, hood, crust, tower shaft, louvre, column base,
  cypress, bridge, arch fringe, gable, column, pinnacle, cross, star, fruit,
  hypar, glass panel, hyperboloid — all structure. There was no letter, no
  gargoyle, no crane, no railing, no door anywhere in the model, and that is
  the plain version of what the octave measurements in `docs/relief.md` were
  circling. A building whose whole surface is carved cannot be modelled by
  getting its stone right.
- **The building is written on, and now the model is.** *Sanctus*, *Hosanna*
  and *Excelsis* round every bell tower's raised ring; the Sanctus of the
  Mass in order, one word to a gable, along the nave and aisle rooflines;
  *IESUS NAZARENUS REX IUDAEORUM* across the Passion canopy. A **stroke
  font** rather than outlines — thirty hand-authored glyphs, no imported
  asset, no triangulator — because a carved inscription is a raised bar of
  constant width and the skeleton *is* the letter. The tower words are set
  flat and wrapped onto the shaft's own star section so they follow it into
  its valleys, and the repeat count comes off the circumference rather than
  a typed number. 44,622 triangles for every inscription on the building.
- **The relief on a letter is not about the letter, it is about the shadow
  beside it.** At a tenth of the cap height the first attempt read as a flat
  mark the colour of the shaft. A sixth throws a shadow as wide as the stroke
  at any sun above twenty degrees, which is every hour these frames use.
- **Arc length runs clockwise, and the first version ran it the other way.**
  Anticlockwise is the natural way to write the formula and it put *Sanctus*
  on all twelve towers as *sutcnaS*.
- **The ceramic fruit was painted at the same saturation as the stone it
  stands on.** `CERAMIC` was cream at 0.19 on the reasoning that stronger
  would be a fairground; the lit glaze in `ex-terraces-roofscape.jpg`
  measures 0.52 to 0.70 across four hues against 0.27 for the stone. Eighty-
  four baskets were rendering as white cauliflower. Five glazes now, painted
  per berry with one dominant per basket, because each real basket is plainly
  *the green one* or *the red one*.
- **There is a crane in every exterior photograph in `reference/`** and two
  in three of them, and in `ex-flank-elevation.jpg` the crane is the second
  largest object in the frame. Nobody alive has seen this building without
  one. Two now stand on the site, from one lattice generator that also does
  both jibs; the steel was sampled off the photographs at hue 20–37 and
  saturation 0.40–0.56 and the render landed at hue 32, saturation 0.45.
- **Forty-two gargoyles, and none of them is an animal.** At the only
  distance any viewpoint here sees them from, a gargoyle is a dark knuckle
  two metres out of a cornice throwing a shadow back onto it. The real ones
  are lizards and snails and nobody has ever been able to tell.
- **Tracery in the gable faces was built twice and taken out.** Keeping the
  upward cells of a subdivided triangle and dropping the downward ones is
  arithmetically a lattice and visually a disaster: upward cells meet only at
  their corners, so the face came back as disconnected triangles with the
  gable's own back showing through. Built the right way round — solid with
  openings cut — it measured about one pixel per opening from every viewpoint
  in the harness, which is not worth its risk.
- **Ornament is not relief, and the instruments say so.** The octave
  measurement that diagnosed the outside did not move at all across this
  round: 7.63 to 7.59 in the coarse band against a photograph's 16.56. That
  band is the porch, the cornice and the window reveal, and none of them was
  touched. See `docs/relief.md`.
- **The exterior's fabrics are four, and the model had one.** A render that
  puts all four within ten points of each other is a render of an object that
  was manufactured all at once, which is what a maquette is. Each albedo was
  found by sweeping the live material against a reference frame rather than
  picked in a colour dialog, so the number is what the curve and the sky make
  of it. See `docs/exterior.md` for the table and the diagnosis it came from.
- **Measure a fabric on a frame where it is in sun.** The Nativity front was
  given a charcoal albedo on the strength of 77 66 64 *on the sunlit flank* —
  read off a long lens on two tower shafts in their own shade, backlit,
  against a blown sky. It is a reading of shadow. On a frame with low sun
  straight onto that front, the ninety-year-old stone and the new factory
  panel are **the same luminance**: 106 against 105. What separates them is
  hue and saturation, not value — one warm at a fifth saturated, the other
  neutral at a twentieth. The age of a fabric lives in its crevices, which
  the weather term was already doing; carrying it in the albedo as well
  counted the soot twice. See `docs/relief.md`.
- **A design note is not evidence.** The Nativity front's encrustation came
  with a note ruling sculpture out on the grounds that *from the width of the
  plaza that front is not read as figures*. Held against any plaza
  photograph, that is not true: you cannot read a face at a hundred metres,
  but you read people — uprights a little taller than a door, in rows, under
  pointed hoods that put a hard black triangle over each one. What was there
  instead was nine hundred bosses of a quarter of a metre, which is below the
  size any of this is seen at. `src/geometry/statuary.ts` and
  `docs/relief.md`.
- A tower's **kind key carried its geometry and not its stone**, and a kind
  carries one material. The Passion's outer pair stands at 107 m, the same
  height, girth and taper as the Nativity's inner pair, so it joined that kind
  and came back cut from ninety-year-old blackened stone in the middle of the
  1960s front — two of the twelve bell towers the wrong colour, with identical
  geometry, which is exactly the mistake a shared key is for making invisible.
- The **hood over an aperture is the whole of the belfry**. A slot cut flush
  in a shaft is a flat mark the colour of whatever stands behind it, and a
  hundred of them average out to a faint mottling: that is what the towers
  were. The real ones are roofed, so the top of each takes the sun and the
  underside throws a hard shadow across the opening beneath — bright dash over
  dark dash, twelve to a row and twenty-three rows up. The rows are level, not
  helical, and their pitch is a *length*, so a taller tower gets more rows
  rather than larger ones; given a count instead, the 98.4 m towers and the
  117 m towers came out identically spaced at different sizes, which is the
  one thing that says a building was made in a modelling package.
- What is behind an aperture needed **its own share of sky**. The envelope's
  fill is set for a surface standing in the open, and the panel behind a
  louvre sits a metre down a slot cut in a metre of masonry, where what it can
  see of the sky is a letterbox. Given the open figure it came back lit, and
  the lattice went back to being a mottled cone.
- **Masonry is where the age of a fabric lives**, and it is mostly not the
  joint. It is what water has done around it: paler where the stone faces the
  sky and is rained on, black where it is sheltered and never washed, and
  runnels down every vertical face. On the Nativity front the joints are
  *lighter* than the blocks — the stone went black and the mortar did not —
  and that sign reversal is half of what tells the two fronts apart at a
  glance. Every line knows its own filter width and retires once a course is
  down to a couple of pixels, which is the pavement's machinery: there is no
  texture here to mip, so a line that outlives its sampling rate is moiré.
- The **shelter test was averaging five roof probes equally**, and one tap of
  the ring always steps back across the wall it is standing on and finds the
  terrace over it — so the outer face of every enclosing wall got a fifth of a
  vote for being indoors. A fifth would be harmless if the two fills were the
  same size and they are nothing like it: the room's is a window counted at
  nearly three and a floor counted at eight, against an outdoor probe cut hard
  so the towers keep their modelling. The nave's flank came back as a sheet of
  interior gold in a frame taken from two streets away. The centre tap decides
  now and the ring only leans.
- **A bridge forty-five metres up is not a ceiling.** The roof map saw the new
  bridge between two bell towers, decided the column of air under it was
  indoors, and filled it with the volumetric medium — a vertical plume of haze
  down the middle of the Nativity front. The towers learned this in phase
  five; anything that stands out in front of a façade has to be told the same.
- `uFillScale` was declared by two shader chunks that both reach an indoor
  stone, and **GLSL calls a second declaration a redefinition**. Three's
  fallback for a shader that will not compile is a material that silently
  draws with somebody else's program, so the interior lost its lighting
  without anything throwing.
- Dimensions in `defaultHyperboloid` are placeholders. Real funnel sizes are an
  open question in the design doc and land here once photo-matched.
- The bearing is **measured now**, not assumed: 314.4° from the Glory end to
  the apse, off 215 m of the basilica's long walls in OpenStreetMap. The
  provisional 315 was six tenths of a degree out.
- Six of the author's own frames, shot on one December afternoon in 2025 on
  Classic Chrome, are in `reference/` with their minutes. The sky palette is
  solved against the exterior pair — the film pass is modelled in Python for
  one colour and the zenith searched until what comes out is the photograph's
  — and lands within ten points of it at both hours. The interior pair is
  **not matched yet**, and the gap is not a slider: a camera in that room
  exposes for the glass, a stop and a half under where the model stands, and
  the wash the Passion glass throws on the vault reads nine tenths saturated
  gold where the model throws a pale pink. That is the glass palette and the
  indoor exposure together, and it is the next thing to decide.
- Generators work in their own frame with `z` as the axis; the world is y-up and
  placement rotates. The mathematics stays clean.
- Deferred from phase 0: wrap-lighting / thin-edge scattering on the plaster.
  Pure Lambertian white reads as paper, but patching three's shader chunks is
  version-fragile and belongs with the phase 1 look work.
- Instanced meshes carry their kind as a `name`, so a frame can be interrogated
  rather than guessed at: raycast a pixel and ask what it hit. That is how the
  bosses were caught pretending to be cylinders.
- The canopy was fixed by measuring it rather than by looking at it. Run
  `window.harness.census()` in the console: it gives the share of the frame each
  kind of surface covers and how fragmented the picture is. A view up the
  central nave whose largest object is the *aisle* vault is a view of the wrong
  thing, and the number says so where squinting at the render does not.
- Ambient occlusion is load-bearing here, not a garnish. One white Lambertian
  plaster under a near-uniform sky probe has almost no shading of its own, so
  without it the inside of a twenty-metre funnel is exactly as bright as the
  outside. It runs at half resolution: how much sky a point can see does not
  change from one pixel to the next.
- The pavement draws its joints analytically from world position — no texture,
  so nothing to filter and no moiré. Each line knows its own filter width and
  retires once a whole slab is down to a few pixels, which is what makes ninety
  metres of receding floor survive a grazing angle. The grid is the building's:
  1.25 m slabs, a heavier joint every 7.5 m running through the column axes, and
  inside the apse it turns polar about the apse centre, where its rings land on
  the presbytery ring at 15 m and the ambulatory at 22.5 m unasked.
- Gaudí's own published plan **does not draw the transept projecting**.
  Measured off it — the scale bar gives 7.03 px to the metre, and on that
  scale the column lines land on ±7.5, ±15 and ±22.5 to within a quarter of a
  metre, which is what makes the rest of the reading trustworthy — the body
  walls run straight from the Glory end to the chevet, and the published sixty
  metres is made up by seven and a half metres of wall, chapel and stair
  turret on each flank rather than by an arm you can stand in. Both readings
  give the same outside width. This model takes the arm, because a transept
  you can walk across is the thing the plan is for; the other reading is
  recorded in the design doc rather than lost.
- The envelope held the walls **from the inside only** until phase 5, and that
  was deliberate: it used to clamp any camera to the nave's rectangle whether
  or not it was in the nave, which was harmless while the outside was a grey
  disc nobody stood on and fatal the moment phase 4 put a viewpoint on the
  pavement — the Nativity view, set seventy metres clear of the wall, was
  dragged through it and dropped in the aisle. Walking out through a wall was
  the smaller lie, and it stayed the answer right up until there was ground
  outside to walk on. The moment there is, it stops being small: you can walk
  into the building through its flank and the doors are decoration. So the
  same plan is now held twice — once at the inner faces, which keeps a walker
  in, and once at the outer, which keeps one out — and the only way across is
  a doorway.
- **A door is a window with no glass in it.** The walls of this building have
  never had a hole cut in one: a wall with windows is a frame around openings,
  and building it that way keeps the no-boolean rule and gives the silhouette
  a cut wall would have had. A doorway is the same frame with the panes left
  out, which is one optional flag in a register, and the jambs, the lintel and
  the reveal come out of machinery that was already there.
  Where they go is not a taste question either. A door has to be in the gap
  between two piers of the front standing in front of it, so the front is
  asked where its portals are and the wall takes whichever of them fall within
  it. It falls out of the module that the Glory end gets four — two in the
  central panel and one in each inner aisle — that each transept front gets
  two, and that the outer aisles get none, because nothing stands in front of
  them. The mullion between the two doors of a front is exactly the width of
  the pier outside it, which nobody arranged.
- The podium's edge is a **flight of steps all the way round**, and that is
  what the plaza cost. A 1.35 m skirt was the right drawing while the ground
  outside was scenery; a walker turns the same edge into a wall you can see
  over and are stopped by for no reason you can look at. Every ring of the
  flight is the building's own outline asked for again with a bigger apron, so
  the steps follow the Latin cross round its arms and its re-entrant corners
  for free, and the walker's test for which step it is on is the same set of
  outlines asked in the same order — the drawing and the collision cannot
  disagree, because they are the same function.
- Two boundary bugs fell out of having an outside to check the inside against,
  and one of them was two phases old. The hall is an **L** — the nave's
  rectangle and the arm laid across it — and a body outside both has to go
  back into whichever is *nearer*. Taking the arm whenever a body was merely
  wide of the nave, which is what it did, snapped a walker heading for the
  aisle wall two and a half metres sideways into the transept the moment it
  arrived; the mirror of that mistake, out on the plaza, offered a body
  pressed against the nave wall an exit through the side of an arm it was not
  level with — an exit costing less than nothing, which it took, and was set
  down inside the building.
- The plaster is `DoubleSide`, so **a face wound against its own normals is
  lit from exactly the wrong side** and nothing in the geometry says so: three
  flips the shading normal when a triangle faces away. The first towers were
  inside out and it took a sun ablation to find, because an unlit white tower
  looks exactly like a shadowed one. `tower.ts` now derives the winding from
  the normal it was handed, which makes the mistake impossible rather than
  merely unlikely.
- The frame census used to encode its surface id in the red channel alone, one
  step of 8/255 apiece, which holds **thirty-one kinds** and then silently
  wraps — every kind past the limit decoding as the same id. The building
  passed thirty-one kinds the day the towers arrived, and the census started
  reporting that one tower covered a hundred per cent of a nave frame. It is
  two channels and base 32 now. It also frames itself rather than borrowing
  the window's aspect ratio, because a regression frame that changes shape
  when you drag a window is not a regression frame.
- The sun rig fits an orthographic shadow map to the whole model plus the
  ground its shadow lands on, so the texel size is set by the largest thing
  built. The towers took the fit from a 108 m radius to 180 m, which at 2048
  coarsened every shadow in the interior from 10.5 cm to 17.6 cm to pay for
  eighteen objects nobody is standing next to. Going to 3072 bought most of
  that back — 10.3 to 20.0 cm over the fourteen curated suns, against 10.5
  before the towers — and it was still the wrong shape of answer, because a
  branch's shadow on a vault is a 5 cm feature and no single map that also has
  to hold a 172 m tower's shadow was ever going to carry one.
- So there are **two maps now**, and the second one follows the camera: the
  same sun, fitted to a sixty-metre box around wherever you are standing,
  2.9 cm to the texel — four to seven times finer, constant, over the only
  part of the building anyone is looking at closely. A receiver inside it uses
  it and one outside falls back to the wide map, cross-faded over the last few
  per cent of its width so the join is not a line across the floor. It carries
  its own, smaller depth bias, scaled by the ratio of the texel sizes: keeping
  the wide map's would lift every near shadow off the thing casting it.
  Measured, near map against wide: 12.5 % of the frame changes on the
  terraces and 8.4 % standing in a shaft, for 28 % and 12 % more gradient
  energy in those frames; the three distant exterior frames change by nothing
  at all, which is correct — at 96 m the building is not in the near map and
  should not be.
  Only the **occlusion** pass is doubled. The glass keeps one transmittance
  map at the wide fit, because a pane's colour is a low-frequency thing — a
  tint boundary is soft in the world and soft in the photographs — and a
  second one would cost seventy-five megabytes to sharpen an edge nobody can
  see. The volumetric pass reads the wide map too, for the same reason and one
  more: an air sample's visibility is soft, and thirty-two extra texture
  fetches a ray is a cost this environment cannot measure honestly.
- A shadow map that follows the camera **crawls** unless you stop it. Slide one
  continuously under a building that is not moving and every shadow edge in
  the picture boils, because each frame quantises the same world point into a
  different texel. The fix is to snap the map's centre to its own texel grid
  in the sun's frame, which takes two passes at placing the camera — one to
  establish the frame, one to round the centre in it. Checked rather than
  asserted: re-fitting the near map from three centres up to 15.8 m apart, in
  a frame where it decides a third of the pixels, changed **0.000 %** of them.
  It re-renders only once the camera has left the middle of the map, which
  walking does about every twenty seconds; dragging the hour slider was
  already re-running all of the sun passes on every frame.
- The volumetric medium is **indoors only**, and that is not a shortcut — it
  is the difference between the effect working and ruining the building. Dust
  hangs in a room; the street outside is swept. At the one density that makes
  the nave read, ninety metres of lit outdoor air has an optical depth near
  one, and the first version returned the Nativity front from the plaza as a
  white sheet. So the pass asks whether anything stands between a sample and
  the sky, which is one orthographic render straight down, and gets the
  building's whole stepped section for the price — thirty over the aisles,
  forty-five over the nave, sixty over the crossing, seventy-five over the
  apse — where no box would have been that shape. Measured over the thirteen
  curated frames, the four exterior ones gain between 0.0 % and 0.9 % of
  frame brightness and the interior ones between 2 % and 6.7 %.
- That roof map took two corrections, and both are the same mistake in
  different clothes: **asking what is overhead is not the same as asking what
  roofs a room.** A bell tower is overhead for a hundred and seventy metres
  and roofs nothing, so the first map wrapped every tower in a vertical plume
  of haze — sixteen per cent of the view from the terraces, on a frame whose
  entire subject is a clean silhouette. The towers are on their own layer
  now and the map is taken from just above the tallest vault. Then the map
  was max-filtered to stop the skylights from punching air-free chimneys down
  the middle of the best shafts in the building — and a dilation grows the top
  edge of every *wall* into an eight-metre roof too, which filled the terraces
  with haze all over again. It is a morphological **closing** now, dilate then
  erode: it fills what is enclosed and puts every edge back where it was.
- The volumetric pass is load-bearing in the composer chain, which is not
  obvious from its name. It needs the scene's depth, and a post chain
  ping-pongs between two buffers whose depth is scratch — sharing one depth
  texture between them so the scene's depth always lands somewhere readable
  earns *feedback loop formed between framebuffer and active texture* on
  every frame, because compositing into a buffer while sampling the depth
  attached to it is reading and writing one framebuffer at once. So the scene
  renders into a target of its own and the shaft pass is what puts it into
  the chain. Turning the air off skips the march and keeps the blit.
- Jumping to a curated viewpoint used to carry the walker across the
  teleport. Groundedness is a continuous quantity that decays over about a
  second, and the settle it drives pulls toward the floor in proportion to
  it — so a jump from standing in the nave to the viewpoint thirty metres up
  on the terraces arrived still nine tenths a walker and was hauled twenty
  metres back down, landing in the aisle *under* the terrace it was asked to
  stand on. The regression harness never saw it because the harness turns
  grounding off to take its frames. All thirteen viewpoints now land at zero
  drift with grounding on, which is the state the app actually runs in; the
  one exception is the apse view, which settles half a metre onto the
  presbytery platform, and that is the envelope doing its job.
- `material.envMapIntensity` does nothing in this project and never has. Where a
  material has no `envMap` of its own and the scene has an `environment`, three
  overwrites that uniform with `scene.environmentIntensity` every frame, so the
  per-material values in `materials.ts` are decorative. The pavement takes the
  sky out of its ambient in the shader instead, which is where the floor's blue
  cast was coming from.
- **The room's colour was on its stone instead of in its light, and the two
  great surfaces had theirs exchanged.** A sideways-facing surface had its
  window light computed as a mix toward `ROOM_LIGHT`, so three quarters of
  everything lighting every column in the building was one constant amber
  — whatever colour the glass was, and whether or not any light was
  arriving through it. The shafts came out at 0.55 to 0.70 saturation
  against a photograph's 0.046 to 0.28, and the canopy overhead, which
  every photograph shows as a field of gold, came out white. It is not the
  albedo and not the film: set every interior stone to grey, the film flat,
  both glass tints to white, and the sun and the occlusion off, and the
  columns stay brown and the vault stays white through all of it. A shaft's
  fill is mixed toward white now and the gold is left to the faces that
  look at the floor and the canopy. See `docs/interior.md`.
- **One flat number was the whole of the light indoors.** Switched off in
  turn on a frame down the nave: the glazing's shadowed wash rig moved the
  saturation by two thousandths, ambient occlusion from 0.55 to 0.9 moved
  the median by one thousandth, and the hemisphere moved nothing at all.
  Turning off `uRoomGlass` — unshadowed, distance-invariant, pattern-free —
  took the share of the frame below eight per cent luminance from zero to
  twenty-eight and the contrast ratio from 2.3 to 107. A room lit by a
  constant has no shape in it. It is a third of what it was and the rig
  that knows where the windows are carries the room.
- **The flutes were a corrugation because the fill was.** A face turned
  along the nave got a seventh of what a face turned across it got, and a
  twisted shaft alternates between those two answers face by face — so a
  twenty-four-sided column read as bark. The ratio is under two to one now,
  a gradient from the near wall to the far one was added underneath it, and
  the exact crease normals lean half way toward the radial above the plinth.
- **A window with one lightness cannot both blaze and keep its colour.**
  Every pane sat at the same level, so every pane crossed the film's white
  point together and the gain had to be held at 1.7 to stop the wall going
  white — which meant nothing in the building was ever the brightest thing
  in it. A tenth of the quarries are near-clear and clip; the rest are deep
  and keep their hue at the same exposure, and the gain is 6.
- **The vault was lit by a constant and nothing reached it.** Switching the
  wash rig off changed the canopy by nothing whatsoever, to the byte, and
  occlusion moved it by four parts in 255 at any radius. The rig runs along
  the two horizontal axes and a soffit faces those edge-on; above the
  clerestory heads there is no opening for it to see in any case. Leaning
  the headings upward does not rescue it either — traced back from a column
  flank at ten metres, a thirty-degree tilt leaves the building below
  ground, so every column goes dark to buy the vault. Light landing on a
  downward-facing surface must be travelling *upward*, and no window emits
  any. What does is the floor: one orthographic pass straight up, nine taps
  spread four and a half metres because a soffit forty-five metres up sees
  nearly the whole plan at once, and the floors excluded from their own map
  by name. The canopy gains half as much light again and, far more to the
  point, gains shadows.
- **The nave's vault is not 2.4 times its columns.** That figure had been
  quoted here for two rounds and is wrong. Measured on `in-nave-axial-
  canopy`, vault patches at 50 and 116 against column patches at 71 and 40
  give **1.50**; the render sits at 1.66. Surface figures are taken by
  blacking out every albedo but the one being measured and reading the frame
  back — there is no global illumination here, so a black neighbour changes
  nothing about how the kept stone is lit, and it is exact where a
  hand-placed sample box is a guess about what it landed on.
- **Colour stops being a stain once there is modelling under it.** The same
  canopy saturation that read as a terracotta ceiling while the vault was
  one flat tone reads as gold light on pale stone now that the floor casts
  shadows on it. Nothing about the colour changed.
- **A floor is a plane, not a lamp underneath.** The pass above weighted it
  by `max(0, −n.y)`, which is zero for every vertical surface in the
  building — so the columns took nothing at all from it. The form factor
  to an infinite plane below is `(1 − n.y) / 2`: unchanged for a soffit,
  one half for a shaft. It is split in two where the confidence splits,
  because nine taps across nine metres cannot see that the far floor of
  this room is behind a colonnade, and a standing face asks about three
  metres of floor three metres out along its own heading rather than the
  nine metres under its own feet. Worth checking what else was keyed to
  up-or-down: `uRoomFloor · max(0,−n.y) + uRoomSky · max(0,n.y)` is zero at
  `n.y = 0` too. Every term standing for "the room" skipped the one
  orientation the room is mostly made of.
- **The floor's colour is a soffit's, not a shaft's.** Given to a column
  unchanged it put the building's gold straight back onto the one surface
  the photographs insist is neutral, and column saturation went to 0.63 —
  worse than before any of this started. A soffit hangs over one bay and
  takes its colour; a shaft stands in the floor's own plane and sees a
  hundred metres of pavement at a grazing angle, both halves of the glazing
  at once, which averages to grey. Pooled at 0.85 for a standing face and
  not at all for a soffit.
- **A new source means the constant it replaces has to give the light
  back.** `uRoomGlass` was fitted when the floor could not reach a column,
  so most of what it was worth on a shaft was never the window. Left at
  0.8, the room was lit twice: half a stop brighter and the contrast from
  5.8 to 2.9. At 0.3 the picture holds and what the term still does is the
  near-wall-to-far-wall gradient, which is its own. Folding the floor into
  `covered` instead — the factor that fades the fill where the rig
  supersedes it — reads well and is wrong: the fill and the rig are two
  accounts of the same light, the floor and the window are two lights that
  add. Tried; `uRoomGlass` switched off then changed the frame by a tenth
  of a per cent.
- **The clerestory is level with what it lights, not under it.** The first
  build of the tilted pass was aimed at thirty-eight degrees off the
  glazing's bounding boxes and an assumed vault height, and contributed
  nothing at eighty times its gain. Casting rays up through the model gives
  the clerestory at y 33–41, the nave soffits at 36–42 and the aisle roof
  at 31.7 — so the light crosses sixteen metres of nave climbing four.
  Fifteen degrees threads all three; twenty lands on the terrace above the
  vault.
- **One pass in the glazing's rig has to know the hour.** The rest does not,
  on purpose — a window is a hundred square metres of sky and the sky is
  there all day. But a clerestory with a sunlit aisle roof under it and one
  in shade are not the same window, and thrown equally the model put
  mint-green blooms across a canopy the photograph shows gold from one end
  to the other. A dot product against the wall each pass enters through,
  floored at a tenth. No map is rebuilt; only the weight on two of them.
- **The mean is the wrong instrument for a bloom.** The tilted pass is worth
  about five per cent of the canopy's mean, which is not what it is for:
  the canopy had no *direction* in it, so a twenty-facet fan came back as
  twenty copies of one tone. Driving its gain by the vault's p99 ÷ median
  spread until it matched a photograph's 2.1 reached the number at a
  setting that prints the window on the ceiling instead of throwing light
  at it. The measurement was right and the population was wrong.
- **The line you are asked for is not always the line that carries it.** The
  item left open after the pass above was that the two horizontal wash
  passes were blind to the hour, on the reasoning that the rig carries most
  of the interior's light. It does — on a wall facing a window across an
  open span. Ablate the terms feeding a *column* shaft and the floor is half
  of what lights it, the flat fill is a fifth, and the rig is one per cent,
  for the reason `uWashCover` already gave: it can only light what has an
  unobstructed line to a window, and most of a colonnade does not. Weighting
  the pair moved a column by 0.002. The weight was still right; it was just
  not the fix.
- **A photograph read by eye is not a measurement.** The foreground columns
  in `in-nave-passion-1330-dec2025` look grey, which is the whole reason the
  complaint was phrased as "cooler than the photograph". Sampled, they are
  86 52 34 — gold at 0.43 warm, 0.60 saturated — and they read grey because
  they stand against a wall at 0.61 and a window at 1.0. Exactly one thing
  in that frame is neutral, the vault sail in the top-left corner, and it is
  lit by the clerestory rather than by the wall.
- **Grey is not a primitive; it is what two halves average to.** A shaft's
  floor light is pooled to a neutral because a column in the floor's own
  plane sees a hundred metres of pavement lit through both halves of
  Vila-Grau's scheme at once. True while both are lit. At half past one in
  December one is in its own shadow and that hundred metres is gold end to
  end, so the pooling target becomes the two window colours in the
  proportion the hour gives them — divided by the proportion the even hour
  gives them, so the fitted hour is untouched and only the clock's part
  remains. Every Passion frame warms, every Nativity frame cools, every
  exterior is unchanged to a thousandth.
- **Relaxing a term is not the same as steering it.** The first mechanism
  tried was to weaken the pooling itself when the hour is one-sided — if
  there is only one half to average, do not average. The argument is sound
  and the mechanism is not: the pooling holds back two different things at
  once, the far half's window colour and the pavement's own sandstone. Let
  it go and a June morning under the *green* glazing came back two thirds
  saturated and hotter than the December frame it was meant to be the
  opposite of. Not the hour's light — the room bounce with the lid off.
