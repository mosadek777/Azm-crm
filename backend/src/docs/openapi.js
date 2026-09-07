// The swagger-jsdoc configuration. Route documentation lives as JSDoc comments
// above each route in its own controller — per instruction, not in a separate
// file — and this scans those files.
//
// "Document only what exists." No path is listed here for a scoped-out module;
// swagger-jsdoc only picks up what a JSDoc @swagger block actually describes,
// so an undocumented route simply does not appear rather than appearing with a
// misleading shape.

import swaggerJSDoc from 'swagger-jsdoc'

export const openapiSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'azm-crm API',
      version: '0.1.0',
      description:
        'Customer Support CRM — backend API. Endpoints reflect what is built ' +
        'today only. See docs/state.md and docs/trace.md in the repository ' +
        'root for what is deliberately not yet built, and docs/decisions-' +
        'pending.md for the ratified decisions and deviations behind the ' +
        'shapes below (Team is scoped out; category is a flat string, not a ' +
        'tree).'
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        LocalizedText: {
          type: 'object',
          description: 'Bilingual refusal/label text (constitution I). Every error response uses this shape for `message`.',
          properties: { ar: { type: 'string' }, en: { type: 'string' } },
          required: ['ar', 'en']
        },
        Refusal: {
          type: 'object',
          properties: {
            message: { $ref: '#/components/schemas/LocalizedText' },
            fields: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  // Every controller file with @swagger blocks. Adding a controller means
  // adding it here, the same discipline the audit reconciliation check applies
  // to models — an unlisted file is undocumented, silently.
  apis: [
    'src/modules/auth/auth.controller.js',
    'src/modules/user/user.controller.js',
    'src/modules/platform/platform.controller.js',
    'src/modules/customer/customer.controller.js',
    'src/modules/ticket/ticket.controller.js'
  ]
})
