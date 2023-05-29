import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { generateHourToken } from '../../services/auth.js'
import { successVerifyTestUser } from '../../seeds/accounts.js'

successVerifyTestUser.use = 'account-verification'
const token = generateHourToken(successVerifyTestUser)

describe('Verify Account', () => {
	test('Email Registered and not verified return status 200', async () => {
		const res = await request(app).get(`/auth/verify/${token}`)
		expect(res.status).toBe(200)
		console.log(res.body)
	}, 50000)

	test('Email already verified return 403', async () => {
		const res = await request(app).get(`/auth/verify/${token}`)
		expect(res.status).toBe(403)
		console.log(res.body)
	}, 50000)

})
