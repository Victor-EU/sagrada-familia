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
