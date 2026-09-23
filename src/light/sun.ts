import * as THREE from 'three'

/**
 * Where the sun actually is, and which way that is in model space.
 *
 * Sagrada Família is a light instrument before it is a building: the glazing
 * is graded so that the Nativity side takes the sunrise in blues and greens
 * and the Passion side takes the sunset in reds and oranges. None of that
 * reads unless the sun is in the right place at the right hour, so the sun is
 * computed rather than posed.
 *
 * The algorithm is NOAA's — Meeus reduced to the terms that matter below a
 * minute of arc, which is far finer than anything we can see here.
 */

/** The building's site, to four decimals. */
export const SITE = {
  latitude: 41.4036,
  longitude: 2.1744,
} as const

/**
 * Compass bearing of the model's −Z axis, i.e. the direction the nave points
 * from the Glory façade toward the apse.
 *
 * The Eixample grid is rotated roughly 45° from the cardinals, which puts the
 * apse to the north-west, the Nativity façade (+X) to the north-east and the
 * Passion façade (−X) to the south-west. That is consistent with the thing
 * everyone knows about the building — morning on Nativity, evening on Passion.
 *
 * Measured, not assumed. The building's footprint in OpenStreetMap
 * (relation 9194723, read on 20 September 2026) has 215 m of edge longer than
 * five metres, and the length-weighted mean of their bearings, folded onto
 * one grid axis, is 44.40° — so the long walls run at 134.4°/314.4° and the
 * nave points 314.4° from the Glory end toward the apse. The provisional 315
 * was six tenths of a degree out, which is under a minute of sun.
 */
export const BUILDING_BEARING_DEG = 314.4

/** Any year does; the sun repeats to well inside a pixel. */
export const YEAR = 2026

const DEG = Math.PI / 180

export interface SolarPosition {
  /** Radians above the horizon. Negative when the sun is down. */
  altitude: number
  /** Compass bearing in radians, clockwise from north. */
  azimuth: number
  /** Minutes by which true solar time leads the mean clock. */
  equationOfTime: number
  /** Solar declination in radians. */
  declination: number
}

/**
 * Sun altitude and azimuth for an instant, at a point on the globe.
 *
 * `date` is read in UTC, so callers own the timezone question. Refraction is
 * not modelled: it lifts the apparent disc by about half a degree at the
 * horizon and by nothing worth naming above ten.
 */
export function solarPosition(
  date: Date,
  latitudeDeg = SITE.latitude,
  longitudeDeg = SITE.longitude,
): SolarPosition {
  const jd = date.getTime() / 86400000 + 2440587.5
  const t = (jd - 2451545) / 36525

  // Geometric mean longitude and anomaly of the sun.
  const l0 = 280.46646 + t * (36000.76983 + t * 0.0003032)
  const m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * DEG
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)

  // Equation of centre: the correction for the orbit being an ellipse.
  const c =
    Math.sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289

  // Apparent longitude, nutation included.
  const omega = (125.04 - 1934.136 * t) * DEG
  const lambda = (l0 + c - 0.00569 - 0.00478 * Math.sin(omega)) * DEG

  // Obliquity of the ecliptic — the tilt that makes seasons.
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60
  const eps = (eps0 + 0.00256 * Math.cos(omega)) * DEG

  const declination = Math.asin(Math.sin(eps) * Math.sin(lambda))

  // Equation of time, in minutes.
  const y = Math.tan(eps / 2) ** 2
  const l0r = l0 * DEG
  const equationOfTime =
    4 *
    (y * Math.sin(2 * l0r) -
      2 * e * Math.sin(m) +
      4 * e * y * Math.sin(m) * Math.cos(2 * l0r) -
      0.5 * y * y * Math.sin(4 * l0r) -
      1.25 * e * e * Math.sin(2 * m)) /
    DEG

  // True solar time, and from it the hour angle: zero at local solar noon,
  // positive in the afternoon.
  const minutesUtc =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60
  const trueSolarMinutes = minutesUtc + equationOfTime + 4 * longitudeDeg
  let hourAngle = (trueSolarMinutes / 4 - 180) * DEG
  while (hourAngle < -Math.PI) hourAngle += 2 * Math.PI
  while (hourAngle > Math.PI) hourAngle -= 2 * Math.PI

  const lat = latitudeDeg * DEG
  const altitude = Math.asin(
    Math.sin(lat) * Math.sin(declination) +
      Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
  )

  // Meeus gives azimuth westward from south; a compass wants it clockwise
  // from north, which is the same angle plus half a turn.
  const fromSouth = Math.atan2(
    Math.sin(hourAngle),
    Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
  )
  const azimuth = (fromSouth + Math.PI + 2 * Math.PI) % (2 * Math.PI)

  return { altitude, azimuth, equationOfTime, declination }
}

