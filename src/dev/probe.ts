import * as THREE from 'three'
import type { Stage } from '../render/scene.ts'

/**
 * What is actually in this frame, by surface, measured rather than looked at.
 *
 * "The canopy reads as noise" is not something you can act on. Twice now a
 * surface has been quietly eating the picture — a boss grown into a
 * thirteen-metre cylinder, an aisle vault reaching four metres into the nave —
 * and both times the frame looked like undifferentiated white mush, which is
 * exactly what a hundred overlapping surfaces look like whichever one is at
 * fault.
 *
 * So: give every kind of surface its own flat colour, render the frame once
 * more into an offscreen buffer, and read it back. That gives a per-pixel map
 * of which surface is in front, and from it two numbers worth having —
 *
 *  - **share**, the fraction of the frame each kind covers, which says what
 *    you are actually looking at. A view up the central nave whose largest
 *    object is the *aisle* vault is a view of the wrong thing, and no amount
 *    of squinting at the render says so as plainly as the number does;
 *  - **fragmentation**, the fraction of neighbouring pixel pairs that land on
 *    different surfaces. A clean vault is a few large shapes and scores low;
 *    a heap of interpenetrating slivers scores high. It is the closest single
 *    number to what "noisy" means.
 *
 * Costs one extra render and no permanent state: materials are swapped in,
 * the buffer is read, and everything is put back.
 */
export interface FrameCensus {
  /** Percentage of neighbouring pixel pairs that cross a surface boundary. */
  fragmentation: number
  /** Percentage of the frame that is sky. */
  sky: number
  /** Every kind covering at least `floor` percent, largest first. */
  share: { name: string; pct: number }[]
}

/**
 * Collapse an instanced mesh's name to the kind of thing it is.
 *
 * Names carry the full parameters of the piece so that a raycast can identify
 * one exactly; for a census that is too much resolution — every cell size is
 * its own name and the ranking turns to dust.
 */
function kindOf(name: string): string {
  const bare = name.replace(/ @\d+$/, '')
  const head = bare.slice(0, bare.indexOf(' '))
  const rest = bare.slice(head.length + 1)
  if (head === 'column') return `column ${rest.split(':')[0]}`
  if (head === 'tip') return `rosette ${rest.split(':')[0]}`
  if (head === 'funnel' || head === 'boss' || head === 'cap') {
    try {
      const p = JSON.parse(rest) as { cell: { x: number; z: number }; crownHeight: number }
      return `${head} ${p.cell.x}×${p.cell.z} at ${p.crownHeight}`
    } catch {
      return head
    }
  }
  return bare
}

