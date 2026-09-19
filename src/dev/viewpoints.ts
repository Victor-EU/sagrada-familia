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
    note: 'Eye height between the trees, looking into the vault.',
    position: [2.5, 1.65, 5.5],
    target: [-4, 30, -5],
    fov: 66,
    shiftCorrection: 1,
    day: 262,
    hour: 16,
  },
  {
    key: '2',
    name: 'Passion, four o’clock',
    note: 'The hour the sun stands square on the west glazing.',
    position: [7.5, 1.65, 5.5],
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
    note: 'The branching node, where the risk was.',
    position: [0, 29.5, 0.5],
    target: [7.5, 35.5, 7.5],
    fov: 55,
    shiftCorrection: 0,
    day: 262,
    hour: 16,
  },
  {
    key: '6',
    name: 'Passion elevation',
    note: 'Square on from outside, the way a survey photograph is taken.',
    position: [-62, 18, 0],
    target: [0, 18, 0],
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
