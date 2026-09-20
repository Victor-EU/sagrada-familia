import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * The Eixample, and why a cathedral needs one.
 *
 * Everything else in this project is generated from the building's own rules,
 * and this is not: not one metre of it is Sagrada Família. It is here because
 * of what the building was doing without it, which was floating on a grey
 * disc three hundred metres across with a hard edge and nothing on it. A
 * hundred and seventy-two metres means nothing next to nothing. The tower is
 * only tall if something is short, and every photograph anybody has ever
 * taken of this building has the answer in it — six storeys of Eixample,
 * twenty metres of it, running away in every direction, with the towers
 * coming up out of the middle like something that arrived rather than
 * something that was built.
 *
 * So: Cerdà's grid, which is the one piece of context this building cannot
 * be understood without.
 *
 * The blocks are *illes* — 113 m square with the corners cut off at 45°, on a
 * 133 m pitch, which is Cerdà's plan and is why Barcelona seen from the air
 * is a field of octagons. The temple stands on one of them. The two blocks
 * facing its finished fronts are the parks that are actually there: Plaça de
 * Gaudí opposite the Nativity front, with the pond every photographer in the
 * world stands at, and Plaça de la Sagrada Família opposite the Passion.
 *
 * None of it is lit properly and none of it needs to be. It is on its own
 * layer, so the pass that asks what roofs a room never sees it and the sun's
 * shadow map is never fitted around it — a city in the ortho fit would coarsen
 * every shadow in the nave to pay for scenery nobody is standing next to. It
 * is scale, and scale is all it is.
 */

/** Cerdà: 113.3 m of block, 20 m of street, and the corners cut at 45°. */
export interface CityParams {
  show: boolean
  /** Rings of blocks out from the temple. 5 reaches about 670 m. */
  rings: number
  /** Block centre to block centre. */
  pitch: number
  /** The side of the square before the corners come off. */
  side: number
  /** How far back along each edge the 45° chamfer starts. */
  chamfer: number
  /** Storey height, and how many of them a block gets. */
  storey: number
  storeysMin: number
  storeysMax: number
  /** Where the temple's own block is centred, in model x/z. */
  centre: [number, number]
  trees: boolean
}

export const defaultCity: CityParams = {
  show: true,
  rings: 5,
  pitch: 133.3,
  side: 113.3,
  // A 20 m chamfer face, which is what the plan gives: the cut runs back
  // 20/√2 along each edge.
  chamfer: 14.1,
  storey: 3.2,
  storeysMin: 5,
  storeysMax: 8,
  // The church runs from z = +43 to z = -81, so its block centres a little
  // behind the Glory front rather than on the crossing.
  centre: [0, -19],
  trees: true,
}

export interface City {
  group: THREE.Group
  dispose(): void
}

/** Deterministic noise, so the skyline is the same one every reload. */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** One *illa*: a square with its four corners cut off at 45°. */
function illa(side: number, chamfer: number): THREE.Shape {
  const h = side / 2
  const c = Math.min(chamfer, h * 0.9)
  const shape = new THREE.Shape()
  shape.moveTo(-h + c, -h)
  shape.lineTo(h - c, -h)
  shape.lineTo(h, -h + c)
  shape.lineTo(h, h - c)
  shape.lineTo(h - c, h)
  shape.lineTo(-h + c, h)
  shape.lineTo(-h, h - c)
  shape.lineTo(-h, -h + c)
  shape.closePath()
  return shape
}

/** The same outline shrunk, which is the courtyard every illa is built round. */
function courtyard(side: number, chamfer: number, inset: number): THREE.Path {
  const s = illa(side - inset * 2, chamfer * 0.7)
  return new THREE.Path(s.getPoints(9))
}

/**
 * The palette.
 *
 * Barcelona's blocks are render and stucco in a narrow band of warm off-whites
 * with a lot of ochre in them, and roofs are terracotta. Both are held well
 * below the temple's own stone so that nothing out here competes with it:
 * scenery that reads as brighter than the subject is not scenery.
 */
