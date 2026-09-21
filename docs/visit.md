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

**The room is too dark away from its windows, and one number cannot fix it.**
With the air no longer lighting the nave, the landing frame puts 38 % of its
pixels under eight per cent luminance, against 11–19 % in the *worst* of the
photographs and 1.5 % in the axial ones; the canopy on an axial noon frame
measures 0.244 against the photograph's 0.403. The interior fill has a gain
of its own and it is the right lever — but swept against both criteria at
once it cannot satisfy them: at 1.3 the crushed shadows go (38 % down to
3.3 %) and the calibrated December frame overshoots its photograph by fifteen
per cent, at 1.6 by twenty-eight. The two disagree because the *ratio* of
direct window light to indirect fill is wrong indoors, not its level, and
rebalancing that is a round against all ten pairs in `interior.md` rather
than a constant. The measurements are here so that round does not have to
start by making them again.

**The flight still passes the Nativity statuary at four metres.** Sampled,
it crosses x = 36.6 about 1.8 s in, a few metres off the front, and the
clusters do read as boulders there. But the aim is already lifted and already
along the axis — the reasons item 5 gave for it are not the reasons — so what
is left is a choreography preference, and that is the author's call rather
than a defect to fix from outside.
