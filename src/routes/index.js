import express from 'express'
const router = express.Router()

import authRoute from './auth'

router.use('/auth', authRoute)

module.exports = router;