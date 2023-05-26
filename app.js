import express from 'express'
const app = express()

import authRoute from './src/routes/auth.js'
import bodyParser from 'body-parser'

app.use(bodyParser.json())
app.use(express.json())
app.use("/auth", authRoute)

export default app