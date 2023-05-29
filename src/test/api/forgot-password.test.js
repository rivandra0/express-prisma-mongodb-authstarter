import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'

import { verifiedUserData } from '../../seeds/accounts.js'
import { generateHourToken } from '../../services/auth.js'

import { forgotPasswordTestUser } from '../../seeds/accounts.js'


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

describe('Getting the change password html page /modify', () =>{
	test('if token good return 200', async () => {
		// registered user
		verifiedUserData.use = 'change-password'
		const toBeChangedAccount = verifiedUserData
		const token = generateHourToken(toBeChangedAccount)
		const res = await request(app).get(`/auth/forgot-password/modify/${token}`)
		expect(res.status).toBe(200)
		console.log(res.body)

		// we can test for other errors, but i think it's unnecessary for now
	}, 50000)
})

describe('Actually Changing Password /action', () =>{
	test('if good return 200', async () => {
		// registered user
		forgotPasswordTestUser.use = 'change-password'
		const toBeChangedAccount = forgotPasswordTestUser
		const token = generateHourToken(toBeChangedAccount)
		const newPassword = 'randomthing123'
		const payload = { token, newPassword }
		const res = await request(app).post(`/auth/forgot-password/action`).send(payload)
		expect(res.status).toBe(200)
		console.log(res.body)
	}, 50000)

	// this is the loophole, a user can keep changing their password until the token expire (1hr)
	test('if already changed today return 403', async () => {
		// registered user
		forgotPasswordTestUser.use = 'change-password'
		const toBeChangedAccount = forgotPasswordTestUser
		const token = generateHourToken(toBeChangedAccount)
		const newPassword = 'randomthing123'
		const payload = { token, newPassword }
		const res = await request(app).post(`/auth/forgot-password/action`).send(payload)
		expect(res.status).toBe(403)
		console.log(res.body)
	}, 50000)
})
