import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'
import { generateHourToken } from '../../services/auth.js'

const unVerifiedUserData = { email: 'tuyulmohak0@gmail.com', password:'muaracoder', use: 'account-verification' }

// email:'tuyulmohak0@gmail.com', isVerified:false, use:'account-verification'
const token = generateHourToken(unVerifiedUserData)

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
