import express from 'express'
const router = express.Router()

import authRouter from './auth.js'

router.use('/auth', authRouter)

export default router