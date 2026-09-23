# A visitor went round it, and then went in

*A visit, 21 September 2026, at f4284d1. Not a measurement round: one
person who knows the building, sent to the app cold to walk round it, go
in, and say where it held and where it let go. Driven with a real mouse
and keyboard in a headless Chrome at 1600 × 913, because the desktop
browser pane could not paint, and served from a copy of the tree because
the live dev server was reloading under another session's edits. Every
moment below is a link, which is this app's own way of citing a frame —
paste it into an open tab and the camera goes there.*

## What held

**The cover.** Chains that drop, settle and turn over into towers, under
*my client is not in a hurry*, is the right thing to be looking at for the
six seconds the stone takes to cut.

**The opening frame.** `#at=146.63,2.05,9.32&look=1.3811,0.3865&lens=58,0.45&sun=172,10`.
Nativity front across the pond, cypress, bridge, two cranes, lamp posts to
say how big it is, and the morning on the right face. Recognisable at a
glance, and the phone layout of the same frame is clean — title, quote,
door marker and dial all where they should be at 390 wide.

**Evening at the crossing.** `#at=5.66,1.65,-26.25&look=1.5708,0.5317&lens=74,0.5&sun=172,19.9`.
With the dial at 19:54 the Passion glazing floods the nave with pink and
orange shafts. That is the phenomenon people come for, and it lands.

**The vault from below.** `#at=1.18,1.65,-26.25&look=1.5708,1.5698&lens=74,0.5&sun=172,9.8`.
Hyperboloid cells, star openings, trunks branching into them, air crossing
between. Geometrically the most Gaudí frame in the app.

**Links.** Pasting a moment moved the camera without a reload every time,
the hour on the dial came back, and the L toast said so.

## What let go

Ordered by how much of the visit each one cost.

### 1. The flight lands you in the door jamb

`#at=43.19,1.52,-26.25&look=1.5708,0.4321&lens=60.6,0.46&sun=172,10`.
Nine seconds of approach end standing between two piers of the Nativity
portal, looking at coursed masonry with the nave a slot down the middle.
The one moment a visit to this building is for — stepping in and the vault
opening over you — never happens; you have to know to press W. The landing
wants to be a few metres inside with the gaze lifted, and the walk-in
should be the flight's last second, not the visitor's first job.

### 2. "Scroll to come closer" has no floor and no wall

From the orbit the app leaves you in after stepping out,
`#at=-206.74,32,-26.25&look=-1.6067,0.1484&lens=58,0.45&sun=172,19.9`,
eight wheel ticks with the cursor on the Passion porch put the camera at
`#at=-15.05,0.85,-27.12&look=-1.8457,1.1307&lens=58,0.45&sun=172,19.9` —
inside the transept, 0.85 m off the floor, looking 65° up, still in orbit
mode — and six more at
`#at=21.25,0.85,-11.17&look=-4.0504,1.4562&lens=58,0.45&sun=172,19.9`,
looking straight up at the canopy from ankle height. With the cursor on the
lawn instead, six ticks rose to 12 m and pitched down to stare at grass.
The zoom toward the picked pivot in `src/camera/viewer.ts` needs a minimum
standoff and the envelope, the same way the walker has one. (The accidental
frames are among the most beautiful in the app, which is its own finding:
a visitor is never offered the vault from the floor.)

### 3. The interior is a dark brown room

`#at=0,1.65,14&look=0,0.35&lens=60,0.5&sun=172,12`, the nave axis at noon,
against `reference/in-nave-axial-from-floor.jpg`. Every shaft reads near
black at every hour of the day and the canopy reads rust, where the
photograph has pale grey trunks under a cream vault with gold only at the
crossing. The interior everyone remembers is bright. `docs/interior.md`
moved the colour off the stone; the value is still on it.

### 4. Direct sun through the glass goes white

`#at=-16.5,1.65,-33.22&look=0.2708,0.5317&lens=74,0.5&sun=172,19.9`. Beside
the Passion windows at evening a whole column face clips to pure white and
the haze takes a third of the frame with it. Vila-Grau's glass colours that
light; it should never bleach it. One frame earlier, in the same light, the
crossing was the best thing in the app — the two are ten metres apart.

### 5. Up close, the Nativity sculpture is boulders

From the plaza the rows of hooded uprights read as people, which
`docs/relief.md` argued for and which is true. The flight in then passes
them at about two metres, where they are stacks of hexagonal nuggets on
brick coursing. Either the flight keeps its distance or its middle is not
shown.

