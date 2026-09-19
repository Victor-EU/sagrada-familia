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

/** Straight generators of a ruled surface, drawn over the surface itself. */
export function rulingMaterial(): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({
    color: 0x2b6cb0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })
}