const WALLS = [0xa39889, 0xac9f8c, 0x968b7d, 0x9f8f78, 0xb0a593, 0x8e8477, 0xa8987f]
const ROOFS = [0x8a6149, 0x96694e, 0x7d5844]

/**
 * Colour is carried on the vertices, not in the material.
 *
 * A hundred blocks at one albedo is one object with a complicated outline,
 * and the eye reads it as a single grey mass rather than as a city. Per-block
 * tone breaks it up, per-face tone puts roofs on it, and a fade toward the
 * sky's own horizon colour with distance does the work that aerial
 * perspective does in a photograph — which is most of why a long view of
 * Barcelona reads as *long*. One material, one draw call, all three.
 */
function tint(
  geometry: THREE.BufferGeometry,
  wall: THREE.Color,
  roof: THREE.Color,
  haze: THREE.Color,
  distance: number,
  reach: number,
): void {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const colour = new Float32Array(position.count * 3)
  // Barely anything, now that the scene has real fog in it.
  //
  // This used to carry the whole of the aerial perspective and went to 0.62,
  // which was right while it was the only thing doing the job and wrong the
  // moment scene.fog arrived: two fades compounding took terracotta roofs
  // through the blue haze and out the other side, and half of Barcelona came
  // back mauve. The fog is the honest one — it knows where the camera is.
  // What is left here is a little extra softening on the far blocks so the
  // grid does not read as uniformly crisp before the fog gets hold of it.
  const fade = Math.min(0.18, (distance / reach) ** 1.6 * 0.18)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const up = normal.getY(i) > 0.5
    c.copy(up ? roof : wall).lerp(haze, fade)
    colour[i * 3] = c.r
    colour[i * 3 + 1] = c.g
    colour[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
}

/**
 * Flatten, because `mergeGeometries` will not mix the two.
 *
 * An extrusion comes back non-indexed and a box comes back indexed, and a
 * merge of the two returns *null* rather than throwing — so the first version
 * of this file put a Mesh with no geometry into the scene and the whole
 * renderer fell over on the next frame with a null dereference three calls
 * deep in three. Everything is flattened on the way in, and the colour
 * attribute is written afterwards so its count always matches.
 */
function flat(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!geometry.index) return geometry
  const out = geometry.toNonIndexed()
  geometry.dispose()
  return out
}

/** Extrude one outline to a height, standing on the ground plane. */
function slab(shape: THREE.Shape, height: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  return flat(g)
}

/**
 * A tree, cheaply.
 *
 * Barcelona's street tree is the plane, and what matters here is not the
 * species but that there is something eight metres tall with a soft edge
 * standing between the eye and the building. A cathedral behind trees is a
 * cathedral you are looking at from somewhere; a cathedral on bare ground is
 * an object on a table.
 */
function treeGeometry(): THREE.BufferGeometry {
  const trunk = flat(new THREE.CylinderGeometry(0.16, 0.24, 3.0, 6))
  trunk.translate(0, 1.5, 0)
  const crown = flat(new THREE.IcosahedronGeometry(2.2, 1))
  crown.scale(1, 0.82, 1)
  crown.translate(0, 4.5, 0)
  const bark = new THREE.Color(0x6d6152)
  const leaf = new THREE.Color(0x5a6b3e)
  for (const [g, c] of [
    [trunk, bark],
    [crown, leaf],
  ] as const) {
    const n = g.getAttribute('position').count
    const colour = new Float32Array(n * 3)
    const shade = new THREE.Color()
    for (let i = 0; i < n; i++) {
      // A flat green ball reads as a ball. Shading it by height gives the
      // crown a lit top and a dark underside for nothing.
      const y = g.getAttribute('position').getY(i)
      shade.copy(c).multiplyScalar(0.78 + 0.34 * THREE.MathUtils.clamp(y / 8, 0, 1))
      colour[i * 3] = shade.r
      colour[i * 3 + 1] = shade.g
      colour[i * 3 + 2] = shade.b
    }
    g.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  }
  const merged = mergeGeometries([trunk, crown], false)
  if (!merged) throw new Error('city: tree geometry could not be merged')
  trunk.dispose()
  crown.dispose()
  return merged
}