### 6. Escape does not step outside

It flies you 200 m away to an orbit at 32 m — the link under item 2. The
button says *step outside*; what it promises is standing under the Passion
porch with the door behind you, and the orbit can be one scroll away.

### Smaller, all seen

- The stranded *Go inside* / *Step outside* corner button sits on the
  *Antoni Gaudí* attribution for the seven seconds the intro is on screen,
  on any load that starts without a door in view — every link into the
  interior does.
- A pill-shaped object about two metres tall stands in the central nave
  near the crossing (visible in the noon link above, right of the axis).
- The plaza pavement shows moiré rings from the opening orbit heights.
- The hour is on the dial; the day is only reachable by editing the link.
- Clicking the dial focuses an input, and WASD is ignored until the canvas
  is clicked again.
- The console fills with Chrome's *throttling navigation* warnings, because
  `src/share.ts` rewrites the hash every frame while the camera moves.
- No favicon.
- Once, after walking into the transept corner at
  `#at=-17.68,1.65,-37.5&look=0.2708,0.5317&lens=74,0.5&sun=172,19.9` and
  turning through 180°, the page froze for over a minute and the walker
  came back 40 m away. It did not reproduce from the link and the drag
  alone. An unconfirmed sighting, recorded so it is not a surprise twice.

## Numbers

| | HEAD f4284d1 | working tree at the time |
| --- | --- | --- |
| Time to first frame, headless, Apple M3 | 6 s | 27 s |
| Interior frame rate, 1600 × 913 | 32 fps | — |

The uncommitted wash-rig change of the morning, since landed as 2ebbc19,
did not visibly alter the evening crossing frame, and added twenty seconds
to the build.

## Not looked at

Touch controls, and the photo-match loop, which is the harness's path and
not a visitor's.

---

# What was done about it

*Same day, after the visit. Six fixes were proposed off the notes above.
Three of them were built, one changed shape entirely once it was measured,
and two were withdrawn because the app did not do what the visit said it
did. What follows is the record of both, because a review that is only ever
confirmed is not a review.*

## Withdrawn, on the evidence

**The flight does not land in the door jamb.** The frame in item 1 was taken
mid-flight. Driven again and sampled every 200 ms, `enter()` puts the camera
at x = 18.15 on the transept axis, and the envelope answers `inside` from one
metre behind the door mouth — so the landing is fifteen metres into the room,
under the canopy, with the vault open overhead. The visit waited ten seconds
for a flight whose approach alone runs longer than that from the opening
frame. The aim was already lifted thirty degrees; nothing needed doing.

**The pill in the nave is a person.** It is the 1.65 m capsule in
`render/scene.ts`, placed at (2.6, 2.2) on purpose, with the comment *nothing
about a cathedral reads correctly without a body in the frame* over it. It is
the scale reference, and the visit was reading it as a stray lamp post.

**The per-frame step is already capped.** `main.ts` clamps it to 0.1 s, which
is 28 cm of walking. Whatever moved the walker forty metres, a long frame did
not.

**The hash is not being throttled.** Hooked and counted over a six-second
drag: fifteen `replaceState` calls, 2.5 a second, against a browser limit
four times that. The *throttling navigation* warnings in the console were the
review harness navigating, not the app writing.

**The pavement does not moiré.** At device pixel ratio 1 the plaza is clean;
the paving joints already fade under their own filter width. What the visit
saw was masonry at a grazing angle from inside the wall, reached by the bug
in item 2, and it is not reachable any more.

## Built

### The air was the brightest thing in the building

Item 3 blamed the film for the white column beside the Passion glazing, and
the film was innocent — it has had an AgX sigmoid over sixteen stops since
the grade went in. Ablating each pass in turn on that frame found it in one
step: with the volumetric march switched off the column goes from 239 238 235
to 118 123 130 and the share of the frame over eighty-five per cent
luminance falls from 15.0 to 1.6. Nine tenths of the picture in front of that
stone was air.

Two things were wrong with it, and the second is the one that mattered.

*It did not take part.* The march summed the lit air along the ray and
multiplied by the path length, so the air added light in proportion to how
far you could see and was never dimmed, occluded or exhausted — a medium that
only ever adds. It now carries transmittance: each step takes
`1 − exp(−σ ds)` out of what is still coming through, scatters that fraction,
and hands the rest on, and the compose step dims the scene behind by what is
left. On its own this was worth almost nothing, which is the useful part of
the finding: at an optical depth of 0.2 over forty metres, saturation and
extinction are both small corrections. The shape was not the problem.

