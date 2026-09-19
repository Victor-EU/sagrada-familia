import * as THREE from 'three'

/**
 * The plaster maquette palette. Everything structural is one material; the
 * glass is the only saturated thing in the scene.
 *
 * Deferred from phase 0: a wrap-lighting / thin-edge scattering term. Pure
 * Lambertian white reads as paper rather than plaster, but patching three's
 * shader chunks is version-fragile and belongs with the phase 1 look work.
 */
export const PLASTER = 0xf2eee7
export const PLASTER_GROUND = 0xcfcabf

export function plasterMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PLASTER,
    roughness: 0.85,
    metalness: 0,
    envMapIntensity: 0.55,
    side: THREE.DoubleSide, // vault webbing is thin and seen from both sides
  })
}

export function groundMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PLASTER_GROUND,
    roughness: 0.95,
    metalness: 0,
    envMapIntensity: 0.4,
  })
}

/**
 * The pavement.
 *
 * Barely a shade off the plaster and a touch rougher, because in the
 * photographs the nave floor is the same pale stone as the walls, worn
 * smoother and lit from a different direction. Everything that distinguishes
 * it — joints, the grain from one slab to the next — is drawn in the shader
 * from world position, so there is no texture to load, none to filter, and
 * the pattern is exact at any distance.
 */
export const PLASTER_PAVING = 0xe9e4db

export function pavingMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: PLASTER_PAVING,
    roughness: 0.8,
    metalness: 0,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  })
}

/** Straight generators of a ruled surface, drawn over the surface itself. */
export function rulingMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x2b6cb0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
}
