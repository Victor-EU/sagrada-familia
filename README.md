# Sagrada Família in 3D

A browser app for flying around Sagrada Família and walking through its interior.
Geometry is **generated from Gaudí's own ruled-surface rules**, not downloaded as
a mesh — the real vaults are hyperboloids and the real columns are intersections
of counter-rotating prisms, so computing them is the same construction the
builders use. Photographs are the acceptance test, not the source.

Design doc: the reasoning, the surface families, the light model and the scope
phases live there. This README covers running the code.

## Status: phase 0 complete, phase 1 in progress

Phase 0's bar was: *you can load a photo, match a camera to it, and tune a
parameter live.* All three work, plus the straight-line ruling view.

Phase 1 is the nave bay — the go/no-go. Columns and the branching node are in;
the vault, glass and the coloured transmittance pass are not yet.

| Built | Where |
| --- | --- |
| Hyperboloid generator — surface + straight generators | `src/geometry/hyperboloid.ts` |
| Photo-match overlay, letterboxed to the photo's aspect | `src/dev/overlay.ts` |
| Live parameter panel, camera and geometry presets | `src/dev/params.ts`, `src/dev/presets.ts` |
| Free-fly camera with vertical-line correction | `src/camera/freecam.ts` |
| Plaster maquette material, studio ambient, ACES tonemap | `src/render/` |
| Double-twist column, all four orders, from the published rule | `src/geometry/column.ts` |
| Branching node — ellipsoid knots, orders stepping down by level | `src/geometry/branch.ts` |

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
