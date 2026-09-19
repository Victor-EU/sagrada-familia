# Sagrada Família in 3D

A browser app for flying around Sagrada Família and walking through its interior.
Geometry is **generated from Gaudí's own ruled-surface rules**, not downloaded as
a mesh — the real vaults are hyperboloids and the real columns are intersections
of counter-rotating prisms, so computing them is the same construction the
builders use. Photographs are the acceptance test, not the source.

Design doc: the reasoning, the surface families, the light model and the scope
phases live there. This README covers running the code.

## Status: phases 0 to 3 complete

Each phase carried its own bar. Phase 0: *you can load a photo, match a camera
to it, and tune a parameter live.* Phase 1, the nave bay and the go/no-go: it
passed on light and material and failed on framing, because one cell is open at
both ends and a third of an eye-height frame came back sky. Phase 2 tiled that
cell into a nave. Phase 3's bar was *the interior is continuous and navigable
throughout*, and it is met — 96.8 m of walk from the Glory wall to the chevet,
at a constant 1.65 m, stopped only where the plan says.

Phase 3 began by taking phase 2 apart. Three of the nave's numbers were wrong
and the Basilica's own information booklets say so: the column grid is 7.5 m in
**both** directions, so the nave is 45 m long and not 90; 90 is the whole
church, being 45 of nave, 15 of crossing and 30 of apse; and the central nave is
eight-pointed grey granite, not the ten phase 2 argued itself into. With the
grid right the crossing places itself — four columns of red porphyry at the
corners of a 15 m square and eight of basalt around them, which is the twelve
the sources count.

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
| Church assembly — nave, crossing, transept arms, Glory end | `src/plan/church.ts` |
| One transverse station and the cells between two of them | `src/plan/section.ts` |
| Apse — ten columns on a semicircle, ambulatory, drum, lantern | `src/plan/apse.ts` |
| Part registry, so every region shares one instanced field | `src/plan/parts.ts` |
| Tessellation from feature size, not from typed-in counts | `src/geometry/detail.ts` |
| Instanced level of detail, switched on measured error | `src/render/field.ts` |
| Ambient occlusion — GTAO at half res, glass gated out | `src/render/scene.ts` |
| Frame census: what is in this picture, by surface | `src/dev/probe.ts` |
| Solar position for 41.40° N, 2.17° E, with CET/CEST | `src/light/sun.ts` |
| Analytic sky, and the environment light it casts | `src/light/sky.ts` |
| Coloured transmittance — sunlight that remembers the glass | `src/render/sunrig.ts` |
| Vila-Grau glazing: jittered panes, graded by height and side | `src/geometry/glass.ts` |
| Walls — stone frames, no holes cut; aisle and clerestory | `src/plan/clerestory.ts` |
| Nine curated viewpoints, on the number keys | `src/dev/viewpoints.ts` |
| Walk and fly as one camera, with a continuous transition | `src/camera/freecam.ts` |
| Envelope: a rectangle for the nave and a disc for the apse | `src/camera/envelope.ts` |

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