export interface CityMaterials {
  /** Takes vertex colour; used for blocks, trees and the parks. */
  massing: THREE.Material
  water: THREE.Material
}

/**
 * Build the grid.
 *
 * `hazeColour` is the sky at the horizon, which is what distance fades toward.
 */
export function buildCity(
  params: CityParams,
  materials: CityMaterials,
  hazeColour: THREE.Color,
): City {
  const group = new THREE.Group()
  group.name = 'city'
  const disposables: THREE.BufferGeometry[] = []
  if (!params.show) return { group, dispose: () => {} }

  const random = rng(0x5a6f1a)
  const [cx, cz] = params.centre
  const reach = params.pitch * (params.rings + 0.5)

  // The temple's own cell, and the two parks facing its finished fronts.
  // +x is the Nativity side and −x the Passion, which is how towers.ts lays
  // the eighteen out.
  const TEMPLE = '0,0'
  const GAUDI = '1,0'
  const PLACA = '-1,0'
  /**
   * The Glory esplanade.
   *
   * The front that is not built yet is the one that needs the most room: the
   * Glory façade is designed to be met from a distance, across a forecourt
   * that would take out the block in front of it. Leaving that block standing
   * put a six-storey wall fourteen metres off the main door, and the one view
   * the whole composition is aimed at was a view of somebody's render.
   */
  const ESPLANADE = '0,1'

  const blocks: THREE.BufferGeometry[] = []
  const parks: THREE.BufferGeometry[] = []
  const treeSpots: THREE.Vector3[] = []

  for (let i = -params.rings; i <= params.rings; i++) {
    for (let j = -params.rings; j <= params.rings; j++) {
      const key = `${i},${j}`
      if (key === TEMPLE) continue
      const x = cx + i * params.pitch
      const z = cz + j * params.pitch
      const distance = Math.hypot(x - cx, z - cz)

      if (key === ESPLANADE) {
        const paved = slab(illa(params.side, params.chamfer), 0.1)
        paved.translate(x, 0, z)
        tint(paved, new THREE.Color(0xb3a794), new THREE.Color(0xb3a794), hazeColour, distance, reach)
        parks.push(paved)
        // Trees down the two flanks only. The middle is the approach.
        for (let t = -params.side / 2 + 10; t < params.side / 2; t += 13) {
          for (const side of [-1, 1]) {
            treeSpots.push(new THREE.Vector3(x + side * params.side * 0.36, 0, z + t))
          }
        }
        continue
      }

      if (key === GAUDI || key === PLACA) {
        // A park is the block without the building on it: grass, and trees
        // laid out loosely enough that they do not read as an orchard.
        const green = slab(illa(params.side, params.chamfer), 0.12)
        green.translate(x, 0, z)
        tint(green, new THREE.Color(0x6f7a4e), new THREE.Color(0x76814f), hazeColour, distance, reach)
        parks.push(green)

        const rows = 7
        for (let a = 0; a < rows; a++) {
          for (let b = 0; b < rows; b++) {
            const px = x + (a / (rows - 1) - 0.5) * params.side * 0.82
            const pz = z + (b / (rows - 1) - 0.5) * params.side * 0.82
            // The pond on the Gaudí side keeps its own water clear.
            if (key === GAUDI && Math.hypot(px - (x - 14), pz - z) < 26) continue
            // And the axis of the façade keeps its own sightline clear. A
            // plaza planted evenly is a plaza you cannot see the building
            // from: the first version put a ten-metre plane tree dead centre
            // of the one view the whole approach is built around.
            if (Math.abs(pz - cz) < 17) continue
            if (random() > 0.62) continue
            treeSpots.push(
              new THREE.Vector3(px + (random() - 0.5) * 9, 0, pz + (random() - 0.5) * 9),
            )
          }
        }
        continue
      }

      const storeys = Math.round(
        THREE.MathUtils.lerp(params.storeysMin, params.storeysMax, random() ** 1.3),
      )
      const height = storeys * params.storey
      const shape = illa(params.side, params.chamfer)
      shape.holes.push(courtyard(params.side, params.chamfer, 22 + random() * 8))
      const g = slab(shape, height)
      g.translate(x, 0, z)
      const wall = new THREE.Color(WALLS[Math.floor(random() * WALLS.length)]!)
      const roof = new THREE.Color(ROOFS[Math.floor(random() * ROOFS.length)]!)
      tint(g, wall, roof, hazeColour, distance, reach)
      blocks.push(g)

      // One block in four carries something taller in a corner, which is
      // enough to stop the roofline being a single ruled surface.
      if (random() > 0.74) {
        const cap = flat(
          new THREE.BoxGeometry(16 + random() * 14, params.storey * 2, 14 + random() * 12),
        )
        cap.translate(
          x + (random() - 0.5) * params.side * 0.5,
          height + params.storey,
          z + (random() - 0.5) * params.side * 0.5,
        )
        tint(cap, wall, roof, hazeColour, distance, reach)
        blocks.push(cap)
      }
    }
  }

  // Street trees on the four streets around the temple, which is where a
  // walker on the plaza actually sees them.
  if (params.trees) {
    const half = params.side / 2
    const kerb = params.pitch / 2 - 3.5
    for (let t = -half; t <= half; t += 13) {
      // Nothing within sixteen metres of either axis: those are the four
      // lines the fronts are seen along.
      if (Math.abs(t) > 16) {
        treeSpots.push(new THREE.Vector3(cx + kerb, 0, cz + t))
        treeSpots.push(new THREE.Vector3(cx - kerb, 0, cz + t))
        treeSpots.push(new THREE.Vector3(cx + t, 0, cz + kerb))
        treeSpots.push(new THREE.Vector3(cx + t, 0, cz - kerb))
      }
    }
  }

  const merge = (list: THREE.BufferGeometry[]): THREE.BufferGeometry | null => {
    if (list.length === 0) return null
    const merged = mergeGeometries(list, false)
    for (const g of list) g.dispose()
    // Null means the attribute sets disagreed. Say so here rather than
    // letting a geometry-less Mesh reach the renderer.
    if (!merged) throw new Error('city: geometries could not be merged')
    return merged
  }

  for (const list of [blocks, parks]) {
    const merged = merge(list)
    if (!merged) continue
    disposables.push(merged)
    const mesh = new THREE.Mesh(merged, materials.massing)
    mesh.name = 'city-massing'
    group.add(mesh)
  }

  // The pond in Plaça de Gaudí — the one every photograph of the Nativity
  // front is taken across.
  const pondAt = new THREE.Vector3(cx + params.pitch - 14, 0.16, cz)
  const pond = new THREE.Mesh(new THREE.CircleGeometry(24, 48), materials.water)
  pond.rotation.x = -Math.PI / 2
  pond.scale.set(1, 0.72, 1)
  pond.position.copy(pondAt)
  pond.name = 'city-pond'
  disposables.push(pond.geometry as THREE.BufferGeometry)
  group.add(pond)

  if (params.trees && treeSpots.length > 0) {
    const geometry = treeGeometry()
    disposables.push(geometry)
    const trees = new THREE.InstancedMesh(geometry, materials.massing, treeSpots.length)
    trees.name = 'city-trees'
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    for (let i = 0; i < treeSpots.length; i++) {
      const scale = 0.78 + random() * 0.55
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2)
      s.set(scale, scale * (0.85 + random() * 0.4), scale)
      m.compose(treeSpots[i]!, q, s)
      trees.setMatrixAt(i, m)
    }
    trees.instanceMatrix.needsUpdate = true
    group.add(trees)
  }

  return {
    group,
    dispose() {
      for (const g of disposables) g.dispose()
    },
  }
}
