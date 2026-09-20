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
through Vila-Grau's glazing, and the app opens on a nine-stop visit that starts
across the plaza and ends inside. The panel is still there behind `?dev` or the
P key; it is no longer the first thing anyone sees.



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
| Studio ambient, ACES tonemap | `src/render/scene.ts` |
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
| Fourteen curated viewpoints, on the number and letter keys | `src/dev/viewpoints.ts` |
| Walk and fly as one camera, with a continuous transition | `src/camera/freecam.ts` |
| Two-thumb touch controls, with a stick that appears under the thumb | `src/camera/touch.ts` |
| The address bar as the save format — a link to a moment of light | `src/share.ts` |
| Envelope: a rectangle for the nave, a disc for the apse, a terrace you can climb | `src/camera/envelope.ts` |
| Doors — a window with no glass in it, placed by the front in front of it | `src/plan/clerestory.ts`, `src/plan/church.ts` |
| A podium you can climb: the skirt as a flight of steps round the footprint | `src/plan/floor.ts` |
| The plaza as ground — the same plan at its outside faces, keeping you out | `src/camera/envelope.ts` |
| The visit: four stops outside, five inside, in the order you would walk them | `src/ui/journey.ts` |
| The interface — a title card, a caption, a rail, and nothing else | `src/ui/chrome.ts` |
| Light census: whether there is any modelling in this frame, in numbers | `src/dev/probe.ts` |

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

| | |
| --- | --- |
| click | capture the pointer for mouse look |
| W A S D | move; forward follows where you look |
| space / C | up and down |
| shift | 4× boost |
| scroll | movement speed |
| O | toggle the reference photo |
| X | difference blend — use this for edge alignment |
| `[` `]` | photo opacity |
| drop an image | load it as a reference |
| ← → | back and on through the visit |
| F | leave the visit and explore on your own |
| P | the parameter panel and the readouts (also `?dev` in the address) |
| L | copy a link to exactly this frame and hour |
| 1–9, 0, N D G T | the curated viewpoints — **only with the panel open** |

The curated viewpoints are the regression harness rather than the visit: they
move the camera without telling the caption, so they live behind the same
switch as the panel.

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

- Dimensions in `defaultHyperboloid` are placeholders. Real funnel sizes are an
  open question in the design doc and land here once photo-matched.
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
