import { describe, expect, it } from 'vitest'
import { RestartBudget } from './restartBudget'

describe('RestartBudget', () => {
  it('allows up to the maximum inside the window', () => {
    const budget = new RestartBudget(3, 60_000)
    expect([0, 1000, 2000, 3000].map((now) => budget.tryConsume(now))).toEqual([
      true,
      true,
      true,
      false
    ])
  })

  it('allows again once the oldest restart leaves the window', () => {
    const budget = new RestartBudget(3, 60_000)
    for (const now of [0, 1000, 2000]) budget.tryConsume(now)
    expect(budget.tryConsume(59_999)).toBe(false)
    expect(budget.tryConsume(60_000)).toBe(true)
    expect(budget.tryConsume(60_500)).toBe(false)
  })
})