*The magnitude was.* `phase` is normalised so an even medium returns one
rather than 1/4π — a deliberate choice, so that density means scatter per
metre with the sun to one side. But the number it returns is then 4π times a
probability density, and it was being multiplied by a *fraction of the beam*
without that 4π ever being put back: light was scattered toward the eye 4π
times faster than the medium removed it from the beam. A quarter, not a
twelfth, because `uSunRadiance` is what a Lambertian surface multiplies its
albedo by directly and so stands for the irradiance over π. Integrated over
the sphere the corrected form returns σ times the irradiance exactly, which
is what a medium that absorbs nothing has to do.

| the frame facing the low sun through the Passion glass | before | after |
| --- | --- | --- |
| granite shaft, four metres out | 239 238 235 | 178 173 171 |
| its saturation | 0.022 | 0.036 |
| frame over 85 % luminance | 15.0 % | 1.9 % |
| frame saturation | 0.134 | 0.237 |

The shafts the pass exists for are untouched in kind: the evening crossing
still has beams standing in it, at frame saturation 0.50.

### And a fifth of the room's light went with it

Which is the part of item 3 that was right. The two frames the indoor stop
was fitted against were fitted through the inflated medium: swapping the
corrected march in drops the vault-wash frame's median from 0.277 to 0.218
and the Passion wall's from 0.361 to 0.249. So the stop came back up, from
0.78 to 0.95, which is 0.28 of a stop, and it was chosen by sweeping against
the photograph rather than by taste.

| | photograph | before | air fixed | stop restored |
| --- | --- | --- | --- | --- |
| `in-vault-wash-dec2025`, canopy centre | 0.290 | 0.303 | 0.250 | **0.287** |
| Passion wall, share over 85 % | 1–7 % | 5.1 % | 0.9 % | 1.3 % |

The blown share does not return to 5.1 % and should not: four of those five
points were blown *air*, not blown glass.

### The wheel no longer goes through the wall

Item 2, and it was real. Three rules, all in `camera/viewer.ts`:

- a wheel tick over pavement no longer moves the pivot, so a pick through the
  gap between two towers stops dragging the camera toward a patch of grass a
  hundred metres short of the building;
- the dolly stops at the same surface `hold` already recovers to, asked for
  along the line the camera is travelling. Nothing about how close you may
  get changes — only that you no longer arrive there through the stone. The
  soft recovery was losing the race because a tick is a *fraction of the
  distance to the pivot*, and the pivot is half way into the building, so six
  of them crossed sixty metres in well under the second the recovery needs;
- and the room itself is a hard stop, stated the way the walker's own hold
  states it: you were outside a moment ago and the building has not moved.

Measured on the path from the visit: sixteen ticks on the Passion porch now
end outside the wall, against 0.85 m above the transept floor before.

### Step outside now means the door

Item 6. `stepOut` had two legs and the second one flew two and a half times
the building's own depth out into the plaza. It has one, ending at the same
sixteen-metre standoff the way in stages at, at standing height, facing the
portal with the way back in front of you.

That exposed a second bug behind it. The first attempt landed at the right
place and **twenty-two metres up**, because the ramp that lifts a low orbit
over the Eixample starts at every edge of an open cell — and three of the
four cells around the temple are open ground. A camera at a transept door is
eight metres from that block's edge with a park beyond it, and was being
lifted to clear roofs two blocks away. An edge is now only worth climbing if
something is built on the far side of it.

### The day, and four small things

- **The day is a control.** The hour has been one since phase five; the day
  was reachable only by editing the link, so in practice nobody had seen this
  building in winter — which is half its argument, the two glazings facing
  the summer sunrise and the winter sunset. Four dates on a press, in the
  clock's own pill.
- **The dial gives the keys back.** A range keeps the focus after a drag and
  a focused input swallows W A S D, so the first control most visitors touch
  was the one that silently stopped them walking.
- **The corner button clears the attribution.** It rides above the quote for
  the seven seconds the title holds and settles when it goes, on both
  layouts, rather than either of them being hidden.
- **There is a favicon**: the cover's own hanging chains, inline.

## Left standing, and why

