/**
 * The sound of the room.
 *
 * A cathedral is half acoustics: the one thing every photograph of this
 * building leaves out is that you can hear how big it is. There is no
 * recording of the building in this repository and none is invented here.
 * What plays is the one thing every large stone room has in common — air,
 * with a reverberation time of several seconds on it — made on the spot:
 * pink noise, low-passed to a murmur, through a synthetic tail of seven
 * seconds, breathing very slowly so it never sits still. Outside, the same
 * air with no room round it. It is held quiet, well under the level at which
 * anyone would call it a sound; it is there to be missed when it stops.
 *
 * It belongs to the film. Nothing else in the app asks for sound, and a
 * browser will not start any without a hand on the page — the film's button
 * and its key are hands, and a film started from the address gets its sound
 * the first time somebody touches the screen, which is also the first time
 * it stops, and so on the next time it comes round on its own.
 */

/** Master, once faded in. Measured at the output: the room sits near −37 dBFS, the open air near −44. */
const LEVEL = 0.2
/** The open air, as a share of the room. */
const OUTSIDE = 0.45
const FADE_IN = 3
const FADE_OUT = 1.2
/** Seconds to go through a door. */
const CROSS = 2
/** Reverberation time, seconds to fall sixty decibels. */
const RT60 = 7
/** How the air breathes: a slow swell, and how much. */
const BREATH_HZ = 0.055
const BREATH = 0.22
const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

export class Ambience {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private inside: GainNode | null = null
  private outside: GainNode | null = null
  private indoors = false
  private armed = false

  /** The page has been touched: a suspended context may now run. */
  private readonly gesture = (): void => {
    for (const type of GESTURES) window.removeEventListener(type, this.gesture, true)
    this.armed = false
    void this.ctx?.resume()
  }

  start(): void {
    if (!this.ctx && !this.build()) return
    const ctx = this.ctx!
    if (ctx.state !== 'running') {
      void ctx.resume()
      if (!this.armed) {
        this.armed = true
        for (const type of GESTURES) window.addEventListener(type, this.gesture, true)
      }
    }
    ramp(this.master, LEVEL, FADE_IN)
  }

  stop(): void {
    ramp(this.master, 0, FADE_OUT)
  }

  setIndoors(indoors: boolean): void {
    if (indoors === this.indoors) return
    this.indoors = indoors
    ramp(this.inside, indoors ? 1 : 0, CROSS)
    ramp(this.outside, indoors ? 0 : OUTSIDE, CROSS)
  }

  private build(): boolean {
    const Ctx = window.AudioContext
    if (!Ctx) return false
    let ctx: AudioContext
    try {
      ctx = new Ctx()
    } catch {
      return false
    }
    this.ctx = ctx

    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const noise = ctx.createBufferSource()
    noise.buffer = pink(ctx, 6)
    noise.loop = true

    // The breath: a gain swelling a fifth either way, twice a minute.
    const breath = ctx.createGain()
    breath.gain.value = 1 - BREATH
    const swell = ctx.createOscillator()
    swell.frequency.value = BREATH_HZ
    const depth = ctx.createGain()
    depth.gain.value = BREATH
    swell.connect(depth).connect(breath.gain)
    noise.connect(breath)

    // The room: low, and long.
    const low = ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 340
    low.Q.value = 0.4
    const hall = ctx.createConvolver()
    hall.buffer = tail(ctx, RT60)
    const inside = ctx.createGain()
    inside.gain.value = this.indoors ? 1 : 0
    breath.connect(low).connect(hall).connect(inside).connect(master)

    // The air outside: broader, and with nothing to ring.
    const air = ctx.createBiquadFilter()
    air.type = 'bandpass'
    air.frequency.value = 800
    air.Q.value = 0.5
    const outside = ctx.createGain()
    outside.gain.value = this.indoors ? 0 : OUTSIDE
    breath.connect(air).connect(outside).connect(master)

    swell.start()
    noise.start()
    this.master = master
    this.inside = inside
    this.outside = outside
    return true
  }
}

function ramp(node: GainNode | null, value: number, seconds: number): void {
  if (!node) return
  const now = node.context.currentTime
  const g = node.gain
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.linearRampToValueAtTime(value, now + seconds)
}

/** Pink noise, after Paul Kellet's filter, in a loop of `seconds`. */
function pink(ctx: AudioContext, seconds: number): AudioBuffer {
  const n = Math.round(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const out = buffer.getChannelData(c)
    let b0 = 0
    let b1 = 0
    let b2 = 0
    let b3 = 0
    let b4 = 0
    let b5 = 0
    let b6 = 0
    for (let i = 0; i < n; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.969 * b2 + white * 0.153852
      b3 = 0.8665 * b3 + white * 0.3104856
      b4 = 0.55 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.016898
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }
  return buffer
}

/**
 * A reverberant tail: noise under an exponential, normalised to unit energy
 * so what comes out of the convolver is as loud as what went in.
 */
function tail(ctx: AudioContext, rt60: number): AudioBuffer {
  const n = Math.round(ctx.sampleRate * rt60)
  const buffer = ctx.createBuffer(2, n, ctx.sampleRate)
  const tau = rt60 / Math.log(1000)
  for (let c = 0; c < 2; c++) {
    const out = buffer.getChannelData(c)
    let energy = 0
    for (let i = 0; i < n; i++) {
      const v = (Math.random() * 2 - 1) * Math.exp(-i / ctx.sampleRate / tau)
      out[i] = v
      energy += v * v
    }
    const k = 1 / Math.sqrt(energy)
    for (let i = 0; i < n; i++) out[i]! *= k
  }
  return buffer
}
