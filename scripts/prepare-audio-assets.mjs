import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { chmodSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { path7za } = require('7zip-bin')
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = join(projectRoot, 'public', 'audio', 'guitar')
const archiveUrl = 'https://freepats.zenvoid.org/Guitar/SpanishClassicalGuitar/SpanishClassicalGuitar-SFZ+FLAC-20190618.7z'
const expectedSha256 = '903916921a21662d2237ade7f0e98e55de93cb7b86da219e4e10f4ad385b8f5e'
const archiveFolder = 'SpanishClassicalGuitar-SFZ+FLAC-20190618'
const sampleNames = ['E2.flac', 'A2.flac', 'D3.flac', 'G3.flac', 'B3.flac', 'E4.flac']

async function hasPreparedAssets() {
  try {
    await Promise.all(sampleNames.map(async (name) => {
      const details = await stat(join(outputDirectory, name))
      if (!details.isFile() || details.size === 0) throw new Error(`Invalid asset: ${name}`)
    }))
    return true
  } catch {
    return false
  }
}

if (await hasPreparedAssets()) {
  console.log('FreePats guitar samples are already prepared.')
  process.exit(0)
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'guitar-tuner-freepats-'))
try {
  console.log('Downloading CC0 FreePats nylon-string guitar samples…')
  const response = await fetch(archiveUrl)
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}`)
  const archiveBytes = Buffer.from(await response.arrayBuffer())
  const actualSha256 = createHash('sha256').update(archiveBytes).digest('hex')
  if (actualSha256 !== expectedSha256) {
    throw new Error(`FreePats archive checksum mismatch: ${actualSha256}`)
  }

  const archivePath = join(temporaryDirectory, 'SpanishClassicalGuitar.7z')
  const extractedDirectory = join(temporaryDirectory, 'extracted')
  await writeFile(archivePath, archiveBytes)

  const extractors = [path7za, '7zz', '7z', '7za']
  const failures = []
  let extracted = false
  for (const extractor of extractors) {
    if (extractor === path7za) {
      try {
        chmodSync(path7za, 0o755)
      } catch {
        // Missing file or a platform without POSIX modes; the spawn below reports it.
      }
    }
    const result = spawnSync(extractor, ['x', archivePath, `-o${extractedDirectory}`, '-y'], { stdio: 'inherit' })
    if (result.status === 0) {
      extracted = true
      break
    }
    const reason = result.error ? result.error.message : `killed by ${result.signal ?? 'unknown signal'}`
    failures.push(`${extractor} (${reason})`)
    console.warn(`Extraction via ${extractor} failed: ${reason}; trying next extractor…`)
  }
  if (!extracted) throw new Error(`7-Zip extraction failed — tried: ${failures.join(', ')}`)

  const sourceDirectory = join(extractedDirectory, archiveFolder, 'samples')
  await mkdir(outputDirectory, { recursive: true })
  for (const name of sampleNames) {
    const source = join(sourceDirectory, name)
    if ((await readFile(source)).length === 0) throw new Error(`Empty source sample: ${name}`)
    await copyFile(source, join(outputDirectory, name))
  }
  console.log(`Prepared ${sampleNames.length} FreePats guitar samples.`)
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true })
}
