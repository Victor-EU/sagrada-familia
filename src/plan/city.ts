import * as THREE from 'three'
import { buildCrane, type CraneParams } from '../geometry/works.ts'
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
  /** The tower cranes on the site. See `buildCrane`. */
  cranes: boolean
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
  cranes: true,
}

/**
 * The temple's own cell, and the three fronts that are met across open
 * ground. +x is the Nativity side and −x the Passion, which is how towers.ts
 * lays the eighteen out.
 *
 * The Glory esplanade is the one that had to be argued for: the front that is
 * not built yet is the one that needs the most room, because it is designed
 * to be met from a distance, and leaving its block standing put a six-storey
 * wall fourteen metres off the main door.
 */
const TEMPLE = '0,0'
const GAUDI = '1,0'
const PLACA = '-1,0'
const ESPLANADE = '0,1'

/**
 * Which cells of the grid have nothing standing on them.
 *
 * Published because the camera needs it as much as the geometry does: an
 * orbit that comes down to street level has to know where there is street to
 * come down to, or it parks the viewer inside somebody's flat. See
 * `Surroundings` in camera/viewer.ts.
 */
export const OPEN_CELLS: ReadonlySet<string> = new Set([TEMPLE, GAUDI, PLACA, ESPLANADE])

/** The top of the tallest thing on a block, corner caps included. */
export function cityRoofline(p: CityParams): number {
  return p.storeysMax * p.storey + p.storey * 2
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
 * A tree, in two parts, because a tree is two materials.
 *
 * Barcelona's street tree is the plane, and what matters here is not the
 * species: it is that there is something eight metres tall with a *ragged*
 * edge standing between the eye and the building. The first version was an
 * icosahedron on a cylinder, and a sphere of flat green has exactly the fault
 * the whole exterior was being rebuilt to lose — a smooth closed outline with
 * no edge anywhere in it. Three crossed quads with the leaves cut out of them
 * cost the same and read as a tree; see `foliagePatch` in render/materials.ts
 * for the cutting.
 */

/** Where the crown's middle sits above the foot, and how far it reaches. */
export const CANOPY_HEART = 6.0
export const CANOPY_RADIUS = 3.8

function tintAll(g: THREE.BufferGeometry, colour: THREE.Color, lift: number): void {
  const position = g.getAttribute('position')
  const n = position.count
  const array = new Float32Array(n * 3)
  const shade = new THREE.Color()
  for (let i = 0; i < n; i++) {
    // A flat green plane reads as a plane. Shading by height gives the crown
    // a lit top and a dark underside for nothing.
    const y = position.getY(i)
    shade.copy(colour).multiplyScalar(0.74 + lift * THREE.MathUtils.clamp(y / 8, 0, 1))
    array[i * 3] = shade.r
    array[i * 3 + 1] = shade.g
    array[i * 3 + 2] = shade.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(array, 3))
}

function trunkGeometry(): THREE.BufferGeometry {
  const trunk = flat(new THREE.CylinderGeometry(0.14, 0.26, 3.4, 6))
  trunk.translate(0, 1.7, 0)
  tintAll(trunk, new THREE.Color(0x6d6152), 0.34)
  return trunk
}

/**
 * The crown: three quads crossed about the trunk.
 *
 * Three rather than two, because two read as a cross from directly above and
 * as a flat card from forty-five degrees off either of them. At sixty degrees
 * apart there is no angle from which the tree has no depth. They are
 * double-sided by the material, so the back of a quad is the same leaves seen
 * from behind.
 */
function canopyGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = []
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.PlaneGeometry(CANOPY_RADIUS * 2.2, CANOPY_RADIUS * 2.5)
    blade.translate(0, CANOPY_HEART, 0)
    blade.rotateY((i / 3) * Math.PI)
    blades.push(flat(blade))
  }
  const merged = mergeGeometries(blades, false)
  if (!merged) throw new Error('city: canopy could not be merged')
  for (const blade of blades) blade.dispose()
  tintAll(merged, new THREE.Color(0x5e7040), 0.4)
  return merged
}

/**
 * A kerb, a lamp post and a bollard.
 *
 * Nothing about them is Sagrada Família and that is the point. A plaza with
 * no street furniture on it has no scale in it either: the building is a
 * hundred and seventy metres tall only if something in the frame is four,
 * and a render of a cathedral standing on an unbroken sheet of paving is a
 * render of a model of a cathedral. These are the cheapest four-metre objects
 * there are.
 */
