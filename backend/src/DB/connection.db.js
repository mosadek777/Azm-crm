// spec 010 — scaffold only; implements no requirement yet (step 1)
// Database connection. Two clients against one database, deliberately:
//   - the raw MongoClient driver, exported as `db`
//   - mongoose, because src/DB/models/ holds mongoose schemas

import { MongoClient } from 'mongodb'
import mongoose from 'mongoose'

const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })

export const connectMongoose = async () => {
  await mongoose.connect(process.env.MONGO_URI, { dbName: "azmCrm" })
  console.log("MONGOOSE CONNECTED")
}

export const checkDBconnection = async () => {
  try {
    const result = await client.connect()
    console.log({ result })
    console.log("DB CONNECTED")
    await connectMongoose()
  } catch (err) {
    console.log('failed to connect')
    console.error(err)
    process.exit(1)
  }
}

export const db = client.db("azmCrm")
