/**
 * Runs `RebeccaWrites.exe` with some arguments and does not wait for it. If it
 * is already open, its single-instance lock hands the arguments to the open
 * window (`second-instance`) and the new process quits; if not, this starts it.
 */

import { spawn } from 'child_process'

/** Resolves once the process started; rejects when it could not be started. */
export function launchRebeccaWrites(exe: string, args: string[]): Promise<void> {
  // Run from `npm run dev`, Listen may carry ELECTRON_RUN_AS_NODE, which would
  // turn RebeccaWrites into a plain Node process.
  const env = { ...process.env }
  delete env['ELECTRON_RUN_AS_NODE']

  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { detached: true, stdio: 'ignore', env })
    child.once('error', reject)
    child.once('spawn', () => {
      child.unref()
      resolve()
    })
  })
}
