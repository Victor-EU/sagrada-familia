import * as THREE from 'three'
import { FullScreenQuad, Pass } from 'three/examples/jsm/postprocessing/Pass.js'

/**
 * What a camera held here would be exposed at.
 *
 * Every photograph this model is judged against was metered. The author's
 * own December frames carry their exposures, and inside the building they
 * run from EV 6.3 — the central vault straight up at twenty past one — to
 * EV 9.6 for the wash on the Passion aisle vault at five to three: three and
 * a third stops of difference in what was actually there, delivered at
 * medians of 0.34 and 0.24. The camera took the difference out. A fixed
 * indoor stop cannot, so it was fitted to the frames full of lit glass and
 * left every frame without any — the canopy, the nave, the landing — a
 * stop under every photograph of them.
 *
 * So the frame is metered the way a camera meters it: the scene's radiance
 * before the film, brought down to a grid, and an exposure found at which
 * its centre-weighted mean reaches a key, each cell counting for no more
 * than `METER_CLIP` keys. And then the highlights are protected — see
 * METER_CEILING — which is the part that makes a frame full of lit glass
 * come back dark around the glass, the way the December photographs do, and
 * leaves a frame of stone to come back as stone, which is all the others.
 *
 * Read from before the bloom and before the film, so nothing the exposure
 * does can come back into what it is measured from. Two small passes, one
 * readback of eight kilobytes, every few frames and never while one is
 * still in flight.
 */

/** The grid the frame is reduced to. Wider than tall, like the frame. */
const GRID_X = 64
const GRID_Y = 32
/** The intermediate step, so each tap of both passes covers its footprint. */
const FINE_X = 256
const FINE_Y = 128
/** Frames between readings. The eye takes the best part of a second anyway. */
const EVERY = 4

/**
 * The key: the centre-weighted mean the exposure is solved for, in the
 * film's own units — AgX puts its white sixteen times above one, so a room
 * of stone is metered a long way down that range. Fitted over the frames
 * that have a photograph: it opens the canopy, the nave and the vault with
 * no sun on their glass to 0.37 – 0.41 median against photographs at 0.38 –
 * 0.46, and puts the December central vault, which the author's own camera
 * metered at EV 6.3, at 0.36 against its 0.34.
 */
export const METER_KEY = 0.14
/** A cell counts for at most this many keys — see above. */
export const METER_CLIP = 8
/**
 * And the highlights are protected, which is what a camera's pattern meter
 * does that an average does not: whatever the mean asks for, the brightest
 * `METER_TOP` of the frame may not be pushed past `METER_CEILING`, which in
 * this film is a little under half a stop below where colour goes to white.
 * A wall of lit glass closes the frame down until the glass keeps its
 * colour and the room around it goes as dark as it goes — which is the
 * December photographs, where the lancets sit at three quarters and
 * saturated and a tenth of the frame is black. A canopy with no sun on its
 * glass never reaches the rule: the brightest patches of every such frame
 * here meter between one and one and a half, and a December wall of lit
 * glass between four and ten.
 */
export const METER_TOP = 0.03
export const METER_CEILING = 2

