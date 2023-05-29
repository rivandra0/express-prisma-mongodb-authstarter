import express from 'express'
const app = express()

import router from './src/routes/index.js'

import bodyParser from 'body-parser'

app.use(bodyParser.json())
app.use(express.json())

app.use('/', router);

export default app