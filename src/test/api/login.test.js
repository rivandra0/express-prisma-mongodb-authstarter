import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'

const verifiedUserData = { email: 'loginverified0@mail.com', password:'muaracoder' } 
const unVerifiedUserData = { email: 'loginunverified@mail.com', password:'muaracoder' }
const notRegisteredUserDataa = { email: 'notregistered0@mail.com', password: 'muaracoder' }
const badFormatUserData = { email: 'notregistered0@mailcom', password: 'muara' }
const CorrectEmailWrongPasswordData = { email: 'rivandra0@gmail.com', password:'muaramuara' }

describe('Login', () => {
	test.concurrent('Email Registered and Verified Must return status 200  ',async () => {
		const res = await request(app).post('/auth/login').send(verifiedUserData)
		expect(res.status).toBe(200)
		console.log(res.body)
	}, 50000)

	test.concurrent('Email Registered but Not Verified Must return status 401 + token for email verification ', async () => {
		const res = await request(app).post('/auth/login').send(unVerifiedUserData)
		expect(res.status).toBe(401)
		expect(typeof res.body.temporaryToken).toBe('string')
		console.log(res.body)
	}, 50000)

	test.concurrent('Not registered/not found user return 404', async () => {
		const res = await request(app).post('/auth/login').send(notRegisteredUserDataa)
		expect(res.status).toBe(404)
		console.log(res.body)
	}, 50000)

	test.concurrent('Wrong format of email and password return 400', async () => {
		const res = await request(app).post('/auth/login').send(badFormatUserData)
		expect(res.status).toBe(400)
		console.log(res.body)
	}, 30000)

	test.concurrent('Correct email But wrong password return 401', async () => {
		const res = await request(app).post('/auth/login').send(CorrectEmailWrongPasswordData)
		expect(res.status).toBe(400)
		console.log(res.body)
	}, 30000)

})
