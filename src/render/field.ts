import * as THREE from 'three'

/**
 * A field of repeated pieces, each drawn at whatever detail it has earned.
 *
 * A nave is seventy-odd columns, and phase 1 left one of them costing 450,000
 * triangles across twenty-one meshes. Sharing geometry fixed the memory and
 * did nothing at all for the frame, because the cost of a draw is the cost of
 * a draw however many times the vertices are reused.
 *
 * So two things happen here, and they only work together:
 *
 *  - every copy of a piece is one **instance**, so a whole line of columns is
 *    a single draw call;
 *  - each copy is assigned a **level of detail** from its distance, and the
 *    instances are bucketed by level, so the draw call for the near columns is
 *    a different one from the draw call for the far columns.
 *
 * The buckets are rebuilt every frame from the camera. That sounds expensive
 * and is not: it is one sphere test and one distance per piece, a few hundred
 * operations for a whole cathedral, and it buys per-piece frustum culling that
 * a plain `InstancedMesh` cannot do for itself.
 */
export interface FieldLevel {
  geometry: THREE.BufferGeometry
  /**
   * How far this level strays from the true surface, in metres.
   *
   * This, and not the triangle count, is what decides when a level may be
   * used. Each builder states it in its own terms — the sagitta of a chord
   * for a smooth hyperboloid, the measured depth of the fluting lost for a
   * twisted column — and the field only has to compare it against what a
   * pixel can hold at this distance.
   */
  error: number
}

export interface FieldKindSpec {
  name: string
  /** The same piece at falling detail, most detailed first. */
  levels: FieldLevel[]
  material: THREE.Material
  /** Where each copy stands. */
  placements: THREE.Matrix4[]
  /**
   * This kind's own tolerance, if a pixel of error does not mean for it what
   * it means for a smooth surface.
   */
  tolerancePx?: number
}

/**
 * How large an error a level may introduce, in pixels, before the level above
 * it is used instead.
 *
 * A level is acceptable once the deviation it introduces projects to less than
 * this on screen. One pixel is the honest default, because for a surface with
 * analytic normals — every hyperboloid here — coarsening moves the *outline*
 * and nothing else: the shading stays exactly right, so the error is a
 * silhouette displacement and a pixel is a pixel.
 *
 * Kinds whose error means something else say so; see `tolerancePx`.
 *
 * Because the test is angular it follows the field of view and the viewport,
 * which a distance in metres could not: the same column at the same place gets
 * more detail through a long lens, which is exactly right.
 */
export const SWITCH_TOLERANCE_PX = 1.2

/**
 * The level the sun passes draw at.
 *
 * Shadows need a silhouette and nothing else. Fitted to a nave the sun's
 * ortho frustum makes a 2048² depth map about six centimetres to the texel,
 * and the coarsest column rebuilt here is within a centimetre of the finest,
 * so the cheap one is not an approximation of the shadow — it *is* the
 * shadow, to well under a texel.
 */
export const SUN_DETAIL_LEVEL = 2

/** Anything that re-buckets itself for each of the renderer's passes. */
export interface PassParticipant {
  prepareForSun(level: number): void
  prepareForView(camera: THREE.PerspectiveCamera, pixelHeight: number): void
}

interface Kind {
  name: string
  meshes: THREE.InstancedMesh[]
  placements: THREE.Matrix4[]
  /** World-space bounding sphere of each placement, for culling. */
  spheres: THREE.Sphere[]
  /**
   * World-space bounding box of each placement, for distance.
   *
   * Not the sphere. A tree column is 36 m tall and 8 m wide, so its bounding
   * sphere has a 19 m radius; measuring to the sphere's surface reports a
   * column forty metres down the nave as twenty-one metres away and keeps the
   * whole nave at full detail. The box is tight where it matters.
   */
  boxes: THREE.Box3[]
  /** Deviation each level introduces, metres. */
  error: number[]
  /** Pixels of that deviation this kind is allowed to show. */
  tolerance: number
  /** Triangles in each level. */
  triangles: number[]
}

export class InstancedField implements PassParticipant {
  readonly group = new THREE.Group()
  private readonly kinds: Kind[] = []
  private readonly frustum = new THREE.Frustum()
  private readonly viewProjection = new THREE.Matrix4()
  private drawn = 0
  private triangles = 0

  /**
   * Pin every piece to one level instead of choosing by distance. −1 is the
   * normal behaviour; anything else is for looking at a far level from close
   * up, which is the only way to judge whether a switch will be noticed.
   */
  forceLevel = -1

  /** Multiplier on every switch distance — the dial the budget is tuned on. */
  switchScale = 1