export function censusFrame(
  stage: Stage,
  fields: THREE.Object3D[],
  width = 320,
  height = 560,
  floor = 0.3,
): FrameCensus {
  const names: string[] = []
  const index = new Map<string, number>()
  const painted: { mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }[] = []

  const claim = (name: string): number => {
    let id = index.get(name)
    if (id === undefined) {
      id = names.length
      index.set(name, id)
      names.push(name)
    }
    return id
  }

  const paint = (mesh: THREE.Mesh, name: string): void => {
    const id = claim(name)
    painted.push({ mesh, material: mesh.material })
    const flat = new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide })
    // The id goes in two channels, base 32, one step of 8/255 per digit —
    // far enough apart that nothing in the buffer can be mistaken for its
    // neighbour, and 0 is reserved for sky.
    //
    // It used to go in red alone, which held thirty-one kinds and silently
    // wrapped past that: everything above the limit decoded as the same id,
    // and the census came back saying one surface covered the whole frame.
    // The building has had more than thirty-one kinds of surface in it since
    // the towers arrived.
    const code = id + 1
    flat.color.setRGB(((code % 32) * 8) / 255, ((Math.floor(code / 32) % 32) * 8) / 255, 0)
    mesh.material = flat
  }

  for (const field of fields) {
    for (const child of field.children) {
      if (child instanceof THREE.InstancedMesh && child.visible && child.count > 0) {
        paint(child, kindOf(child.name))
      }
    }
  }
  // Walls and their glass are drawn once rather than instanced, and the glass
  // sits on its own layer, which the eye camera does not render.
  stage.scene.traverse((node) => {
    if (node instanceof THREE.Mesh && node.layers.mask === 1 && !(node instanceof THREE.InstancedMesh)) {
      paint(
        node,
        node === stage.ground
          ? 'plaza'
          : node === stage.figure
            ? 'figure'
            : node.name || 'wall',
      )
    }
  })

  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.UnsignedByteType })
  const tone = stage.renderer.toneMapping
  const background = stage.scene.background
  // The census frames itself rather than borrowing the window's shape.
  //
  // It renders into a target of its own size and used to do it through the
  // camera's live aspect ratio, so the same viewpoint measured on a wide
  // window and a tall one came back as two different pictures — a view up
  // the nave lost two thirds of its vault to a wider desktop. A regression
  // harness whose frames depend on how the user dragged a window is not one.
  const aspect = stage.camera.aspect
  stage.camera.aspect = width / height
  stage.camera.updateProjectionMatrix()
  stage.renderer.toneMapping = THREE.NoToneMapping
  stage.scene.background = new THREE.Color(0, 0, 0)
  stage.renderer.setRenderTarget(target)
  stage.renderer.render(stage.scene, stage.camera)
  const pixels = new Uint8Array(width * height * 4)
  stage.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)
  stage.renderer.setRenderTarget(null)
  stage.renderer.toneMapping = tone
  stage.scene.background = background
  stage.camera.aspect = aspect
  stage.camera.updateProjectionMatrix()

  for (const { mesh, material } of painted) {
    ;(mesh.material as THREE.Material).dispose()
    mesh.material = material
  }
  target.dispose()

  const id = new Int16Array(width * height)
  const area = new Array<number>(names.length).fill(0)
  let sky = 0
  for (let i = 0; i < width * height; i++) {
    const code = Math.round(pixels[i * 4]! / 8) + Math.round(pixels[i * 4 + 1]! / 8) * 32
    const which = code - 1
    id[i] = which
    if (which < 0 || which >= names.length) sky++
    else area[which]!++
  }

  let crossings = 0
  let pairs = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (x + 1 < width) {
        pairs++
        if (id[i] !== id[i + 1]) crossings++
      }
      if (y + 1 < height) {
        pairs++
        if (id[i] !== id[i + width]) crossings++
      }
    }
  }

  const total = width * height
  return {
    fragmentation: round(100 * crossings / pairs),
    sky: round(100 * sky / total),
    share: names
      .map((name, i) => ({ name, pct: round(100 * area[i]! / total) }))
      .filter((row) => row.pct >= floor)
      .sort((a, b) => b.pct - a.pct),
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * What the light in this frame is actually doing, in numbers.
 *
 * "It looks flat" is the exterior's version of "the canopy reads as noise" —
 * true, unactionable, and equally likely to send you off changing the albedo
 * when the problem is the sun. So the frame is rendered once more with tone
 * mapping on, read back, and reduced to the three numbers that say whether
 * there is any modelling in it:
 *
 *  - **spread**, the 10th to 90th percentile of luminance across the stone.
 *    A façade with a lit side and a shaded side has a wide one; a façade lit
 *    from everywhere at once has none, however bright it is.
 *  - **median**, so a dark frame and a flat frame are told apart.
 *  - **warmth**, mean red minus mean blue over the stone, which says whether
 *    the sun is arriving coloured or the whole thing is being lit by probe.
 *
 * Sky is excluded by depth rather than by colour: a blue sky and a blue-lit
 * wall are the same pixel, and it is the wall that is being asked about.
 */
export interface LightCensus {
  spread: number
  median: number
  warmth: number
  /** Fraction of the frame that is not sky. */
  coverage: number
}

export function censusLight(stage: Stage, width = 360, height = 400): LightCensus {
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.UnsignedByteType })
  const aspect = stage.camera.aspect
  const background = stage.scene.background
  stage.camera.aspect = width / height
  stage.camera.updateProjectionMatrix()
  // Sky becomes pure magenta, which nothing in a sandstone building can be,
  // so the stone can be separated from it without a depth pass.
  stage.scene.background = new THREE.Color(1, 0, 1)
  stage.renderer.setRenderTarget(target)
  stage.renderer.render(stage.scene, stage.camera)

  const pixels = new Uint8Array(width * height * 4)
  stage.renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)

  stage.renderer.setRenderTarget(null)
  stage.scene.background = background
  stage.camera.aspect = aspect
  stage.camera.updateProjectionMatrix()
  target.dispose()

  const lum: number[] = []
  let red = 0
  let blue = 0
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!
    if (r > 200 && g < 60 && b > 200) continue
    lum.push(0.2126 * r + 0.7152 * g + 0.0722 * b)
    red += r
    blue += b
  }
  if (lum.length === 0) return { spread: 0, median: 0, warmth: 0, coverage: 0 }
  lum.sort((a, b) => a - b)
  const at = (q: number): number => lum[Math.min(lum.length - 1, Math.floor(q * lum.length))]!
  return {
    spread: Math.round(at(0.9) - at(0.1)),
    median: Math.round(at(0.5)),
    warmth: Math.round((red - blue) / lum.length),
    coverage: Math.round((100 * lum.length) / (width * height)),
  }
}
