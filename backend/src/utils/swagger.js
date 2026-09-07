// swagger-jsdoc configuration. Served at /api-docs by app.controller.js and
// written to docs/openapi.json by `npm run docs:build`.
//
// Route documentation lives as JSDoc @swagger blocks ABOVE THE ROUTES in each
// controller, never in a separate document. A separate document drifts: the
// route changes, the spec file does not, and the difference is invisible until
// someone integrates against a lie. Keeping the block adjacent to the route
// means a reviewer editing one sees the other.
//
// "Document only what exists": swagger-jsdoc emits a path only where a
// @swagger block actually describes one, so an undocumented or unbuilt route is
// simply absent rather than present with a guessed shape.

import swaggerJSDoc from 'swagger-jsdoc'

const description = `
The backend for **AZM CRM**, a customer support system: bilingual
(Arabic and English as peer languages), multi-branch, scope-enforced on every
request, and fully audited.

### Authenticating

\`POST /auth/login\` with an email and password returns a JWT. Send it on every
other request as \`Authorization: Bearer <token>\`. Roles are re-read from the
database on each request, so revoking a role takes effect on the caller's next
call rather than when their token expires.

### A 404 does not always mean the record is absent

Every read and write applies a scope predicate over the caller's branch and
department. A record outside that scope is **indistinguishable from one that
does not exist** — the API answers \`404\`, never \`403\`, and the response body
is byte-identical in both cases.

This is deliberate: a \`403\` would confirm that a record exists in another
branch, which is itself a disclosure. When integrating, treat \`404\` as
"not available to you" rather than "not in the system", and do not build
retry or reconciliation logic that assumes a 404 means deletion.

### Other behaviour worth knowing before you integrate

- **Refusals are bilingual.** Every error body carries
  \`message: { ar, en }\`. Field *names* stay English; the human-readable text
  is translated. Render whichever language the reader is using — do not
  translate these client-side.
- **Duplicate customers are surfaced, not blocked.** \`POST /customer\` answers
  \`409\` with the matching records named, and the same request repeated with
  \`confirmCollision: true\` proceeds and records the override. Collisions
  outside your scope come back as a **count** with no identities.
- **Ticket status transitions are validated against a graph.** A move that is
  not a defined transition is refused with \`409\` and the reachable statuses
  named. \`GET /ticket/{id}\` returns \`reachableStatuses\` — drive your UI from
  that rather than from a hardcoded list.
- **Durations are never computed here.** Anything time-based returns
  \`{ status: "unavailable" }\` until the SLA engine (spec 005) is built.
  Do not substitute your own arithmetic; the value is unavailable, not zero.
`.trim()

export const openapiSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AZM CRM API',
      version: '0.1.0',
      description
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        LocalizedText: {
          type: 'object',
          description: 'Bilingual text (constitution I). Every refusal message uses this shape.',
          properties: { ar: { type: 'string' }, en: { type: 'string' } },
          required: ['ar', 'en']
        },
        Refusal: {
          type: 'object',
          properties: {
            message: { $ref: '#/components/schemas/LocalizedText' },
            fields: {
              type: 'array',
              items: { type: 'string' },
              description: 'Field names that failed validation, where applicable.'
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Controllers carrying @swagger blocks. Adding a controller means adding it
  // here — the same discipline audit:reconcile applies to models, and for the
  // same reason: an unlisted file is undocumented silently.
  apis: [
    'src/modules/auth/auth.controller.js',
    'src/modules/user/user.controller.js',
    'src/modules/platform/platform.controller.js',
    'src/modules/customer/customer.controller.js',
    'src/modules/ticket/ticket.controller.js'
  ]
})