const DOWN = /* glsl */ `
uniform sampler2D tSource;
uniform vec2 uStep;
uniform bool uEncode;
varying vec2 vUv;

vec2 pack( float l ) {
  float v = clamp( ( log2( max( l, 1e-7 ) ) + 24.0 ) / 48.0, 0.0, 1.0 );
  float n = floor( v * 65535.0 + 0.5 );
  float hi = floor( n / 256.0 );
  return vec2( hi, n - hi * 256.0 ) / 255.0;
}

void main() {
  // Sixteen bilinear taps spread across the footprint of one output cell,
  // each of which already averages four texels: a box over the whole cell.
  //
  // And, carried alongside, the brightest of the first pass's cells inside
  // this one — a patch about eight pixels across. Not the brightest pixel:
  // a lancet is five or ten pixels wide and survives being averaged over
  // eight, where a lamp on a capital is two or three and does not, and a
  // camera's highlights are an area and not a point. Weighted by the pixel,
  // every lamp in the canopy closed the frame down as if it were a window.
  float sum = 0.0;
  float peak = 0.0;
  for ( int j = 0; j < 4; j++ ) {
    for ( int i = 0; i < 4; i++ ) {
      vec2 at = vUv + ( vec2( float( i ), float( j ) ) - 1.5 ) * 0.25 * uStep;
      vec4 c = texture2D( tSource, at );
      // The first pass reads the scene and takes its luminance; the second
      // reads the first, which has already put the mean in red and the peak
      // in green.
      float l = uEncode ? c.r : dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
      float m = uEncode ? c.g : l;
      // A NaN from anywhere upstream would poison the whole reading.
      l = ( l == l && l < 1e5 ) ? max( l, 0.0 ) : 0.0;
      m = ( m == m && m < 1e5 ) ? max( m, 0.0 ) : 0.0;
      sum += l;
      peak = max( peak, m );
    }
  }
  float l = sum / 16.0;
  if ( !uEncode ) {
    gl_FragColor = vec4( l, l, 0.0, 1.0 );
    return;
  }
  // Eight bits a channel is all a readback can be trusted with everywhere,
  // so the log of each goes out in two of them: forty-eight stops in
  // sixteen bits.
  gl_FragColor = vec4( pack( l ), pack( peak ) );
}
`

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4( position.xy, 0.0, 1.0 );
}
`

export class MeterPass extends Pass {
  /**
   * The exposure — the film's own multiplier — at which this frame meets
   * the key, or null before the first reading has come back.
   */
  exposure: number | null = null
  /**
   * How many readings have come back. A reading is of the frame it was
   * asked for, which by the time it arrives is a frame or two old — so
   * anyone who has just changed the picture waits for this to move twice
   * before believing `exposure` is of the new one. See the film's pupil.
   */
  readings = 0
  /** The key and the clip it is solved against — see METER_KEY. */
  key = METER_KEY
  clip = METER_CLIP
  top = METER_TOP
  ceiling = METER_CEILING

  private readonly fine = new THREE.WebGLRenderTarget(FINE_X, FINE_Y, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
  })
  private readonly grid = new THREE.WebGLRenderTarget(GRID_X, GRID_Y, {
    type: THREE.UnsignedByteType,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: false,
  })
  private readonly material = new THREE.ShaderMaterial({
    name: 'Meter',
    uniforms: {
      tSource: { value: null },
      uStep: { value: new THREE.Vector2() },
      uEncode: { value: false },
    },
    vertexShader: VERTEX,
    fragmentShader: DOWN,
    depthTest: false,
    depthWrite: false,
  })
  private readonly quad = new FullScreenQuad(this.material)
  private readonly bytes = new Uint8Array(GRID_X * GRID_Y * 4)
  private readonly weights = new Float32Array(GRID_X * GRID_Y)
  private readonly cells = new Float32Array(GRID_X * GRID_Y)
  private readonly peak = new Float32Array(GRID_X * GRID_Y)
  private frame = 0
  private pending = false

  constructor() {
    super()
    // It writes nowhere the chain can see.
    this.needsSwap = false
    // Centre-weighted, the way a camera's pattern is: the middle of the
    // frame counts for five times a corner.
    for (let y = 0; y < GRID_Y; y++) {
      for (let x = 0; x < GRID_X; x++) {
        const u = ((x + 0.5) / GRID_X) * 2 - 1
        const v = ((y + 0.5) / GRID_Y) * 2 - 1
        this.weights[y * GRID_X + x] = 1 - 0.4 * (u * u + v * v)
      }
    }
  }

  override render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.frame = (this.frame + 1) % EVERY
    if (this.frame !== 0 || this.pending) return

    const u = this.material.uniforms
    u.tSource!.value = readBuffer.texture
    ;(u.uStep!.value as THREE.Vector2).set(1 / FINE_X, 1 / FINE_Y)
    u.uEncode!.value = false
    renderer.setRenderTarget(this.fine)
    this.quad.render(renderer)

    u.tSource!.value = this.fine.texture
    ;(u.uStep!.value as THREE.Vector2).set(1 / GRID_X, 1 / GRID_Y)
    u.uEncode!.value = true
    renderer.setRenderTarget(this.grid)
    this.quad.render(renderer)

    this.pending = true
    renderer
      .readRenderTargetPixelsAsync(this.grid, 0, 0, GRID_X, GRID_Y, this.bytes)
      .then(() => {
        this.exposure = this.solve()
        this.readings++
      })
      .catch(() => {
        // A lost context, or a browser without fences. The eye keeps the
        // stop it has, which is what it did before there was a meter.
      })
      .finally(() => {
        this.pending = false
      })
  }

  /** The cells as scene luminance, from the last reading. */
  luminance(): Float32Array {
    return this.unpack(0, this.cells)
  }

  /** The brightest patch of about eight pixels in each cell, from the same reading. */
  peaks(): Float32Array {
    return this.unpack(2, this.peak)
  }

  private unpack(channel: number, out: Float32Array): Float32Array {
    for (let i = 0; i < out.length; i++) {
      const n = this.bytes[i * 4 + channel]! * 256 + this.bytes[i * 4 + channel + 1]!
      out[i] = 2 ** ((n / 65535) * 48 - 24)
    }
    return out
  }

  /**
   * The exposure at which the clipped, weighted mean meets the key. The
   * mean only rises with exposure, so it is found by halving an interval
   * of stops rather than by any formula — the clip makes it piecewise.
   */
  private solve(): number {
    const cells = this.luminance()
    let total = 0
    for (let i = 0; i < cells.length; i++) total += this.weights[i]!
    const key = this.key
    const cap = this.clip * key
    const mean = (exposure: number): number => {
      let sum = 0
      for (let i = 0; i < cells.length; i++) sum += this.weights[i]! * Math.min(cells[i]! * exposure, cap)
      return sum / total
    }
    let lo = -24
    let hi = 24
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2
      if (mean(2 ** mid) < key) lo = mid
      else hi = mid
    }
    const metered = 2 ** ((lo + hi) / 2)

    const peaks = this.peaks().sort()
    const bright = peaks[Math.floor((1 - this.top) * (peaks.length - 1))]!
    return bright > 0 ? Math.min(metered, this.ceiling / bright) : metered
  }

  override dispose(): void {
    this.fine.dispose()
    this.grid.dispose()
    this.material.dispose()
    this.quad.dispose()
  }
}
