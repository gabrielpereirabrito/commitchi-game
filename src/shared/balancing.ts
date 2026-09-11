import {
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  DAILY_XP_CAP,
  ENERGY_DECAY_PER_HOUR_AWAKE,
  ENERGY_RECOVERY_PER_HOUR_ASLEEP,
  HUNGER_DECAY_PER_HOUR,
  LEVEL_CURVE_EXPONENT,
  LEVEL_CURVE_MULTIPLIER,
  XP_PER_COMMIT_MAX,
  XP_PER_COMMIT_MIN,
  XP_PER_COMMIT_MULTIPLIER
} from './balancing.config'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** docs/balancing/xp-curve.md — xp = clamp(round(50 * sqrt(linesChanged)), 1, 1000) */
export function xpForCommit(linesChanged: number): number {
  const raw = XP_PER_COMMIT_MULTIPLIER * Math.sqrt(Math.max(0, linesChanged))
  return clamp(Math.round(raw), XP_PER_COMMIT_MIN, XP_PER_COMMIT_MAX)
}

/** docs/balancing/xp-curve.md — xpParaProximoNivel(nivel) = round(500 * nivel^1.5) */
export function xpForNextLevel(level: number): number {
  return Math.round(LEVEL_CURVE_MULTIPLIER * Math.pow(level, LEVEL_CURVE_EXPONENT))
}

/**
 * Aplica XP a um estado (xp, level) e resolve quantos níveis foram ganhos,
 * seguindo a curva cumulativa de xpForNextLevel.
 */
export function applyXp(
  current: { xp: number; level: number },
  xpGained: number
): { xp: number; level: number } {
  let xp = current.xp + xpGained
  let level = current.level

  while (xp >= xpForNextLevel(level)) {
    xp -= xpForNextLevel(level)
    level += 1
  }

  return { xp, level }
}

/** docs/balancing/daily-xp-cap.md — quanto XP ainda pode ser ganho no dia, dado o já ganho */
export function remainingDailyXp(xpEarnedToday: number): number {
  return Math.max(0, DAILY_XP_CAP - xpEarnedToday)
}

/** XP efetivo de um commit, já descontando o teto diário restante */
export function cappedXpForCommit(linesChanged: number, xpEarnedToday: number): number {
  return Math.min(xpForCommit(linesChanged), remainingDailyXp(xpEarnedToday))
}

/** docs/balancing/decay-rates.md — decaimento por tempo (lazy evaluation) */
export function decayAttribute(value: number, hoursElapsed: number, ratePerHour: number): number {
  return clamp(value - hoursElapsed * ratePerHour, ATTRIBUTE_MIN, ATTRIBUTE_MAX)
}

export function decayHunger(value: number, hoursElapsed: number): number {
  return decayAttribute(value, hoursElapsed, HUNGER_DECAY_PER_HOUR)
}

export function decayOrRecoverEnergy(
  value: number,
  hoursElapsed: number,
  isSleeping: boolean
): number {
  const rate = isSleeping ? -ENERGY_RECOVERY_PER_HOUR_ASLEEP : ENERGY_DECAY_PER_HOUR_AWAKE
  return decayAttribute(value, hoursElapsed, rate)
}
