import app from '../../../app.js'
import request from 'supertest'
import { describe, expect, test } from 'vitest'

const verifiedUserData = { email: 'rivandra0@gmail.com', password:'muaracoder' }
import { pFindUserByEmail } from '../../services/prisma-queries.js'
import { generateHourToken } from '../../services/auth.js'

describe('Send Verification Email', () =>{
	test.concurrent('Succesfull send verification return 201', async () => {
		const account = {
			email: 'verifysuccess@mail.com',
			password: 'muaracoder'
		}
		const successUser = await pFindUserByEmail(account.email)
		const token = generateHourToken(successUser)
		const res = await request(app).post('/auth/verify/send-email').send(account).set('Authorization', 'Bearer ' + token) 
		expect(res.status).toBe(200)
		console.log(res.body)
	}, 50000)

	test.concurrent('fail send verification (under 1hr from last request) return 201', async () => {
		const account = {
			email: 'verifyfail@mail.com',
			password: 'muaracoder'
		}
		const failUser = await pFindUserByEmail(account.email)
		const token = generateHourToken(failUser)
		const res = await request(app).post('/auth/verify/send-email').send(account).set('Authorization', 'Bearer ' + token) 
		expect(res.status).toBe(403)
		console.log(res.body)
	}, 50000)

	test.concurrent('user already verified return 403', async () => {
		const account = verifiedUserData
		const token = generateHourToken(account)
		const res = await request(app).post('/auth/verify/send-email').send(account).set('Authorization', 'Bearer ' + token)
		expect(res.status).toBe(403)
		console.log(res.body)
	}, 50000)

})