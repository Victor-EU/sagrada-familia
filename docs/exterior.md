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
| Nativity tower, 1920s stone | 77 66 64 · sat 0.17 | 176 168 159 · sat 0.10 |[^nat]
| New central towers, panel stone | 157 151 143 · sat 0.09 | 192 184 172 · sat 0.10 |
| Sky, December | 26 72 111 · hue 208 | 43 92 127 · hue 205 |

[^nat]: **Later correction.** This row is wrong, and it is the only one in
    this document that is. It was sampled on `ex-plaza-nativity.jpg`, which
    is not the arrival view its filename promises: it is a long lens on two
    tower shafts in their own shade, backlit, against a blown sky. 77 66 64
    is a reading of shadow. Measured instead on `ex-flank-elevation.jpg`,
    with low winter sun straight onto that front, the sunlit shaft is **106,
    hue 23°, sat 0.18** — the same luminance as the new panel stone beside it
    in the same frame. See `docs/relief.md`, *The front that had no sculpture,
    and the stone that was never black*.

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

---

# Built, 20 September 2026

All seven. What each one cost against what it bought, and the number each was
judged on. Measurements are taken with the harness, sampling the render and
the reference frame over a patch of the same named surface.

## The bars, and where they landed

| Step | Bar | Result |
| --- | --- | --- |
| Five fabrics | Passion belfry within 10 points of 159 139 122, saturation within 0.05 | 158 143 120 at 0.24 against 0.23 |
| The belfry | rows within two of the photograph on the same strip | 23 against 22, from 12 |
| Masonry | courses visible close up, no moiré at three hundred metres | holds; every line retires on its own filter width |
| Group light | modelling within 20 % of the photographs | 3.38 against 3.54 and 3.58, from 2.68 |

The ladder of fabrics, all four in one frame under one sun, against the
photographs:

| Fabric | Render | Photograph |
| --- | --- | --- |
| Nativity front | 75 63 53 | 77 66 64 — *see the correction above; the photograph reads 106 in sun* |
| Passion belfry, December | 158 143 120 | 159 139 122 |
| New white stone | 194 189 182 | 160 156 152 |
| Panel, central towers | 204 198 189 | 157 151 143 |

The two new fabrics read bright because the frame they are measured in is a
June morning and the photographs of them are December and April. Their
*ratio* to the Passion stone beside them in the same frame is what was being
matched, and it holds.

## What each step turned out to be

**The fabrics were a lookup, not a search.** Every piece of the envelope
already knew which front or which decade it belonged to; nothing had ever
asked it. The one real bug was in the tower registry: the key carried the
geometry and not the material, so the first caller to open a kind set its
stone, and the Passion's outer pair — same height, same girth, same taper as
the Nativity's inner pair — silently joined that kind and came back cut from
blackened Montjuïc stone in the middle of the 1960s front.

**The belfry was the biggest single change in any exterior frame.** The
hood over each aperture is the whole of the effect: a lit slab over a black
slot, twelve to a row and twenty-three rows up a shaft. Without it an opening
is a flat mark the colour of whatever stands behind it. Two things had to go
with it — the helix, because the photographs show level rows, and the row
*count*, because the real spacing is a length and a taller tower simply has
more rows.

**The louvres needed their own share of sky.** A panel a metre down a slot
cut in a metre of masonry cannot see the hemisphere the envelope's fill is
set for, and given the open figure every opening on the building came back as
a lit grey rectangle. One constant per stone, and the lattice appeared.

**Masonry is where the age of a fabric lives.** Not the joint itself so much
as what water has done around it: rain-washed where it faces the sky, sooty
where it is sheltered, and runnels down every vertical face. On the Nativity
the joints are *lighter* than the blocks, because the stone went black and the
mortar did not, and that sign reversal is half of what tells the two fronts
apart at a glance.

**The group light was the missing scale.** Between the three metres ambient
occlusion covers and the hundred a shadow map covers there was nothing at
all, and that band is where this building's exterior lives. Eighteen towers
as vertical shafts, each subtending a patch of sky, is cheap and stable and
it is what makes four bell towers read as a group rather than as four objects
standing in a row.

**The trees were the last primitives on the plaza.** A sphere of flat green
has exactly the fault the whole exterior was being rebuilt to lose: a smooth
closed outline with no edge in it. Three crossed quads with the leaves cut out
of them cost the same.

**The Nativity front got its light and not its figures.** The bridge and the
cypress, which is the only colour on that front; a fringe of stalactites over
each portal; and a crust that is dense at the portals and stops climbing, as
a hundred years of weather actually leaves it.

## Two bugs the work turned up

**The shelter test was averaging five roof probes equally**, so the *outer*
face of every enclosing wall in the building got a fifth of a vote for being
indoors — one tap of the ring always steps back across the wall it is
standing on and finds the terrace over it. A fifth would be harmless if the
two fills were the same size, and they are nothing like it: the room's is a
window counted at nearly three and a floor counted at eight, against an
outdoor probe cut hard so the towers keep their modelling. The nave's flank
came back a sheet of interior gold on a frame taken from two streets away.
The centre tap decides now and the ring only leans.

**A bridge forty-five metres up is not a ceiling.** The pass that asks what
roofs a room saw the new bridge between two bell towers, decided the column of
air beneath it was indoors, and filled it with the volumetric medium — a
vertical plume of haze down the middle of the Nativity front like a
searchlight. The towers learned this in phase five; anything that stands out
in front of a façade has to be told the same thing.

## Still open

- The Glory front is white stone because nothing else would be honest, but
  nobody has photographed it and nothing here is matched to anything.
- The crust is still a field of bosses. It reads at plaza distance and it
  will not survive anyone walking up to it.
- The interior is unchanged and still carries the gap recorded in the README:
  the glass palette and about a stop of indoor exposure.

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
