/**
 * Opens the Windows Explorer by calling `explorer.exe` itself. Electron's
 * `shell.openPath` and `shell.showItemInFolder` go through the verbs
 * registered on folders, which other apps take over: an `AnyCode` verb makes
 * them open Visual Studio, a `none` verb gives "application not found".
 */

import { spawn } from 'child_process'
import { shell } from 'electron'

type OnError = (message: string) => void

/** The Explorer exits with 1 even when it worked: only a failure to start counts. */
function runExplorer(args: string[], onError: OnError): void {
  const explorer = spawn('explorer.exe', args, {
    detached: true,
    stdio: 'ignore',
    // `/select,"path"` must reach the Explorer as typed; Node would quote it whole.
    windowsVerbatimArguments: true
  })
  explorer.on('error', (error) => onError(error.message))
  explorer.unref()
}

/** Paths cannot contain `"` on Windows, so quoting them is enough. */
const quoted = (path: string): string => `"${path}"`

export function openFolder(folder: string, onError: OnError): void {
  if (process.platform !== 'win32') {
    void shell.openPath(folder).then((error) => error && onError(error))
    return
  }
  runExplorer([quoted(folder)], onError)
}

/** Opens the folder of a file with that file selected. */
export function showInFolder(file: string, onError: OnError): void {
  if (process.platform !== 'win32') {
    shell.showItemInFolder(file)
    return
  }
  runExplorer([`/select,${quoted(file)}`], onError)
}
