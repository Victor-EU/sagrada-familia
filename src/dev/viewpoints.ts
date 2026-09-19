import * as THREE from 'three'
import type { FreeCamera } from '../camera/freecam.ts'

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
      'From the Nativity arm, straight through the crossing and out the ' +
      'Passion one — the only line in the building that sees the transept ' +
      'as a room rather than as a widening. The four columns of red ' +
      'porphyry stand either side of it and the sixty-metre vault is above. ' +
      'None of the twelve is placed by hand: two transverse lines fifteen ' +
      'metres apart is where the grid puts them.',
    position: [19, 1.65, -30],
    target: [-8, 34, -30.5],
    fov: 68,
    shiftCorrection: 0.6,
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
    key: '6',
    name: 'Passion elevation',
    note:
      'Square on from outside, the way a survey photograph is taken. Further ' +
      'out than phase 2 needed it: the church is a hundred metres long now, ' +
      'not a nave.',
    position: [-135, 40, -25],
    target: [0, 34, -25],
    fov: 40,
    shiftCorrection: 1,
    day: 262,
    hour: 16,
  },
]

export interface SunSetting {
  dayOfYear: number
  hour: number
}

/** Move the camera and the clock to a viewpoint. */
export function applyViewpoint(
  view: Viewpoint,
  cam: FreeCamera,
  sun: SunSetting,
  onSunChange: () => void,
): void {
  sun.dayOfYear = view.day
  sun.hour = view.hour
  onSunChange()

  cam.camera.position.fromArray(view.position)
  cam.camera.fov = view.fov
  cam.shiftCorrection = view.shiftCorrection
  cam.lookAt(new THREE.Vector3(...view.target))
  cam.refresh()
}
