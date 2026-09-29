/**
 * Limits how often a crashed process is started again, so a binary that dies
 * on launch does not spin forever.
 */

export class RestartBudget {
  private recent: number[] = []

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  /** Records a restart at `now`, unless `max` already happened in the last `windowMs`. */
  tryConsume(now: number): boolean {
    this.recent = this.recent.filter((time) => now - time < this.windowMs)
    if (this.recent.length >= this.max) return false
    this.recent.push(now)
    return true
  }
}