~~**The room is too dark away from its windows, and one number cannot fix
it.**~~ **Answered, and the complaint was wrong.** *Struck 21 September
2026 — see the fifth pass in `interior.md`.* The 38 per cent figure does not
reproduce: that frame measures 17, and the share under eight per cent across
the twenty-three interior photographs runs from 0.1 to 33.6, not 11 to 19.
Cut horizontally through `in-nave-passion-1330-dec2025` and its columns fall
to 0.23 of the frame's own median, where the render's darkest stood at 0.29.
The room was not short of light.

What was true was the *cause* this item guessed at. Painting every pixel
under eight per cent found them all on one kind of surface — the shaded flank
of a column, every plinth, and nothing else — and the reason is that the flat
term standing for light that has bounced more than once is two cosines
against the poles, so it is identically zero on everything vertical in the
building. Switching the whole of it off moved a shaft four bays deep by one
part in a thousand. What that cost was not brightness but the stone's own
colour: the granite at the photograph-matched December frame stood at 0.45
saturated and 0.29 warm against a photographed 0.50–0.60 and 0.33–0.43, which
is the item `interior.md` had been carrying open for two passes. Giving a
standing face its half of each half-space — the same arithmetic `sfLoft`
already uses — puts it at 0.55 and 0.38, and the indoor stop comes back down
an eighth of a stop, because the air this review took out had been covering
the same hole.

**The flight still passes the Nativity statuary at four metres.** Sampled,
it crosses x = 36.6 about 1.8 s in, a few metres off the front, and the
clusters do read as boulders there. But the aim is already lifted and already
along the axis — the reasons item 5 gave for it are not the reasons — so what
is left is a choreography preference, and that is the author's call rather
than a defect to fix from outside.

---

# A second visit, and what came of it

*23 September 2026, at 9408153, then built on 2c6436e. The same brief as the
first: go in cold, walk round it, go in, say where it held and where it let
go — driven in the desktop browser pane at 1024 × 768, 1440 × 900 and a
375 × 812 phone, and, once the pane had gone hidden, in headless Chrome over
CDP. Every claim below was checked against the code, a photograph or a
number before it was counted; two that were not the app are at the end.*

## What held

The cover and a three-second load; the opening frame, recognisable on a
laptop and on a phone; the door marker, Enter, Escape home, a click to skip
a flight; evening at the crossing, which is still the best thing in the
model; and the transept vault from straight underneath.

## What let go, and what was done

**The room was one colour at every hour.** Measured frame-wide on the stone,
the nave at nine and one and half past seven in June and at noon and four in
December never left 0.34 – 0.57 saturated at 18 – 23 degrees of hue: a
terracotta room. The nave photographs that are not December afternoons run
0.17 – 0.20 at 25 – 34, and the December ones 0.68 – 0.99 at 26. Ablated one
term at a time, nearly all of it was `uRoomWarmth` — the room's gold,
applied whatever the sun was doing, while the sun and the wash rig between
them moved the frame by less than a hundredth. The gold now follows which
half of the glazing has the sun: `ROOM_LIGHT` with the Passion side lit,
which is every frame the room was ever fitted at and so moves none of them,
and `ROOM_LIGHT_EAST`, a pale cream, with the Nativity side lit. And the gold
itself was salmon coming out — 16 and 17 degrees on `w` and `v` against 26
in both photographs — because a warm light multiplied by a warm vault and a
warm floor loses green faster than red; the constant going in is yellower so
that what arrives is amber.

| | before | after | photographs |
| --- | --- | --- | --- |
| landing, 21 Jun 10:00 | 0.39 · 18° | 0.15 · 30° | 0.17 – 0.20 · 25 – 34° |
| nave, 21 Jun 09:00 | 0.34 · 21° | 0.17 · 34° | |
| nave, 21 Jun 12:00 | 0.39 · 20° | 0.29 · 31° | |
| `w`, 18 Dec 13:30 | 0.46 · 17° | 0.43 · 24° | 0.68 · 26° |
| `v`, 18 Dec 14:55 | 0.59 · 16° | 0.57 · 25° | 0.99 · 26° |
| `1`, 19 Sep 16:00 | 0.59 · 17° | 0.57 · 26° | 0.39 · 37° |

Every luminance within half a per cent; four exterior viewpoints unchanged
to three decimals.

