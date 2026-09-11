/**
 * Constantes de balanceamento de gameplay — isoladas aqui de propósito.
 * Rebalancear o jogo deve significar mexer só nesses números, nunca em lógica.
 * Ver docs/balancing/*.md para o racional por trás de cada valor.
 */

export const HUNGER_DECAY_PER_HOUR = 4
export const ENERGY_DECAY_PER_HOUR_AWAKE = 6
export const ENERGY_RECOVERY_PER_HOUR_ASLEEP = 12

export const LOW_ATTRIBUTE_THRESHOLD = 20

export const XP_PER_COMMIT_MIN = 1
export const XP_PER_COMMIT_MAX = 1000
export const XP_PER_COMMIT_MULTIPLIER = 50

export const LEVEL_CURVE_MULTIPLIER = 500
export const LEVEL_CURVE_EXPONENT = 1.5

export const DAILY_XP_CAP = 3000

export const ATTRIBUTE_MIN = 0
export const ATTRIBUTE_MAX = 100
export const STARTING_XP = 0
export const STARTING_LEVEL = 1
