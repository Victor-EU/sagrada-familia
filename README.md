# Sagrada Família in 3D

A browser app for flying around Sagrada Família and walking through its interior.
Geometry is **generated from Gaudí's own ruled-surface rules**, not downloaded as
a mesh — the real vaults are hyperboloids and the real columns are intersections
of counter-rotating prisms, so computing them is the same construction the
builders use. Photographs are the acceptance test, not the source.

Design doc: the reasoning, the surface families, the light model and the scope
phases live there. This README covers running the code.

## Status: phases 0 to 4 complete, phase 5 under way

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

| Built | Where |
| --- | --- |
| Hyperboloid generator — surface + straight generators | `src/geometry/hyperboloid.ts` |
| Photo-match overlay, letterboxed to the photo's aspect | `src/dev/overlay.ts` |
| Live parameter panel, camera and geometry presets | `src/dev/params.ts`, `src/dev/presets.ts` |
| Free-fly camera with vertical-line correction | `src/camera/freecam.ts` |
| Plaster maquette material, studio ambient, ACES tonemap | `src/render/` |
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
| Volumetric shafts — single scattering through the same two maps | `src/render/shafts.ts` |
| Roof map: where the air is indoors, from the stepped section | `src/render/roof.ts` |
| Vila-Grau glazing: jittered panes, graded by height and side | `src/geometry/glass.ts` |
| Walls — stone frames, no holes cut; aisle and clerestory | `src/plan/clerestory.ts` |
| Tower generator — paraboloid shaft, star section, pierced | `src/geometry/tower.ts` |
| The eighteen, on published heights and on the grid | `src/plan/towers.ts` |
| Shell — terraces, parapets, roof lanterns, the three fronts | `src/plan/shell.ts` |
| Thirteen curated viewpoints, on the number and letter keys | `src/dev/viewpoints.ts` |
| Walk and fly as one camera, with a continuous transition | `src/camera/freecam.ts` |
| Envelope: a rectangle for the nave, a disc for the apse, a terrace you can climb | `src/camera/envelope.ts` |

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
| 1–9, 0 | the curated interior viewpoints |
| N G T | the Nativity front, the Glory front, the terraces |

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
- The envelope holds the walls **from the inside only**. It used to clamp any
  camera to the nave's rectangle whether or not it was in the nave, which was
  harmless while the outside was a grey disc nobody stood on and fatal the
  moment phase 4 put a viewpoint on the pavement: the Nativity view, set
  seventy metres clear of the wall, was dragged through it and dropped in the
  aisle. Walking out through a wall is now possible and is the smaller lie.
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
- The sun rig fits **one** orthographic shadow map to the whole model plus the
  ground its shadow lands on, so the texel size is set by the largest thing
  built. The towers took the fit from a 108 m radius to 180 m, which at 2048
  coarsened every shadow in the interior from 10.5 cm to 17.6 cm to pay for
  eighteen objects nobody is standing next to. The map is 3072 now: measured
  across all thirteen curated suns that is 11.7 cm on the seven the interior
  was tuned against, against 10.5 before, and never worse than a fifth off the
  old figure — the worst case is a low June sun, where the ground shadow
  balloons and 16.3 cm becomes 19.7. Cascades are the real answer and are a
  phase 5 problem.
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
- `material.envMapIntensity` does nothing in this project and never has. Where a
  material has no `envMap` of its own and the scene has an `environment`, three
  overwrites that uniform with `scene.environmentIntensity` every frame, so the
  per-material values in `materials.ts` are decorative. The pavement takes the
  sky out of its ambient in the shader instead, which is where the floor's blue
  cast was coming from.
