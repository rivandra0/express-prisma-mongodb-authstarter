import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'

// SEND VERIFICATION EMAIL
// 	if it still under 1hr after the first email => 400 cannot do that, wait 1hr ✔ (MANUAL)

describe('Forgot Password', () =>{
	test.concurrent('Email already used return 400', async () => {
		const account = {
			email: 'franck@gmail.com',
			password: 'muaracoder'
		}
		const res = await request(app).post('/auth/forgot-password').send(account)
		expect(res.status).toBe(404)
		console.log(res.body)
	}, 30000)
})