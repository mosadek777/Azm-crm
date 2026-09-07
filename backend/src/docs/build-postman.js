// npm run docs:postman — converts docs/openapi.json (written by
// `npm run docs:build`) into a Postman collection + environment.
//
// Post-processing after the conversion, deliberately:
//   1. every request's base URL is rewritten to {{baseUrl}}
//   2. every Authorization header becomes "Bearer {{token}}"
//   3. the login request gets a test script that reads the response and
//      SAVES the token into the environment automatically — no copy-paste
//      between a login response and the next request's header.
//
// Nothing here pushes to Postman's cloud. Both output files are plain JSON,
// imported by hand (File > Import in the Postman app).

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import converter from 'openapi-to-postmanv2'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsDir = join(__dirname, '../../../docs')
const openapiPath = join(docsDir, 'openapi.json')
const collectionPath = join(docsDir, 'azm-crm.postman_collection.json')
const environmentPath = join(docsDir, 'azm-crm.postman_environment.json')

const openapiJson = readFileSync(openapiPath, 'utf8')

const convert = () => new Promise((resolve, reject) => {
  converter.convert(
    { type: 'string', data: openapiJson },
    // 'Schema' resolves bodies from the declared types rather than inventing a
    // plausible-looking value for each field. Under 'Example' the converter
    // fabricates addresses like "vK4bHOLXuVQV@jRiZFPsjMBlPorWgGMAvDlKrHLq.us"
    // for an email field, which invites someone to read a fake as a seeded
    // account. (Note that `parametersResolution` is the real option id — the
    // `requestParametersResolution` this script passed at first is not an
    // option the converter recognises, so it was silently ignored.)
    { parametersResolution: 'Schema', folderStrategy: 'Tags' },
    (err, result) => {
      if (err) return reject(err)
      if (!result.result) return reject(new Error(result.reason))
      resolve(result.output[0].data)
    }
  )
})

// Walks every request in the collection tree — items nest inside folders,
// which the "Tags" folderStrategy above creates one per controller.
const walk = (items, fn) => {
  for (const item of items ?? []) {
    if (item.item) walk(item.item, fn)
    else fn(item)
  }
}

const run = async () => {
  const collection = await convert()

  collection.info.name = 'azm-crm API'
  collection.info.description =
    'Generated from docs/openapi.json by npm run docs:postman. ' +
    'Re-run docs:build then docs:postman after adding a @swagger block — ' +
    'this file is not hand-edited.'

  // The OpenAPI spec declares `security: [{ bearerAuth: [] }]` at the DOCUMENT
  // level (every route inherits it, login opts out with its own `security: []`).
  // The converter mirrors that by setting auth ONCE on the collection, not per
  // request — so every individual request's own `auth` stays `null` and
  // inherits this. Rewriting per-request auth (as a first pass at this script
  // did) touches nothing, because there is nothing to touch: the collection
  // auth block is the only one that exists.
  if (collection.auth?.type === 'bearer') {
    collection.auth = { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] }
  }

  // The converter also seeds a collection-level `variable` array with the
  // OpenAPI server URL baked in literally. It is shadowed by the environment's
  // `baseUrl` at request time, but leaving the literal there invites exactly
  // the confusion this rewrite exists to prevent — so it is pointed at the
  // variable too.
  for (const v of collection.variable ?? []) {
    if (v.key === 'baseUrl') v.value = '{{baseUrl}}'
  }

  let loginRequest = null

  walk(collection.item, (request) => {
    // 1. Base URL -> {{baseUrl}}. swagger-jsdoc's server entry
    // (http://localhost:3000) is baked into every generated request; replace
    // it so the collection follows the environment instead.
    if (request.request?.url) {
      const url = request.request.url
      if (typeof url === 'object') {
        url.host = ['{{baseUrl}}']
        url.raw = url.raw?.replace(/^https?:\/\/[^/]+/, '{{baseUrl}}')
      }
    }

    // (Bearer auth is rewritten once, at the collection level, above — see
    // why individual requests carry no auth of their own to rewrite here.)

    // 2. The login request gets a test script that saves the token.
    const url = request.request?.url
    const path = typeof url === 'object' ? (url.path ?? []).join('/') : String(url ?? '')
    const isLogin = request.request?.method === 'POST' && path.replace(/^\/+/, '') === 'auth/login'

    if (isLogin) {
      loginRequest = request
      request.event = [
        ...(request.event ?? []),
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'const body = pm.response.json();',
              'if (body && body.token) {',
              '    pm.environment.set("token", body.token);',
              '    console.log("azm-crm: token saved to the environment");',
              '} else {',
              '    console.warn("azm-crm: login response carried no token — nothing saved");',
              '}'
            ]
          }
        }
      ]
    }
  })

  if (!loginRequest) {
    console.warn('WARNING: no /auth/login request found in the converted collection — the auto-save test script was not attached.')
  }

  // The converter stamps a fresh UUID on the collection and on every folder,
  // request and event. Postman assigns its own ids at import time and ignores
  // these, so their only effect here is to make every regeneration differ from
  // the last. Strip them: what remains changes only when the API changes.
  // The converter also attaches a saved "example response" to every request,
  // with each field filled in by a faker: `{"outOfScopeMatches": 8993}` one run,
  // `{"outOfScopeMatches": 860}` the next. Two reasons to drop them rather than
  // ship them. They are invented data wearing the costume of a real response —
  // the same objection that keeps guessed routes out of the OpenAPI document in
  // the first place. And being re-faked on every run, they are what stops this
  // file from ever diffing clean. The authoritative response shapes are in
  // docs/openapi.json and rendered on the published documentation page.
  walk(collection.item, (request) => { delete request.response })

  const stripIds = (node) => {
    if (Array.isArray(node)) return node.forEach(stripIds)
    if (!node || typeof node !== 'object') return
    delete node.id
    delete node._postman_id
    for (const value of Object.values(node)) stripIds(value)
  }
  stripIds(collection)

  writeFileSync(collectionPath, JSON.stringify(collection, null, 2) + '\n')

  const environment = {
    id: 'azm-crm-local',
    name: 'azm-crm — local',
    values: [
      { key: 'baseUrl', value: 'http://localhost:3000', type: 'default', enabled: true },
      // Deliberately empty. Run the login request in this environment — its
      // test script fills this in; nothing here is a real credential.
      { key: 'token', value: '', type: 'secret', enabled: true }
    ],
    _postman_variable_scope: 'environment'
  }
  writeFileSync(environmentPath, JSON.stringify(environment, null, 2) + '\n')

  console.log(`wrote ${collectionPath}`)
  console.log(`wrote ${environmentPath}`)
  console.log(loginRequest ? 'login test script attached' : 'login test script NOT attached — see warning above')
}

run().catch(err => { console.error(err); process.exit(1) })
