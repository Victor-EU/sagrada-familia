/**
 * Everything in the building sits on a 7.5 m module.
 *
 * All four vault heights are integer multiples of it and the Tower of Jesus
 * Christ is 23 of them, so heights are declared as counts rather than as magic
 * numbers.
 */
export const MODULE = 7.5

export const VAULT_HEIGHT = {
  /** Side aisles, 7.5 × 4. */
  sideAisle: MODULE * 4,
  /** Central nave, 7.5 × 6. */
  nave: MODULE * 6,
  /** Crossing, 7.5 × 8. */
  crossing: MODULE * 8,
  /** Apse, 7.5 × 10 — the highest vault in the building. */
  apse: MODULE * 10,
} as const

/** Tower of Jesus Christ: 172.5 m, which is 23 modules. */
export const JESUS_TOWER_HEIGHT = MODULE * 23
