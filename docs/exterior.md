# The outside, and why it reads as a maquette

*Design note, 20 September 2026. The colour phase is done and the interior
holds up against the author's own frames. The exterior does not: from the
plaza the building reads as a plastic model on a museum base. This is the
diagnosis, measured, and the plan.*

## What the photographs have that the frame does not

Everything below is measured off the reference frames in `reference/` and the
harness shots in `reference/.shots/`, sampled with PIL over a patch of the
surface named. sRGB, then hue / saturation / value.

| Surface | Photo | Render |
| --- | --- | --- |
| Passion belfry, December sun | 159 139 122 · sat 0.23 | 192 184 172 · sat 0.10 |
| Passion belfry, April sun | 119 107 95 · sat 0.20 | — |
| Nativity tower, 1920s stone | 77 66 64 · sat 0.17 | 176 168 159 · sat 0.10 |
| New central towers, panel stone | 157 151 143 · sat 0.09 | 192 184 172 · sat 0.10 |
| Sky, December | 26 72 111 · hue 208 | 43 92 127 · hue 205 |

The sky is matched. The stone is thirty points too bright and half as
saturated, and — the larger fault — it is one number. The building is not one
number. It has at least five fabrics, and a visitor reads the ages of them
before anything else:

1. **The Nativity front and its four towers**, 1894–1930, soot-black Montjuïc
   stone with pale mortar. Darkest thing in the skyline.
2. **The Passion front and its four**, 1954–1976, pale honey sandstone.
3. **The portico and the new work on the Passion**, white stone, near-neutral.
4. **The six central towers**, 2016 onward, prefabricated stone panels: grey,
   flat, seamed in triangles, with the tower of the Virgin faced in a diamond
   tessellation.
5. **The pinnacles**, Venetian glass mosaic — the only colour on the building —
   and the cross, white glazed ceramic that catches the sun like a tooth.

The model has one material for all five: `facade`, 0xd8cab4, roughness 0.88.
The pinnacles are white lumps, the cross is white plaster, and the terrace lids
are the same stone as the belfries.

A sweep of that one albedo, live in the harness at the December porch view,
against the photograph's belfry:

| Albedo | Belfry in sun | Saturation |
| --- | --- | --- |
| 0xd8cab4 (now) | 164 155 144 | 0.12 |
| 0xb8a68c | 149 136 120 | 0.19 |
| 0x9c8668 | 134 115 92 | 0.31 |
| 0x7a6858 | 109 91 76 | 0.30 |

So the Passion stone lands at about 0xb8a68c and the Nativity a shade under
0x7a6858; the sweep is the film pass and the sky doing the rest, which is why
it is done live rather than solved.

## Why it is a model and not a resolution problem

**It is not made of pieces.** Every exterior surface in the photographs is
laid stone, and at the distances anyone stands from this building the laying
shows: courses 0.3–0.6 m tall, blocks 0.6–1.5 m long, a joint every few pixels
even from the far side of the plaza. On the Nativity the joints are *lighter*
than the blocks. The belfries are rings of masonry; the new towers are large
triangular panels with visible seams. The model's grain — nine per cent at
1.8 m and 30 cm — is invisible at exterior exposure from anywhere outside the
building. A smooth surface at that size is an extrusion, and an extrusion is a
3D print.

**The belfry has the wrong rhythm.** Counted on the crops: the Passion belfry
carries about twenty-two rows of openings above the *Sanctus* band and the
Nativity's about forty; each opening is short and wide, sits in a channel
between two continuous ribs, and carries a heavy sloping stone lintel. The
pattern is horizontal — a ladder — and the lower two fifths of the shaft is
solid, with slit windows and the inscription. The model has eleven rows of
five-metre lozenges over ninety per cent of the shaft, 42 % of a bay wide, in a
helix: vertical black stripes. The stripes are the second thing a viewer sees
after the colour.

**The light has no middle scale.** Cast shadows are there and ambient occlusion
runs at a three-metre radius; nothing lights the five-to-twenty-metre scale.
In every photograph the inner flanks of the four towers are darker than the
outer, the portals are caves, and the wall under a cornice is a band of
shade. In the render the sky fill is one uniform number (`uSkyFill` 3.2) on
every outdoor face, and sun and shade are a few points apart.

**The crowns are white.** Pinnacles, cross and star are the same plaster as
the shaft. The pinnacles are the one place the real building is red and gold.

**The base board.** Spheres on sticks, a flat plane, a blue ellipse. A cathedral
seen across bare ground is an object on a table; every reference frame has it
seen *through* something with an edge.

**The crust is bubbles.** Six hundred ellipsoids on the Nativity piers read as
a rash, not as sculpture. At plaza distance the sculpture of that front is
dark cavities and drip forms, not figures.

## The plan

Seven steps, ordered by what they buy for what they cost. Each has a bar
that is a number off a photograph, in the project's habit.

