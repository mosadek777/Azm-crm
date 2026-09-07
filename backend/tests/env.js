// Credentials and configuration for the acceptance suites.
//
// These suites used to open with the break-glass password written into the
// source. That was survivable only because they lived outside the repository —
// the moment they moved in here it would have been a real credential in a
// public repo, which is the one mistake this project has already spent time
// avoiding elsewhere (see backend/.env.example and README's Setup note).
//
// So: the administrator's credentials come from .env, and the suite refuses to
// run without them rather than falling back to a default. A default here would
// become a known credential on every machine that runs the tests — the same
// reasoning as `npm run seed:demo` and DEMO_AGENT_PASSWORD.

import 'dotenv/config'
import { randomBytes } from 'node:crypto'

export const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:3000'

const require_ = (key, why) => {
  const value = process.env[key]
  if (!value) {
    console.error('')
    console.error(`${key} is not set in backend/.env — refusing to run the acceptance suite.`)
    console.error(why)
    console.error('')
    process.exit(1)
  }
  return value
}

export const BREAKGLASS_EMAIL = require_(
  'BREAKGLASS_EMAIL',
  'The suites sign in as the break-glass administrator to build their fixtures.\n' +
  'It is the same account `npm run seed:admin` creates.'
)

export const BREAKGLASS_PASSWORD = require_(
  'BREAKGLASS_PASSWORD',
  'The suites sign in as the break-glass administrator to build their fixtures.\n' +
  'This value is never written into a tracked file — see backend/.env.example.'
)

// The staff accounts each suite creates for itself. Generated per run rather
// than fixed, so no password literal exists in the repository at all — not even
// a throwaway one that a secret scanner would flag, or that someone might copy
// into a real deployment because it looked like the project's convention.
//
// The suffix guarantees an upper case letter, a digit and a symbol, so this
// keeps working if a password policy is added later (there is none today —
// user.service.js checks only that a password is present).
export const FIXTURE_PASSWORD = `${randomBytes(15).toString('base64url')}aA1!`
