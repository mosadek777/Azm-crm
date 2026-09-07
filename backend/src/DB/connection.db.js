// spec 010 — scaffold only; implements no requirement yet (step 1)
// Database connection. Two clients against one database, deliberately:
//   - the raw MongoClient driver, exported as `db`
//   - mongoose, because src/DB/models/ holds mongoose schemas

import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

// MONGO_URI carries no database in its path, so the name lives here — and is
// exported, because anything that connects on its own (the test runner drops
// the database between suites) has to target the SAME one. Reading the URI and
// letting the driver pick its default silently connects to `test` while the app
// uses this: a "clean" run against an untouched database, which is worse than a
// failing one. That mistake has already been made once here.
export const DB_NAME = 'azmCrm'

const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })

export const connectMongoose = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: DB_NAME })
  console.log("MONGOOSE CONNECTED")
}

export const checkDBconnection = async () => {
  try {
    await client.connect()
    console.log("DB CONNECTED")
    await connectMongoose()
  } catch (err) {
    console.log('failed to connect')
    console.error(err)
    process.exit(1)
  }
}

export const db = client.db(DB_NAME)
