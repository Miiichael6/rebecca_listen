import { describe, expect, it } from 'vitest'
import { APP_ID, APP_NAME, MAIN_WINDOW_SIZE } from '@shared/appInfo'

// Trivial test: checks that Vitest runs and that the `@shared` alias resolves.
// Removed in task 02, once there are real tests.
describe('sanity', () => {
  it('resolves the @shared alias', () => {
    expect(APP_NAME).toBe('Rebecca Listen')
    expect(APP_ID).toBe('com.michael.rebeccalisten')
    expect(MAIN_WINDOW_SIZE.minWidth).toBeLessThan(MAIN_WINDOW_SIZE.width)
  })
})
