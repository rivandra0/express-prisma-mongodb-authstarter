import bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()


const hashedPassword = async () => await bcrypt.hash('muaracoder', 10)
const verifiedUserData = { email: 'rivandra0@gmail.com', password:await hashedPassword(), isVerified:true } 
const unverifiedUserData = { email: 'tuyulmohak0@gmail.com', password:await hashedPassword() }
const successVerifyTestUser = { email: 'verifysuccess@mail.com', password:await hashedPassword(), lastSentEmail: new Date("2000-01-17T16:45:30")  } //this is absolutely more than 1hrs
const failVerifyTestUser = { email: 'verifyfail@mail.com', password:await hashedPassword() }

async function main () {
	try {
		const newUser = await prisma.user.createMany({
			data:[ verifiedUserData, unverifiedUserData, successVerifyTestUser, failVerifyTestUser ]
		})
		console.log('created two account: verified and unverified')
	} catch (err) {
		console.log('seeding failed: ', err)
	}
}

await main()