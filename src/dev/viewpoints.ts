import * as THREE from 'three'
import type { Viewer } from '../camera/viewer.ts'

/**
 * Curated views.
 *
 * A building this size has maybe a dozen places worth standing, and finding
 * them by flying is slow and unrepeatable. These are the ones that show what
 * the model is claiming — the fan of the columns, the two glazings at their
 * own hours, the shaft on the floor — and they double as a regression
 * harness: the same six frames after every change, so a break in the light is
 * seen rather than argued about.
 *
 * Each carries its own hour, because a viewpoint without a sun is only half a
 * view of this building.
 */
export interface Viewpoint {
  /** The key that jumps here. Digits first, then letters as they ran out. */
  key: string
  name: string
  note: string
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  shiftCorrection: number
  /** Day of the year and Barcelona wall-clock hour. */
  day: number
  hour: number
}

export const VIEWPOINTS: Viewpoint[] = [
  {
    key: '1',
    name: 'Under the crown',
    note:
      'Eye height between the trees, looking up and along. Reframed for the ' +
      '7.5 m grid: the columns are twice as close together as phase 2 ' +
      'thought, so what used to be a fan against sky is now a canopy, and ' +
      'the frame has to be long enough to see it recede.',
    position: [4.2, 1.65, 17],
    target: [-2.5, 30, -24],
    fov: 68,
    shiftCorrection: 0.62,
    day: 262,
    hour: 16,
  },
  {
    key: '2',
    name: 'Passion, four o’clock',
    note: 'The hour the sun stands square on the west glazing.',
    position: [6.2, 1.65, 4.6],
    target: [-9.4, 13, -2],
    fov: 62,
    shiftCorrection: 1,
    day: 262,
    hour: 16,
  },
  {
    key: '3',
    name: 'Nativity, mid-morning',
    note:
      'The cool half of the building answering. Midsummer, because the 45° ' +
      'bearing means this glazing never takes a square sun — this is the best ' +
      'incidence the year offers it.',
    position: [-6.5, 5, 4.5],
    target: [9.4, 2, -1],
    fov: 62,
    shiftCorrection: 0.4,
    day: 172,
    hour: 9.6,
  },
  {
    key: '4',
    name: 'The shaft on the floor',
    note: 'Where the red light actually lands.',
    position: [5.5, 7, 3.5],
    target: [-4, 0, 0],
    fov: 60,
    shiftCorrection: 0.35,
    day: 262,
    hour: 16,
  },
  {
    key: '5',
    name: 'At the springing',
    note:
      'The branching node, where the risk was — the fans meeting under the ' +
      'vault. This used to be shot from outside the open end, because a ' +
      'single cell offered no angle on a fan that was not also an angle out ' +
      'of the building. It is now taken from inside, at branch height, ' +
      'looking down the line of them — and the height moved, because a ' +
      'granite eight springs at 35 m where the basalt ten it replaced sprang ' +
      'at 36.',
    position: [1.6, 33, 14],
    target: [0, 40, -26],
    fov: 62,
    shiftCorrection: 0.8,
    day: 262,
    hour: 16,
  },
  {
    key: '7',
    name: 'Down the nave',
    note:
      'From just inside the Glory wall, which is the frame phase 3 exists ' +
      'for: ninety-seven metres of walk in one shot, the nave and the ' +
      'crossing and the lit chevet at the end of it. Off the centreline on ' +
      'purpose — dead centre the columns line up behind each other and the ' +
      'depth goes flat.',
    position: [3.4, 1.65, 20],
    target: [1.2, 9, -34],
    fov: 64,
    shiftCorrection: 0.9,
    day: 262,
    hour: 16,
  },
  {
    key: '8',
    name: 'Across the crossing',
    note:
      'From inside the Nativity arm, straight through the crossing and out ' +
      'the Passion one — the only line in the building that sees the ' +
      'transept as a room rather than as a widening, and until the arms ' +
      'projected it was not quite true: the camera stood in the outer ' +
      'aisle, because there was nowhere further out to stand. There is now. ' +
      'Sixty-two metres of walk tip to tip, the four columns of red ' +
      'porphyry either side of the middle of it, and the Passion glazing ' +
      'square on at four o’clock.',
    position: [28.5, 1.65, -29.2],
    target: [-18, 13, -30.6],
    fov: 72,
    shiftCorrection: 0.55,
    day: 262,
    hour: 16,
  },
  {
    key: '9',
    name: 'Into the apse',
    note:
      'The head of the church, from the crossing. Ten columns on a ' +
      'semicircle, the drum glazed above them, and the lantern over that — ' +
      'seventy-five metres, the highest point inside the building. ' +
      'Mid-morning in June, when the sun is on the chevet.',
    position: [0, 1.65, -34],
    target: [0, 44, -60],
    fov: 70,
    shiftCorrection: 0.5,
    day: 172,
    hour: 10,
  },
  {
    key: '0',
    name: 'The floor of the crossing',
    note:
      'The view the floor exists for, and the one it is regressed against. ' +
      'Standing in the crossing looking at the presbytery: the slabs running ' +
      'out on the 7.5 m module, the heavy joints passing through the column ' +
      'axes, the roundel at the dead centre of the crossing where the ' +
      'booklet puts the JMJ ceramic, and the flight up onto the platform — ' +
      'which was two metres of solid plaster with no way onto it until the ' +
      'floor got looked at.',
    position: [4.2, 1.65, -22],
    target: [-1.2, 2.6, -46],
    fov: 62,
    shiftCorrection: 0.45,
    day: 172,
    hour: 10,
  },
  {
    key: '6',
    name: 'Passion elevation',
    note:
      'Square on from outside, the way a survey photograph is taken. Further ' +
      'out again for phase 4: the building was a hundred metres long and is ' +
      'now a hundred and seventy-two tall, and an elevation that cannot hold ' +
      'the tower of Jesus Christ is not an elevation of this church.',
    position: [-310, 62, -30],
    target: [0, 80, -30],
    fov: 36,
    shiftCorrection: 1,
    day: 262,
    hour: 16,
  },
  {
    key: 'n',
    name: 'Nativity, from the plaza',
    note:
      'The recognisability test, and the one phase 4 is scored on: eye ' +
      'height on the pavement outside, looking up the Nativity front. Four ' +
      'bell towers on the module, the terrace and its pinnacles behind them, ' +
      'the tower of Jesus Christ over the crossing beyond. If this frame is ' +
      'not obviously Sagrada Família then the phase has not happened, ' +
      'whatever the model contains.',
    position: [96, 0.3, 22],
    target: [10, 120, -26],
    fov: 72,
    shiftCorrection: 0.35,
    day: 172,
    hour: 9.6,
  },
  {
    key: 'd',
    name: 'Out through the Nativity door',
    note:
      'The way out, which until phase 5 the building did not have: the walls ' +
      'held from both sides and the only way over the threshold was to fly. ' +
      'The Nativity front seen from inside the transept arm: two doorways ' +
      'under the row of lights that used to run down to the floor, the ' +
      'lintel between them, and the sunlit portico showing through both. ' +
      'Half past nine on midsummer morning, with the sun near due east — ' +
      'the hour this front was oriented for, and the one that puts it ' +
      'straight into the portico and through the openings.',
    position: [24, 1.65, -30],
    target: [62, 14.6, -30],
    fov: 78,
    shiftCorrection: 0.45,
    day: 172,
    hour: 9.6,
  },
  {
    key: 'g',
    name: 'The Glory front',
    note:
      'The main entrance, which is the one façade nobody has ever seen ' +
      'finished. Its four are the tallest of the twelve apostles — the ' +
      'published range tops out at 117 m and the Glory end is where it does ' +
      'it — so the three fronts rise toward this one.',
    position: [28, 0.3, 118],
    target: [-4, 110, -10],
    fov: 70,
    shiftCorrection: 0.3,
    day: 110,
    hour: 13,
  },
  {
    key: 't',
    name: 'On the terraces',
    note:
      'Standing on the aisle roof, which is a thing you can do at Sagrada ' +
      'Família and the reason the shell is terraces rather than a lid. The ' +
      'parapet and its pinnacles in the near ground, the clerestory stepping ' +
      'up behind, and the Nativity towers springing straight off the mass — ' +
      'this is the frame that says the outside is built rather than draped.',
    position: [18.5, 33.4, 12],
    target: [3, 96, -36],
    fov: 72,
    shiftCorrection: 0.4,
    day: 172,
    hour: 8.5,
  },
  // Three frames matched to the author's own photographs, all from one
  // December afternoon — see reference/SOURCES.md. Each carries the minute
  // it was taken, which is what makes them worth more than the Commons set:
  // the sun in the model is where the sun was.
  {
    key: 'x',
    name: 'Passion porch, December',
    note:
      'ex-passion-porch-dec2025: from the pavement under the Passion front, ' +
      '18 mm, ten past three on 18 December. The sun is 17° up at 214°, on ' +
      'the front and eleven degrees off square, so every column throws its ' +
      'shadow to the right across the porch. The sky is the colour test.',
    position: [-70, 1.6, -36],
    target: [-40, 45, -30],
    fov: 47,
    shiftCorrection: 0,
    day: 352,
    hour: 15.17,
  },
  {
    key: 'w',
    name: 'Passion wall, half past one in December',
    note:
      'in-nave-passion-1330-dec2025: across the nave at the west glazing, ' +
      '18 mm. The sun is 24° up and 34° off the wall, and the whole wall is ' +
      'lit from behind — the frame the glass gain and the indoor stop are ' +
      'judged against.',
    position: [14, 1.6, -2],
    target: [-24, 16, -6],
    fov: 47,
    shiftCorrection: 0,
    day: 352,
    hour: 13.5,
  },
  {
    key: 'v',
    name: 'The wash on the vault',
    note:
      'in-vault-wash-dec2025: looking up from the Passion aisle at five to ' +
      'three. What the glazing does to the canopy when the sun is square on ' +
      'it — gold and red thrown across the whole vault, which is the wash ' +
      'rig’s frame.',
    position: [-2, 1.6, -4],
    target: [-20, 45, -4],
    fov: 47,
    shiftCorrection: 0,
    day: 352,
    hour: 14.92,
  },
]

export interface SunSetting {
  dayOfYear: number
  hour: number
}

/** Move the camera and the clock to a viewpoint. */
export function applyViewpoint(
  view: Viewpoint,
  viewer: Viewer,
  sun: SunSetting,
  onSunChange: () => void,
): void {
  sun.dayOfYear = view.day
  sun.hour = view.hour
  onSunChange()

  // Through setState rather than by writing the pose, because arriving
  // somewhere is not only a position: the viewer has to work out whether the
  // frame it has been handed is one it stands in or one it looks at, and put
  // itself into the matching relation. See camera/viewer.ts.
  const position = new THREE.Vector3(...view.position)
  const direction = new THREE.Vector3(...view.target).sub(position).normalize()
  viewer.setState({
    position: view.position,
    yaw: Math.atan2(-direction.x, -direction.z),
    pitch: Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)),
    fov: view.fov,
    shiftCorrection: view.shiftCorrection,
  })
}