/**
 * Unit vector **toward** the sun in model space.
 *
 * Model space is y-up with −Z along the nave toward the apse, so a compass
 * bearing is measured from −Z turning toward +X.
 */
export function sunDirection(
  position: SolarPosition,
  bearingDeg = BUILDING_BEARING_DEG,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const theta = position.azimuth - bearingDeg * DEG
  const horizontal = Math.cos(position.altitude)
  return target.set(
    horizontal * Math.sin(theta),
    Math.sin(position.altitude),
    -horizontal * Math.cos(theta),
  )
}

/**
 * Whether central European summer time is in force.
 *
 * The EU switches at 01:00 UTC on the last Sunday of March and of October.
 * It is worth getting right: it moves solar noon from 12:51 to 13:51, which
 * is an hour of sun angle across every window in the building.
 */
export function isSummerTime(utc: Date): boolean {
  const year = utc.getUTCFullYear()
  const start = Date.UTC(year, 2, lastSunday(year, 2), 1)
  const end = Date.UTC(year, 9, lastSunday(year, 9), 1)
  const ms = utc.getTime()
  return ms >= start && ms < end
}

/** Day of the month of the last Sunday in a given month. */
function lastSunday(year: number, monthIndex: number): number {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0))
  return last.getUTCDate() - last.getUTCDay()
}

/**
 * Build the UTC instant for a Barcelona wall-clock reading.
 *
 * `dayOfYear` is 1-based; `hour` is a float, so 13.5 is half past one.
 */
export function barcelonaTime(year: number, dayOfYear: number, hour: number): Date {
  const local = Date.UTC(year, 0, dayOfYear, 0, 0, 0) + hour * 3600000
  // Standard time is UTC+1. Guess, then correct if the guess landed in summer.
  const guess = new Date(local - 3600000)
  return isSummerTime(guess) ? new Date(local - 2 * 3600000) : guess
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * Calendar label for a day number — the clock, the film's title card and the
 * HUD all say the day with this.
 *
 * Spelt out here rather than asked of the browser's locale data, which is
 * how the clock came to say 21 Sep while the readout beside it said 21 Sept:
 * two ways of writing one date, a centimetre apart.
 */
/**
 * The same light on another day.
 *
 * An hour is a position in the day, not a number: ten to nine on a June
 * evening is the last of the light, and ten to nine in December is the
 * middle of the night. Given an hour on one day, this is the hour on another
 * that stands at the same fraction of the daylight, sunrise to sunset — and,
 * outside the daylight, the same distance from the nearer edge, so dusk
 * stays dusk. The scrubber uses it to change the day under a fixed light,
 * and the film uses it to play its summer day again in winter.
 */
export function sameLight(hour: number, from: number, to: number, year = YEAR): number {
  const a = daylight(year, from)
  const b = daylight(year, to)
  if (hour <= a.rise) return b.rise - (a.rise - hour)
  if (hour >= a.set) return b.set + (hour - a.set)
  return b.rise + ((hour - a.rise) / (a.set - a.rise)) * (b.set - b.rise)
}

export function dayLabel(year: number, dayOfYear: number): string {
  const d = new Date(Date.UTC(year, 0, Math.round(dayOfYear)))
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

/**
 * Sunrise and sunset on a day, as Barcelona wall-clock hours.
 *
 * For the clock, which has to know where the day is on it: a scrubber that
 * runs six in the morning to nine at night is fifteen hours of daylight in
 * June and nine in December, and the other six of December's are black.
 * Found rather than computed in closed form — the altitude is already here,
 * and a sign change bisected twenty times is a second of arc.
 */
export function daylight(year: number, dayOfYear: number): { rise: number; set: number } {
  const up = (hour: number): number => solarPosition(barcelonaTime(year, dayOfYear, hour)).altitude
  const edge = (from: number, to: number): number => {
    let a = from
    let b = to
    const rising = up(a) < 0
    for (let i = 0; i < 20; i++) {
      const mid = (a + b) / 2
      if (up(mid) < 0 === rising) a = mid
      else b = mid
    }
    return (a + b) / 2
  }
  // Solar noon in Barcelona is a little before one in winter and a little
  // before two in summer; the sun is up at both on every day of the year.
  const noon = isSummerTime(barcelonaTime(year, dayOfYear, 12)) ? 13.9 : 12.9
  return { rise: edge(0, noon), set: edge(noon, 24) }
}