**Pale blocks up every column.** Hard-edged mint rectangles on the shafts
and on every flat facet of every branch, the first thing on screen after the
flight in. They were the clerestory throw: its gain was fitted on a soffit,
which meets a heading fifteen degrees off level at a quarter cosine, and a
standing face meets it at 0.97 — so at 21 June, ten o'clock, 86 per cent of
its light landed on things that are not the vault, through a five-tap binary
depth test. Gating it on how far a face turns downward took the shafts out
and left the branch facets; it is now the vault stone's alone (`THROW_SHARE`
in `render/materials.ts`), which keeps all of what the canopy was fitted
with.

**Step outside left you in the jambs.** The height was right; the standoff
was measured from a door that stands at the back of a portal ten metres deep.
It is forty metres now — where the film's own approach to that door begins —
looking seventeen metres up the front.

**Scroll had no useful end.** Fifteen ticks put the camera half a kilometre
out, thirty-two metres up, behind a wall of roof. The orbit now stops at
320 m and rises as it backs off, reaching about eighty-five metres at the
limit: the whole building over Plaça de Gaudí and the Eixample.

**The day could turn out the lights.** It changed under a fixed hour, and
the scrubber runs six to nine whatever the day, so a June evening pressed on
to December was black: forty per cent of December's scrubber is night. The
hour now keeps its place between sunrise and sunset, and the track is bright
across the daylight and dim outside it.

**Nothing said where a click would go.** A ring now lies on the floor under
the cursor where the walk would end, and stays at the destination until you
arrive. The arrow keys turn on foot and Page Up and Page Down look up and
down — there was no key anywhere that turned the view — and outside they
turn and come closer the way a drag and the wheel do. H brings the line of
controls back.

**A phone had nothing to tap.** In portrait the landing looked thirty degrees
up and the floor was the bottom twentieth of the frame, under the clock; it
now lands at fifteen, and the line saying *tap the floor* comes back indoors.

**Smaller.** The line of controls ran into the clock between 821 and 1140
pixels wide, and now stands above it there. The corner button's slide out of
the quote's way was a jump — two `transition` declarations, the second
winning. Enter on a focused button also flew you in through a door. The dev
readout counted every triangle eight times a second behind `display: none`;
the panel and Tweakpane were in every visitor's download (1,028 kB, now
882); a browser without WebGL 2 got "a few seconds" for ever; a lost context
got a building with its light missing. The clock said *21 Sep* and the HUD
*21 Sept*. The street trees were three cards lit as three cards, a black half
and a lime half down every crown, and are lit as crowns. The Passion legs
were three girths within half a metre of each other — six planks from the
steps — and are bones: a flared foot, a slender neck, and a head that opens
into the roof.

## Withdrawn, on the evidence

**Second-long freezes every three seconds.** The pane had gone hidden and was
throttling `requestAnimationFrame`; measured again with it visible, and in
headless Chrome, there were none.

**W does nothing in the orbit.** Same cause: no frames were being drawn.

## Left standing

~~**The interior is darker than the daytime photographs.**~~ **Answered.**
*Struck 23 September 2026 — see "The four left standing" below.* The nave
frame's median was 0.21 – 0.25 where `in-nave-axial-from-floor` is 0.50;
this pass was about colour and left every luminance where the earlier
passes fitted it.

~~**The December photographs are far more saturated than the model.**~~
**Partly answered** — 0.43 and 0.57 then, 0.51 and 0.65 now, against 0.67
and 0.98. Below, with what is still between them.

~~**The Passion portico may be too low.**~~ **It was, by twenty metres and a
crown.** Measured at a matched camera, below. From the elevation it stood at
about a fifth of the towers' height where `ex-passion-front` puts its apex
nearer the belfries' feet, but that photograph is a wide lens from close in
and the porch is fifteen metres nearer it than the towers are.

~~**The world ends in a brown band.**~~ **Answered**, below. From high on the
orbit the ground stopped short of the horizon.

---

# The four left standing

*23 September 2026, on d93e102. The four items above, taken one at a time,
measured in headless Chrome over CDP against the photographs before anything
moved and after. Every frame below is a fresh page load, the pupil left to
settle for four seconds, and the same instrument as the second visit: median
luminance, and median saturation and mean hue over the pixels between 8 and
80 per cent. "Gold" is the share of the frame bright and saturated at once —
value over 0.6, saturation over 0.35 — which in a December photograph is the
lit glass and the stone it lights.*

## The brightness was the exposure, and the exposure was a constant

The author's own frames carry their exposures, and they settle what the
photographs' medians are before anything is compared with them:

