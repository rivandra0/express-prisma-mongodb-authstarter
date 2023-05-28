import express from 'express'
const app = express()

// import authRoute from './src/routes/auth.js'
import router from './src/routes'

import bodyParser from 'body-parser'

app.use(bodyParser.json())
app.use(express.json())

// app.use("/auth", authRoute)
app.use('/', router);

export default app