function lampGeometry(): THREE.BufferGeometry {
  const pieces: THREE.BufferGeometry[] = []
  const post = flat(new THREE.CylinderGeometry(0.07, 0.12, 5.2, 6))
  post.translate(0, 2.6, 0)
  pieces.push(post)
  const head = flat(new THREE.CylinderGeometry(0.34, 0.18, 0.5, 8))
  head.translate(0, 5.4, 0)
  pieces.push(head)
  const foot = flat(new THREE.CylinderGeometry(0.2, 0.26, 0.45, 8))
  foot.translate(0, 0.22, 0)
  pieces.push(foot)
  const merged = mergeGeometries(pieces, false)
  if (!merged) throw new Error('city: lamp could not be merged')
  for (const piece of pieces) piece.dispose()
  tintAll(merged, new THREE.Color(0x4c4a46), 0.3)
  return merged
}

export interface CityMaterials {
  /** Takes vertex colour; used for blocks, parks, trunks and lamp posts. */
  massing: THREE.Material
  /** The same, plus the leaf cut-out. Double-sided, alpha-tested. */
  foliage: THREE.Material
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

  /**
   * The plant, which stands on the site rather than in the grid.
   *
   * Two, because there are two in `ex-apse-flank-west.jpg` and two in
   * `ex-flank-elevation.jpg`, and they stand where the work is: one against
   * the apse, which is the end still being built, and one off the Glory
   * front, which is the end not yet built at all. Their steel is sampled off
   * the photographs — the three cranes in `reference/` come back at hue 20
   * to 37 and saturation 0.40 to 0.56, which is one paint and not three.
   *
   * The jibs are slewed across the building rather than away from it. A
   * crane parked with its jib pointing out of frame is a crane nobody sees,
   * and in every photograph here the jib crosses the towers.
   */
  if (params.cranes) {
    const steel = new THREE.Color(0xc98b46)
    const rigs: Array<[number, number, CraneParams]> = [
      [-52, -58, { height: 82, jib: 56, counter: 20, mast: 2.4, trolley: 34, drop: 46, turn: 0.62 }],
      [58, 34, { height: 64, jib: 48, counter: 17, mast: 2.1, trolley: 29, drop: 36, turn: 2.05 }],
    ]
    for (const [x, z, rig] of rigs) {
      // Non-indexed, because the blocks it is merged with are extrusions and
      // mergeGeometries refuses a list where some carry an index and some do
      // not — it fails on the first crane and takes the whole city with it.
      const crane = buildCrane(rig).toNonIndexed()
      crane.translate(x, 0, z)
      tintAll(crane, steel, 0.5)
      blocks.push(crane)
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
    // One set of placements, two meshes: the trunks go with the rest of the
    // massing and the crowns need the material that cuts leaves out of them.
    const placements: THREE.Matrix4[] = []
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    for (const spot of treeSpots) {
      const scale = 0.78 + random() * 0.55
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), random() * Math.PI * 2)
      s.set(scale, scale * (0.85 + random() * 0.4), scale)
      placements.push(m.clone().compose(spot, q, s))
    }
    for (const [geometry, material, name] of [
      [trunkGeometry(), materials.massing, 'city-trunks'],
      [canopyGeometry(), materials.foliage, 'city-leaves'],
    ] as const) {
      disposables.push(geometry)
      const mesh = new THREE.InstancedMesh(geometry, material, placements.length)
      mesh.name = name
      for (const [i, placement] of placements.entries()) mesh.setMatrixAt(i, placement)
      mesh.instanceMatrix.needsUpdate = true
      group.add(mesh)
    }

    // Lamp posts down the four streets round the temple. Every third tree
    // spot that is out on a kerb, which is about the spacing Barcelona uses
    // and, more to the point, enough of them to read as a rhythm.
    const lamps = lampGeometry()
    disposables.push(lamps)
    const posts = placements.filter((_, i) => i % 3 === 1)
    const lampMesh = new THREE.InstancedMesh(lamps, materials.massing, posts.length)
    lampMesh.name = 'city-lamps'
    const upright = new THREE.Quaternion()
    for (const [i, placement] of posts.entries()) {
      const at = new THREE.Vector3().setFromMatrixPosition(placement)
      // Off the tree and toward the road, so the two do not stand in one spot.
      at.x += 3.2
      lampMesh.setMatrixAt(i, m.clone().compose(at, upright, new THREE.Vector3(1, 1, 1)))
    }
    lampMesh.instanceMatrix.needsUpdate = true
    group.add(lampMesh)
  }

  return {
    group,
    dispose() {
      for (const g of disposables) g.dispose()
    },
  }
}