| frame | what | time | EV 100 | median |
| --- | --- | --- | --- | --- |
| DSCF0491 | the pavement outside | 13:03 | 14.0 | 0.34 |
| DSCF0500 | the central vault, straight up | 13:23 | 6.3 | 0.34 |
| DSCF0512 | the Passion wall — `w` | 13:29 | 7.7 | 0.25 |
| DSCF0524 | the Passion transept wall | 13:34 | 8.3 | 0.29 |
| DSCF0638 | the aisle vault the wall throws onto — `v` | 14:55 | 9.6 | 0.24 |

Three and a third stops between the brightest and the darkest room in one
afternoon, handed back at medians within a tenth of each other. A median
from a photograph is a metered median. The model's indoor stop was a
constant, fitted on the frames full of lit glass, so every frame without
any — the canopy, the nave, the landing the flight puts you in — sat a stop
under every photograph of it.

**The eye is metered now** (`render/meter.ts`). The scene's radiance, before
the bloom and the film, is reduced to a 64 × 32 grid in two small passes and
read back eight kilobytes at a time every fourth frame. The exposure is
solved so the centre-weighted mean meets a key. Then the brightest three per
cent of the frame, taken as eight-pixel patches, may not be pushed past a
ceiling. Eight-pixel patches because a lancet is five or ten pixels wide and
a lamp on a capital is two; weighted by the pixel, every lamp in the canopy
closed the frame down as if it were a window. The viewer takes four fifths
of what the meter asks for, within two stops down and one and a half up of
the old constant, so dusk is still darker than noon.

Two things this pass got wrong on the way and put right:

- **The first key was fitted to a bug.** The second downsample took the
  luminance of a red-only texel and read every cell at a fifth of its value.
- **A ceiling on the cell means never binds.** The first highlight rule
  looked at cell averages, where a lancet is averaged into its stonework and
  a wall of glass comes to a quarter of white.

## December's colour was the sun on the glass, and the glass was the wrong colour

Counted, the difference was not a tint:

| | gold share | its hue |
| --- | --- | --- |
| December photographs | 16 – 40 % | 27 – 32° |
| the same frames, rendered | 1 – 5 % | 11 – 26° |

Three causes, taken in order.

- **The Passion glass was twelve degrees too red.** In all four comparisons
  it was salmon and crimson where every photograph is gold and orange. The
  sweep is moved up the circle (`SWEEP` in `geometry/glass.ts`).
- **The glass did not know how much sun was on it.** A pane glowed at the
  sky's value plus a disc on the exact line of sight to the sun, the same at
  noon in June as in December with the sun square on it. The wash rig's side
  weights are held at a total by design, so the room took in the same light
  at every hour. `uWashSun` is now the sun on each glazed wall, not held at
  anything: cos(elevation) · cos(bearing), times the sun's strength, 0.7 on
  the Passion glass that December afternoon, 0.4 on a July one and a tenth
  on the Nativity side at a June noon. It lights the glass, and the metered
  eye then does what the camera did: it closes down on a wall of lit glass
  and the room goes dark round it.
- **The room's gold was everywhere.** The fill carried it at four fifths
  whatever the sun was doing, so the central vault in December came out tan
  at 0.59 saturated where its photograph, six minutes before the Passion
  wall's, is cream at 0.38. The base is a third now. What the sun on the
  glass adds, it adds to standing faces only: the floor and the lower walls
  are what the December light patches, and a vault forty-five metres up sees
  the lucernaris.

| frame | photograph | before | after |
| --- | --- | --- | --- |
| `w` | 0.25 · 0.67 · gold 16 % | 0.29 · 0.43 · 4 % | 0.28 · **0.51** · **9 %** |
| Passion transept wall, 13:34 | 0.29 · 0.98 · 36 % | 0.23 · 0.59 · 5 % | 0.23 · **0.65** · **10 %** |
| Passion aisle, 14:55 † | 0.24 · 0.98 · 40 % | 0.35 · 0.51 · 12 % | 0.32 · **0.58** · **20 %** |
| central vault, Dec 13:23 | 0.34 · 0.38 | 0.26 · 0.59 | **0.38 · 0.41** |
| `in-nave-axial-canopy` | 0.38 · 0.38 | 0.21 · 0.52 | **0.37 · 0.32** |
| `in-vault-overhead` | 0.41 · 0.27 | 0.24 · 0.35 | **0.38 · 0.18** |
| `in-nave-axial-from-floor` | 0.46 · 0.22 | 0.26 · 0.52 | **0.41 · 0.36** |
| `1`, against the canopy | 0.38 · 0.38 | 0.22 · 0.57 | **0.41 · 0.44** |
| the landing, 21 Jun 10:00 | | 0.11 · 0.15 | **0.37** · 0.17 |

