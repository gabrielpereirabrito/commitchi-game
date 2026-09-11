import { describe, expect, it } from 'vitest'
import {
  applyXp,
  cappedXpForCommit,
  decayHunger,
  decayOrRecoverEnergy,
  remainingDailyXp,
  xpForCommit,
  xpForNextLevel
} from './balancing'

describe('xpForCommit', () => {
  it('gives the minimum XP for a commit with no lines changed', () => {
    expect(xpForCommit(0)).toBe(1)
  })

  it('scales with the square root of lines changed', () => {
    expect(xpForCommit(1)).toBe(50)
    expect(xpForCommit(4)).toBe(100)
    expect(xpForCommit(100)).toBe(500)
  })

  it('caps at 1000 XP regardless of how large the diff is', () => {
    expect(xpForCommit(400)).toBe(1000)
    expect(xpForCommit(1_000_000)).toBe(1000)
  })
})

describe('xpForNextLevel', () => {
  it('follows the 500 * level^1.5 curve', () => {
    expect(xpForNextLevel(1)).toBe(500)
    expect(xpForNextLevel(4)).toBe(4000)
  })

  it('requires more XP for each subsequent level', () => {
    expect(xpForNextLevel(5)).toBeGreaterThan(xpForNextLevel(4))
  })
})

describe('applyXp', () => {
  it('accumulates XP without leveling up when below the threshold', () => {
    expect(applyXp({ xp: 0, level: 1 }, 100)).toEqual({ xp: 100, level: 1 })
  })

  it('levels up and carries over the remaining XP', () => {
    expect(applyXp({ xp: 400, level: 1 }, 200)).toEqual({ xp: 100, level: 2 })
  })

  it('handles multiple level-ups from a single large gain', () => {
    const result = applyXp({ xp: 0, level: 1 }, 2000)
    expect(result.level).toBe(3)
  })
})

describe('remainingDailyXp / cappedXpForCommit', () => {
  it('allows full XP when nothing was earned today', () => {
    expect(remainingDailyXp(0)).toBe(3000)
  })

  it('reduces the remaining budget as XP is earned', () => {
    expect(remainingDailyXp(2900)).toBe(100)
  })

  it('never goes negative once the cap is exceeded', () => {
    expect(remainingDailyXp(5000)).toBe(0)
  })

  it('caps a single commit XP to whatever budget is left for the day', () => {
    expect(cappedXpForCommit(400, 2900)).toBe(100)
    expect(cappedXpForCommit(400, 3000)).toBe(0)
  })
})

describe('decayHunger', () => {
  it('decays 4 points per hour', () => {
    expect(decayHunger(100, 1)).toBe(96)
  })

  it('never drops below zero', () => {
    expect(decayHunger(10, 100)).toBe(0)
  })
})

describe('decayOrRecoverEnergy', () => {
  it('decays while awake', () => {
    expect(decayOrRecoverEnergy(100, 1, false)).toBe(94)
  })

  it('recovers while asleep', () => {
    expect(decayOrRecoverEnergy(0, 1, true)).toBe(12)
  })

  it('never exceeds 100 while recovering', () => {
    expect(decayOrRecoverEnergy(95, 10, true)).toBe(100)
  })
})
