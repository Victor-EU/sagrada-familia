import * as THREE from 'three'

/**
 * Make a surface's winding agree with the normals it was given.
 *
 * Every generator here writes its normals analytically — the gradient of the
 * quadric for a hyperboloid, the cross product of the two parametric
 * derivatives for a ruled patch — because averaging face normals rounds off
 * exactly the creases a white model is read by. Nothing, until this, checked
 * that the triangles were wound the same way round as those normals point.
 *
 * They were not, on most of the building. A quadric's gradient points out of
 * the solid; the obvious loop over (row, col) winds the other way, and the
 * two were written years of commits apart. An audit of a built frame put it
 * at 106 of 372 geometries and about 1.17 million triangles — every column,
 * every vault funnel, the apse, the bosses, the tips, the parapets.
 *
 * The damage is not the obvious one. These are all `DoubleSide`, so nothing
 * vanished and nothing z-fought, and it looked fine in silhouette. But three
 * flips the normal for a back face by `gl_FrontFacing` — it trusts the
 * winding to say which side it is looking at — so when winding and normal
 * disagree the flip is applied exactly when it should not be, and the shading
 * normal points *away from the camera from both sides*. A vault soffit
 * standing over the nave was lit as though the sun reached it through the
 * stone: measured under a hemisphere light, red below and blue above, it came
 * back blue. Every surface in the room was being lit from behind, which is
 * why no column had a shaded flank, no funnel had a rib, and an interior that
 * should run its vault 2.4x brighter than its columns ran them at 1.07x.
 *
 * The normals are the considered half and the winding is the incidental one,
 * so the winding gives way. For a double-sided surface that is free: winding
 * decides only which face three calls the front, and nothing else here reads
 * that. Per triangle rather than per geometry, because merged surfaces arrive
 * carrying more than one generator's idea of the right way round.
 */
export function agreeWinding(geometry: THREE.BufferGeometry): number {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  if (!position || !normal) return 0

  const index = geometry.getIndex()
  const triangles = Math.floor((index ? index.count : position.count) / 3)

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const face = new THREE.Vector3()
  const stored = new THREE.Vector3()
  const corner = new THREE.Vector3()

  let flipped = 0
  for (let t = 0; t < triangles; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2

    a.fromBufferAttribute(position, i0)
    b.fromBufferAttribute(position, i1)
    c.fromBufferAttribute(position, i2)
    face.crossVectors(b.sub(a), c.sub(a))
    // A degenerate sliver has no opinion about which way it faces.
    if (face.lengthSq() < 1e-18) continue

    stored.set(0, 0, 0)
    stored.add(corner.fromBufferAttribute(normal, i0))
    stored.add(corner.fromBufferAttribute(normal, i1))
    stored.add(corner.fromBufferAttribute(normal, i2))
    if (face.dot(stored) >= 0) continue

    if (index) {
      index.setX(t * 3 + 1, i2)
      index.setX(t * 3 + 2, i1)
    } else {
      swapVertices(geometry, i1, i2)
    }
    flipped++
  }

  if (flipped > 0) {
    if (index) index.needsUpdate = true
    else for (const attribute of Object.values(geometry.attributes)) attribute.needsUpdate = true
  }
  return flipped
}

/** Exchange two vertices wholesale, however many attributes they carry. */
function swapVertices(geometry: THREE.BufferGeometry, i: number, j: number): void {
  for (const attribute of Object.values(geometry.attributes)) {
    const { array, itemSize } = attribute
    for (let k = 0; k < itemSize; k++) {
      const swap = array[i * itemSize + k]!
      array[i * itemSize + k] = array[j * itemSize + k]!
      array[j * itemSize + k] = swap
    }
  }
}