*Median · saturation, and gold where it means something. † At (−16, 1.6, −8)
toward (−24, 18, −8), which has the photograph's wall of lit lancets and
vault in it. The curated `v` does not: it looks at columns and canopy, now
meters as a stone frame at 0.37, and is no longer a fair stand-in for its
photograph.*

Every stone frame is now within a tenth of its photograph's median, and
most within a tenth of its saturation. The gold on the December glass frames
is the right hue, 25 – 37° against 29 – 32°, and twice what it was. Outside,
nothing moved but the porch: five of six exterior viewpoints are unchanged
to three decimals and the Passion elevation by six thousandths, which is
the crown. The frame rate is unchanged within its own noise.

Tried and taken out, because the frames said so:

- **The sun as a share of the wash and the throw**, handed back at the
  glass's own colour. It lit the faces turned to the glass, which from
  anywhere a photograph stands are the faces turned away from the camera. At
  three times the wash it moved no December frame in the third decimal, and
  turned a June morning's canopy green.
- **Standing faces tinted toward the lit glass's colour** as well as warmed.
  It gave December nothing and made a June morning teal from the terraces
  down.
- **A higher bloom threshold** to clear the morning green below. It took
  away half of December's gold with it, because the glow off lit glass is
  where much of that gold lives.

## The Passion porch was twenty metres short and had no crown

The same photograph read at its own lens. `ex-passion-front-up-dec2025` is
DSCF0491 uncropped, 26.5 mm on a 23.5 mm sensor, so 2,165 pixels of focal
length. Each tower's axis, run from finial to ring, meets the others at
about (930, −510), which puts the camera 62° up. The cross on the pediment
is 7.5 m tall and the pediment's eighteen bones are 9 m, both published. The
cross subtends 140 pixels, so it stands about 25 m out and runs from about
45 to 53 m. The gable the bones stand on has its apex about twelve metres
under it, and the rake in the 2010 frame puts the gable's hips at half the
apex's height. From that camera the old porch was not in the picture at all:
the frame's bottom edge was the façade's cornice.

What was there was the porch before 2016, and not quite even that: an arced
canopy edge at 18 – 20 m and a comb of thirty-two four-metre blades standing
in for the pediment. The leading edge is now a gable, 17 m at the hips to
34 m at the apex. The six legs meet it wherever it is, so the middle pair
stand half as tall again, with their girth scaled to suit. On it stand
eighteen bones of ten metres, fanning. They carry a cornice of hexagonal
prisms, a letter to a prism, IESUS NAZARENUS up one rake and REX IUDAEORUM
down the other, and the cross stands over the apex to about 55 m.

Found on the way and not moved: **the four Passion towers are not evenly
spaced.** In both frames the inner pair's finials stand about twice as far
apart as each outer pair — 284 pixels against about 158 in the 26 mm frame,
296 against 134 in the 2010 one. The model spaces all four a module apart,
and a camera solved on its finials leaves 43 to 70 pixels of residual
whatever it does. The porch reads narrower than the photographs for that
reason, and it is a change to the whole transept front, not to the porch.

## The horizon was the sky's own ground

The plaza is a disc 1,800 m across and the fog has taken it to the
horizon's colour by 1,750. What showed beyond its edge was the sky shader's
ground, a brown, from the edge up to the horizon: from 90 m up, three
degrees of it. The ground is there for a reason — it is half of what an
exterior surface is lit by — so the sky is now drawn twice. Once with the
ground, for the light probe, and once with the haze carried on down, for the
background. Nothing the model is lit by changed.

## Left standing

**December is still short of its photographs.** 0.51 – 0.65 saturated
against 0.67 – 0.98, and 9 – 20 % gold against 16 – 40 %. What is between
them now is mostly glass. The photographs' Passion wall is more window than
wall and the model's is lancets in stone, the gap `interior.md` has
recorded since its fifth pass. The air costs `w` about 0.08 of saturation,
but taking it out costs everything the air was fitted for.

**A June morning facing the Nativity glass is now green.** `3`, the crossing
floor and the apse move from 71°, 53° and 90° to 111°, 100° and 124°. It is
the same mechanism as December: the sun stands on that glass, the eye closes
down on it, and the frame takes the glass's colour. It is the scheme's own
logic, a cool morning and a warm afternoon. But there is no photograph in
the set of that wall with the morning sun on it to say how far, so it is
recorded rather than tuned.

