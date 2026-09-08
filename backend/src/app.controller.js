// spec 010 — implements FR-008 (error path); scaffold otherwise

import express from 'express'
import cors from 'cors'
import swaggerUi from 'swagger-ui-express'
import { openapiSpec } from './utils/swagger.js'
import authcontroller from "./modules/auth/auth.controller.js"
import usercontroller from "./modules/user/user.controller.js"
import platformcontroller from "./modules/platform/platform.controller.js"
import customercontroller from "./modules/customer/customer.controller.js"
import ticketcontroller from "./modules/ticket/ticket.controller.js"
import portalcontroller from "./modules/portal/portal.controller.js"
import { checkDBconnection } from "./DB/connection.db.js"

const bootstrap = async () => {
  const app = express()
  const port = process.env.PORT

  // DB connection
  await checkDBconnection()

  // the Angular dev server is a different origin (4200 -> 3000)
  app.use(cors())

  // convert buffer data
  app.use(express.json())

  app.get('/', (req, res) => res.json({ message: "welcome" }))

  // "Document only what exists" — openapiSpec is generated from the @swagger
  // JSDoc blocks above each route, so a route with no block is simply absent
  // here rather than appearing with a guessed shape.
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))
  app.get('/api-docs.json', (req, res) => res.json(openapiSpec))

  app.use('/auth', authcontroller)
  app.use('/user', usercontroller)
  app.use('/platform', platformcontroller)
  app.use('/customer', customercontroller)
  app.use('/ticket', ticketcontroller)
  // spec 008. Separate from the staff routes because a customer is not a User:
  // no role, no branch, no department. Its own middleware and its own predicate.
  app.use('/portal', portalcontroller)

  app.all('{/*dummy}', (req, res) => res.status(404).json({ message: "invalid routing" }))

  // Last. An unwritable audit entry reaches here (E-11): the action was already
  // abandoned, so the only job left is to refuse loudly rather than answer as
  // though it succeeded.
  app.use((err, req, res, next) => {
    console.error(err)
    return res.status(500).json({
      message: {
        ar: 'تعذر إتمام الطلب',
        en: 'The request could not be completed'
      }
    })
  })

  app.listen(port, () => console.log(`app is running on port ${port}`))
}

export default bootstrap