### 1. Five fabrics, not one · half a day

Split `facade` into the ages: `nativity` (about 0x6e5e50, pale joints),
`passion` (0xb8a68c), `white` (portico, Glory), `panel` (central towers, about
0xc4bcb0, roughness 0.75), `mosaic` (pinnacles, vertex colour in red / gold /
white, roughness 0.3) and `enamel` (cross and star, white, roughness 0.2).
`towers.ts` knows which front a tower belongs to and `shell.ts` knows which
front it is drawing, so the assignment is a lookup, not a judgement.

*Bar:* the three sampled fabrics within ten points of the photo table and
saturation within 0.05.

### 2. The belfry, from the crop · two days

Rebuild the aperture mask from the photograph. Rows on 1.4 m centres, so
twenty-two on the Passion and thirty-four on the Nativity, with the count a
parameter of the front. One channel per valley of the twelve-point star, ribs
continuous. Openings 0.55 of a row tall and 0.5 of a channel wide, each with
a **lintel**: the louvre panel turned to a sloping hood at the head, which
catches sun on top and throws a shadow into the slot — that repeated shadow is
the ladder. No helix: the rows are level. Lower 40 % solid, with three slit
windows a face and the *Sanctus* band as a raised ring of blocks. Central
towers: a faceted skin — flat triangles between the rib lines, no smooth
normal — with narrow slit windows three or four to a facet, and the tower of
the Virgin seamed in diamonds. Pinnacles get their profile from the crop: a
stem, a ring of discs, a ball.

*Bar:* row count within two of the photo on the same crop; aperture area
fraction within 20 %.

### 3. Masonry in the shader · one to two days

Courses at 0.45 m in world y; block length 0.6–1.5 m, offset half a block per
course; a 4 cm joint drawn as a darkening plus a normal nudge from the joint's
gradient, so a course line catches the sun as a line and not as a stripe of
paint. Contrast per fabric: joints darker than Passion stone, lighter than
Nativity stone. Towers get a cylindrical frame (angle, height) as a UV from
`tower.ts` so courses ring the shaft and blocks narrow with it; panel towers
get triangular seams at 2.5 m instead of courses. Every line retires by its
own filter width the way the pavement's do, or the towers will moiré from the
plaza. Then weathering, which is where the age lives: soot that deepens
upward on the Nativity, rain-wash that lightens upward-facing stone, streaks
below every sill and string course, and darkening in proportion to occlusion.

*Bar:* gradient energy on a tower crop at half the photograph's, against
about a tenth now.

### 4. Light at the scale of the group · one day

Three analytic terms, no bake. (a) Sky occlusion by the tower group: the
eighteen towers as capsules in a uniform array; each outdoor fragment shrinks
its visible sky by the solid angle its neighbours subtend. (b) Cavity: a
fragment behind the front plane and under an arch head darkens with depth,
which is the portal cave. (c) `uSkyFill` down toward 2, with the sun/shade
ratio checked against a matched pair in the photo; and ambient occlusion
radius that scales with the viewer's distance, so the half-res pass does
something from ninety metres.

*Bar:* sun/shade ratio on a matched face pair within 20 % of the photo.

### 5. A photograph, not a frame · half a day

Classic Chrome has grain; the film pass gets it, plus a vignette and a
quarter-stop of halation into the sky at the silhouette. The exterior
viewpoints move to the lenses the photographs use: 24–28 mm equivalent, from
the pavement, looking up.

### 6. The ground it stands on · one day

Trees as crossed alpha-tested quads with a procedural leaf texture in two
heights, so a tree has an edge rather than a surface; kerbs and the paving
module on the plaza; lamp posts and railings for scale; the pond with a
screen-space reflection of the sky and the front.

### 7. The Nativity's light, not its figures · one day

Replace the crust with what the sculpture *does* to light: three portals
recessed five to seven metres under the hoods, dark inside; archivolts as
fringes of hanging cones; the cypress as a green cone flecked white; the
bridge between the two central towers. The no-figures rule stands.

## Order

1, 5, 2, 3, 4, 6, 7. The first two are hours and change every exterior frame;
the belfry is most of every exterior frame; masonry is the claim that the
building is made of pieces; the light is what makes the pieces sit in a group.
The base board and the Nativity's caves are last because they are the least
of what a visitor sees, and the most work per pixel.

## Risks

- Masonry lines alias at distance. The pavement solved this once with
  per-line filter widths; the same machinery, not a new one.
- More geometry on the towers: twenty-two rows by twelve channels by the
  detail levels. Instanced already, one kind per tower shape, and the shadow
  maps see all of it. Measure the frame time at the plaza before and after.
- The program cache keys off the patch string; a sixth stone with its own
  patch needs its own key or it silently borrows another's shader.
- Winding on the new belfry cells is derived from the handed normal, which
  is what made the first towers' inside-out mistake impossible to repeat.