  constructor(specs: FieldKindSpec[]) {
    for (const spec of specs) {
      if (spec.levels.length === 0 || spec.placements.length === 0) continue

      const base = spec.levels[0]!.geometry
      if (!base.boundingSphere) base.computeBoundingSphere()
      if (!base.boundingBox) base.computeBoundingBox()
      const local = base.boundingSphere!
      const localBox = base.boundingBox!

      const meshes = spec.levels.map(({ geometry }) => {
        const mesh = new THREE.InstancedMesh(geometry, spec.material, spec.placements.length)
        // We cull each instance ourselves below; three's own test would use a
        // bounding volume over all of them, which for a nave-long line of
        // columns is the whole nave.
        mesh.frustumCulled = false
        mesh.count = 0
        mesh.visible = false
        this.group.add(mesh)
        return mesh
      })

      const spheres = spec.placements.map((matrix) => {
        const sphere = local.clone()
        sphere.applyMatrix4(matrix)
        return sphere
      })

      const boxes = spec.placements.map((matrix) => localBox.clone().applyMatrix4(matrix))

      this.kinds.push({
        name: spec.name,
        meshes,
        placements: spec.placements,
        spheres,
        boxes,
        error: spec.levels.map((level) => level.error),
        tolerance: spec.tolerancePx ?? SWITCH_TOLERANCE_PX,
        triangles: spec.levels.map(
          ({ geometry }) =>
            (geometry.index?.count ?? geometry.getAttribute('position').count) / 3,
        ),
      })
    }
  }

  /**
   * Bucket every piece by distance from this camera, and cull the rest.
   *
   * `pixelHeight` is the viewport height in device pixels; with the camera's
   * field of view it gives the angle one pixel covers, which is what the
   * switch is really measured against.
   */
  prepareForView(camera: THREE.PerspectiveCamera, pixelHeight = 1080): void {
    camera.updateMatrixWorld()
    this.viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.viewProjection)

    const eye = camera.position
    // Angle subtended by one pixel at the centre of the frame.
    const pixel =
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / Math.max(pixelHeight, 1)
    const pixelScale = this.switchScale * pixel
    this.drawn = 0
    this.triangles = 0

    for (const kind of this.kinds) {
      const counts = new Array<number>(kind.meshes.length).fill(0)
      const allowance = kind.tolerance * pixelScale

      for (let i = 0; i < kind.placements.length; i++) {
        const sphere = kind.spheres[i]!
        if (!this.frustum.intersectsSphere(sphere)) continue

        let level = kind.meshes.length - 1
        if (this.forceLevel >= 0) {
          level = Math.min(this.forceLevel, level)
        } else {
          // Measure to the near face of the piece: a 24 m column whose base
          // is at arm's length is not eighteen metres away.
          const distance = Math.max(0.1, kind.boxes[i]!.distanceToPoint(eye))
          for (let l = 0; l < kind.meshes.length - 1; l++) {
            // Use level l if the next one down would stray further than a
            // pixel or so at this distance.
            if (kind.error[l + 1]! > allowance * distance) {
              level = l
              break
            }
          }
        }

        const mesh = kind.meshes[level]!
        mesh.setMatrixAt(counts[level]!, kind.placements[i]!)
        counts[level]!++
      }

      this.commit(kind, counts)
    }
  }

  /**
   * Bucket every piece at one fixed level, with no culling.
   *
   * The sun passes look at the model from the sun, not from the eye, so a
   * camera-derived bucketing would drop the very columns whose shadows fall
   * into view. They also only need a silhouette: at 2048² over a nave-sized
   * fit a shadow texel is centimetres across, and the coarsest column is
   * within a centimetre of the finest. So the shadow gets the cheap one.
   */
  prepareForSun(level: number): void {
    for (const kind of this.kinds) {
      const counts = new Array<number>(kind.meshes.length).fill(0)
      const use = Math.min(level, kind.meshes.length - 1)
      const mesh = kind.meshes[use]!
      for (let i = 0; i < kind.placements.length; i++) {
        mesh.setMatrixAt(i, kind.placements[i]!)
      }
      counts[use] = kind.placements.length
      this.commit(kind, counts)
    }
  }

  private commit(kind: Kind, counts: number[]): void {
    for (let l = 0; l < kind.meshes.length; l++) {
      const mesh = kind.meshes[l]!
      const count = counts[l]!
      mesh.count = count
      mesh.visible = count > 0
      if (count > 0) {
        mesh.instanceMatrix.needsUpdate = true
        this.drawn += count
        this.triangles += count * kind.triangles[l]!
      }
    }
  }

  /** What the last `prepare` decided — for the heads-up display. */
  stats(): { pieces: number; triangles: number; draws: number } {
    let draws = 0
    for (const kind of this.kinds) {
      for (const mesh of kind.meshes) if (mesh.visible) draws++
    }
    return { pieces: this.drawn, triangles: this.triangles, draws }
  }

  dispose(): void {
    for (const kind of this.kinds) {
      for (const mesh of kind.meshes) {
        mesh.dispose()
        mesh.geometry.dispose()
      }
    }
    this.kinds.length = 0
    this.group.clear()
  }
}
