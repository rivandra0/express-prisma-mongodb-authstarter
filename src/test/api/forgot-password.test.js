import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'

import { verifiedUserData } from '../../seeds/accounts.js'

describe('Forgot Password', () =>{
	test('Email not found/Registered 404', async () => {
		// random not registered user
		const account = {
			email: 'bwabwabawa@gmail.com',
			password: 'muaracoder'
		}
		const res = await request(app).post('/auth/forgot-password').send(account)
		expect(res.status).toBe(404)
		console.log(res.body)
	}, 50000)

	test('Email Registered 200', async () => {
		// random not registered user
		const res = await request(app).post('/auth/forgot-password').send( { email:verifiedUserData.email } )
		expect(res.status).toBe(200)
		console.log(res.body)
	}, 50000)

	test('under 1 day from previous request', async () => {
		// random not registered user
		const res = await request(app).post('/auth/forgot-password').send( { email:verifiedUserData.email } )
		expect(res.status).toBe(400)
		console.log(res.body)
	}, 50000)
})