import { describe, expect, it } from 'vitest'
import {
  defaultExePath,
  exeCandidates,
  exeFromUninstallString,
  findUninstallString,
  isRebeccaWritesExe,
  parseRegQuery
} from './exePath'

const INSTALL = 'C:\\Users\\Ana\\AppData\\Local\\Programs\\rebeccawrites'

/** What `reg query HKCU\...\Uninstall /s` prints, trimmed to two entries. */
const DUMP = [
  '',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Notion',
  '    DisplayName    REG_SZ    Notion 3.1.0',
  '    UninstallString    REG_SZ    "C:\\Users\\Ana\\AppData\\Local\\Programs\\Notion\\Uninstall Notion.exe"',
  '',
  'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\5f921f84-3b42',
  '    DisplayName    REG_SZ    RebeccaWrites',
  `    UninstallString    REG_SZ    "${INSTALL}\\Uninstall rebeccawrites.exe" /currentuser`,
  '    InstallLocation    REG_SZ    ',
  '    EstimatedSize    REG_DWORD    0x3a2c1',
  ''
].join('\r\n')

describe('parseRegQuery', () => {
  it('reads each key with its values, including empty ones', () => {
    const keys = parseRegQuery(DUMP)
    expect(keys.size).toBe(2)
    const rebecca = [...keys.values()][1]
    expect(rebecca['DisplayName']).toBe('RebeccaWrites')
    expect(rebecca['InstallLocation']).toBe('')
    expect(rebecca['EstimatedSize']).toBe('0x3a2c1')
  })

  it('finds the uninstaller of RebeccaWrites and nothing when it is not installed', () => {
    expect(findUninstallString(parseRegQuery(DUMP))).toBe(
      `"${INSTALL}\\Uninstall rebeccawrites.exe" /currentuser`
    )
    expect(findUninstallString(parseRegQuery(DUMP.replace('RebeccaWrites', 'Other')))).toBeNull()
    expect(findUninstallString(parseRegQuery(''))).toBeNull()
  })
})

describe('exeFromUninstallString', () => {
  it('takes the exe next to the uninstaller, named after it', () => {
    expect(exeFromUninstallString(`"${INSTALL}\\Uninstall rebeccawrites.exe" /currentuser`)).toBe(
      `${INSTALL}\\rebeccawrites.exe`
    )
  })

  it('falls back to RebeccaWrites.exe when the uninstaller has another name', () => {
    expect(exeFromUninstallString('D:\\Apps\\RW\\uninst.exe /S')).toBe(
      'D:\\Apps\\RW\\RebeccaWrites.exe'
    )
  })

  it('refuses anything that is not an absolute path', () => {
    expect(exeFromUninstallString('')).toBeNull()
    expect(exeFromUninstallString('"uninstall.exe"')).toBeNull()
  })
})

describe('exe candidates', () => {
  it('puts the default per-user folder under LOCALAPPDATA', () => {
    expect(defaultExePath('C:\\Users\\Ana\\AppData\\Local')).toBe(
      'C:\\Users\\Ana\\AppData\\Local\\Programs\\RebeccaWrites\\RebeccaWrites.exe'
    )
  })

  it('tries the chosen one first and each path once', () => {
    const installed = 'C:\\Users\\Ana\\AppData\\Local\\Programs\\rebeccawrites\\rebeccawrites.exe'
    expect(
      exeCandidates({
        chosen: 'D:\\RW\\RebeccaWrites.exe',
        installed,
        localAppData: 'C:\\Users\\Ana\\AppData\\Local'
      })
    ).toEqual(['D:\\RW\\RebeccaWrites.exe', installed])
    expect(exeCandidates({ chosen: null, installed: null, localAppData: null })).toEqual([])
  })

  it('accepts only a file called RebeccaWrites.exe, in any case', () => {
    expect(isRebeccaWritesExe('D:\\RW\\RebeccaWrites.exe')).toBe(true)
    expect(isRebeccaWritesExe(`${INSTALL}\\rebeccawrites.exe`)).toBe(true)
    expect(isRebeccaWritesExe(`${INSTALL}\\Uninstall rebeccawrites.exe`)).toBe(false)
    expect(isRebeccaWritesExe('D:\\RW\\notepad.exe')).toBe(false)
  })
})
