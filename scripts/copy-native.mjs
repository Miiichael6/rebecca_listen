// Copies the release build of the capture sidecar into resources/bin/, where
// main spawns it from and electron-builder packs it (asarUnpack: resources/**).
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BINARY = 'rl-capture.exe'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'native', 'target', 'release', BINARY)
const destinationDir = join(root, 'resources', 'bin')

mkdirSync(destinationDir, { recursive: true })
copyFileSync(source, join(destinationDir, BINARY))
console.log(`copied ${BINARY} to ${destinationDir}`)
