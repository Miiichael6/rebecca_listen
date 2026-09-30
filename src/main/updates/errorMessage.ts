/** Turns an `electron-updater` failure into the short text the update button shows. */

const OFFLINE =
  /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ENETUNREACH|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED/

export function updateErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code
  const text = error instanceof Error ? error.message : String(error ?? '')
  if (code === 'ENOSPC' || /ENOSPC/.test(text))
    return 'Not enough disk space to download the update'
  if (OFFLINE.test(String(code)) || OFFLINE.test(text)) return 'No internet connection'
  return 'The update could not be completed'
}
