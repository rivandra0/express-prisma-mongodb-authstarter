import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'

async function registerUser (email, password) {
	const hashedPassword = await bcrypt.hash(password, 10)
	try {
		// checking if the user exist
		const isExist = await prisma.user.findUnique({
		  where: {
		    email: email,
		  },
		})
		if (isExist) {
			throw { status: 403, message:'User already exist'}
		}

		// creating the user
		const user = await prisma.user.create({
			data: { email, password: hashedPassword }
		})

		// send email to the user
		const emailResult = await sendVerificationEmail(user)

		// deleting the password from the response
		delete user.password
		return user

	} catch(err) {
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function loginUser (email, password) {
	try {
		// finding one matching user
		const userRow = await prisma.user.findUnique({
		  where: {
		    email: email
		  },
		})
		
		// creating accesstoken
		const accessToken = jwt.sign(userRow, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })

		// checking if the user exist
		if (!userRow) {
			throw { status: 404, message: 'User not found' }
		}

		// checking if the user is verified
		if(!userRow.isVerified) {
			return { status: 401, message: 'Account not verified, please check your email', temporaryToken:accessToken }
		}

		// comparing the password on database and sent by the user
		const result = await bcrypt.compare(password, userRow.password)
		if (!result) {
			throw { status: 400, message: 'Wrong login credentials' }
		}

		// sending response success 
		return { status:200, message: 'Logged in', token: accessToken }

	} catch (err) {
		// console.log(err)
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function verifyUser (token) {
	let userData = null
	try {
		jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
		    if(err) {
		      throw { status: 403, messsage: 'Token Expired' }
		    }
		    userData = user
	  	})
		
		const updateUser = await prisma.user.update({
		  where: {
		    email: userData.email,
		  },
		  data: {
		    isVerified: true,
		  },
		})
		updateUser.isVerified = true
		return updateUser
	} catch (err) {
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function sendVerificationEmail (user) {
	const targetEmail = user.email
	const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
	const html = `
		<h1>VERIFY YOUR ACCOUNT</h1>
		<p>This verification only valid for 1hr. Click the button below to verify your account</p>
		<a href="${process.env.SITE_HOST}/auth/verify/${token}" style="text-decoration: none; background-color: #eaeaea; color: #333; padding: 20px 20px; border-radius: 4px;">Verify Account</a>
	`
	const transporter = nodemailer.createTransport({
		service: "gmail",
		auth: {
			user: process.env.MAIL_ACCOUNT,
			pass: process.env.MAIL_PASSWORD,
		}
	})

	try {
		const user = await prisma.user.findUnique({
		  where: {
		    email: targetEmail,
		  }
		})

		const info = await transporter.sendMail({
			from: process.env.MAIL_ACCOUNT,
			to: targetEmail,
			subject: 'Account Verification',
			html: html
		})

		const updateLastEmailSent = await prisma.user.update({
		  where: {
		    email: targetEmail,
		  },
		  data: {
		  	lastSentEmail: new Date()
		  }
		})

		console.log('message sent: '+ info )
		console.log('email sent')
	} catch (err) {
		console.log('email not sent:', err)
		throw { status:err.status || 500, message:'email not sent', errors:err }
	}
}

export { registerUser, loginUser, verifyUser, sendVerificationEmail }
