import * as dotenv from 'dotenv'
dotenv.config()

import express from 'express'
const app = express()
const port = 3000

import authRoute from './src/routes/auth.js'
import bodyParser from 'body-parser'

app.use(bodyParser.json())
app.use(express.json())

app.use("/auth", authRoute)

app.get('/', (req, res) => {
  res.send('key' + process.env.SECRET_KEY)
})

app.post('/', async (req, res) => {
  res.json({ message:'successfully created a user', data: userData})
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port} 🐢`)
})
