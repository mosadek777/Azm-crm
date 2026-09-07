// npm run docs:build — writes docs/openapi.json from the same spec the running
// server serves at /api-docs.json, so the file and the live server can never
// disagree about what "documented" means.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openapiSpec } from './openapi.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dirname, '../../../docs/openapi.json')

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, JSON.stringify(openapiSpec, null, 2) + '\n')

console.log(`wrote ${outPath}`)
console.log(`paths documented: ${Object.keys(openapiSpec.paths ?? {}).length}`)