**`v` no longer shows its photograph.** Re-aim it into the Passion aisle,
or retire it for the frame above.

**The Passion towers' spacing** — above.


---

# The film, reviewed from first principles

*23 September 2026, at a1d85ab. Not a visit: one loop of the film, played in
headless Chrome at 1440 × 900 and again on a 390 × 844 phone, with the
state sampled four times a second, a screenshot every half second, and a
click into every shot to see what the hand-off gives. Then the question
asked cold: the app exists so that people can be in this building — what
does a film have to do to serve that, and does this one?*

## What the film was

Nine shots, forty-five seconds, from four seasons: the clock jumped seven
times in forty-five seconds and never once went forward for two shots
running, in a film whose stated premise is that the light *changes*. The
camera never stopped moving, at four to nine metres a second on foot and a
hundred in the air, and the sun ran at up to twenty-six minutes a second
with a minute counter ticking under the title to say so. The walker's pupil
kept adapting under the cuts, so the Passion glazing shot dimmed by a stop
and a half over its four seconds and the vault brightened by as much over
its four and a half. Opened with `?film`, the page's own name and quote sat
over the film's caption and hint for the first seven seconds; a touch
stopped it for good; the hint offered a click and a key to a phone. And it
was silent.

## What it is now

One day, forward only: dawn across the pond, in by the Nativity door as the
morning arrives, the east glazing lit, the vault, out to the Glory front at
midday — the room is flat from eleven to one, swept hour by hour, and only
warms when the Passion side takes the sun — the nave and the west glazing
through the afternoon, the crossing from a camera that stands still for
ninety minutes of sunset, and out under the Passion front to rise away as
the sun goes. Ten shots, sixty-three seconds, and the second time round it
is midwinter on the same path at the same fraction of the day. A cut is a
new exposure: the stop snaps to the side of the wall it is on, takes the
meter's reading of the new frame under the dissolve once a reading of that
frame is actually in — the first one back is still of the frame before —
and drifts slowly after; through the door it looks three and a half
seconds ahead and opens on the way in. The two shadow passes of a relight
go on consecutive frames and the resolution pacer ignores both. `?film`
hides the intro, resumes after seventy-five seconds untouched, and says
*tap* to a finger. The caption clock keeps ten-minute time.

| | before | after |
| --- | --- | --- |
| clock jumps backward, per loop | 7 | 0 |
| fastest walk indoors | 8.7 m/s (the door) | 4 m/s (the door) |
| stop moved within one interior shot | up to 1.7 stops | under half a stop, after the dissolve |
| exposure at a cut | walker's adaptation, over a second | snapped, then the meter under the dissolve |
| hand-off, all shots | correct | correct |

## Withdrawn, on the evidence

**The interior shots stall three to eight times a second on relights.**
The first pass measured p95 frame times of 53 to 86 ms on the interior
shots against 20 ms outside and blamed the relight, which re-runs both
shadow maps. It was the harness. The same frozen interior pose measured
17 ms p95 one minute and 110 ms the next with nothing changed; the stalls
appeared with no relights at all, indoors and out, went away while a
WebAudio context was running, and doubled when a second Chromium opened on
the machine. Headless Chrome's frame pacing is not the app's, and no visible
display was available to this session to measure the real one. The split
of the two shadow passes across frames and the pacer's exclusion of relit
frames are kept, because both are correct on their own terms; neither is
claimed as a measured improvement. What the record does show is that a
Retina screen walks its pixel ratio down during the first shot and does not
recover it while the sun is moving, which the pacer change addresses.

## Left standing

- **The porch is dark for a second and a half.** The Nativity portal is ten
  metres deep, the pupil now opens on the way through it, and the frames
  are still a dark cave with a lit slot: that is the sky fill under a porch,
  which is the lighting model's and not the film's.
- **The Nativity glazing at ten is a wall of green.** Physically that is the
  morning sun through Vila-Grau's cool glass, and the winter loop shows the
  same frame pale for contrast; whether the summer one is too saturated is a
  question for the glass, against a photograph.
- **There is no sound.** A synthetic room tone — pink noise through a
  seven-second tail — went in with this pass and came out the same evening
  (it is in the history at 45d5790): the film should not have a sound that
  is not the building's. A recording free to use is still to be found, and
  a player for it is a smaller thing than the synthesis was.
