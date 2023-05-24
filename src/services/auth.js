import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'


import { pFindUserByEmail } from './prisma-queries.js'


function generateHourToken(data) {
	return jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
}

async function registerUser (email, password) {
	const hashedPassword = await bcrypt.hash(password, 10)
	try {
		// checking if the user exist
		const isExist = await pFindUserByEmail(email)
		
		if (isExist) {
			throw { status: 403, message:'Email Already Used'}
		}

		// creating the user
		const user = await prisma.user.create({
			data: { email, password: hashedPassword }
		})

		// send email to the user
		const targetEmail = user.email
	  	const token = generateHourToken(user)
	  	const html = `
		    <h1>VERIFY YOUR ACCOUNT</h1>
		    <p>This verification only valid for 1hr. Click the button below to verify your account</p>
		    <a href="${process.env.SITE_HOST}/auth/verify/${token}" style="text-decoration: none; background-color: #eaeaea; color: #333; padding: 20px 20px; border-radius: 4px;">Verify Account</a>
		  `
		await sendEmail(targetEmail, html, 'Account Verification').catch(async(err)=> {
			await prisma.user.delete({
				where: {
					email: targetEmail
				}
			})
			console.log('newly created user is deleted')
			throw { status:500, message:err.message }
		})

		// deleting the password from the response
		delete user.password
		return user

	} catch(err) {
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function loginUser (email, password) {		
	console.log('start searching')

	try {
		// finding one matching user'
		const userRow = await prisma.user.findFirst({
		  where: {
		    email: email
		  }
		})

		if(userRow === null) {
			console.log(userRow)
			throw { status: 404, message: 'User not found' }
		}
		console.log('searching result', userRow)
		// creating accesstoken
		const accessToken = generateHourToken(userRow)

		// comparing the password on database and sent by the user
		const result = await bcrypt.compare(password, userRow.password)
		if (!result) {
			throw { status: 400, message: 'Wrong login credentials' }
		}
		
		// checking if the user is verified
		if(!userRow.isVerified) {
			return { status: 401, message: 'Account not verified, please check your email', temporaryToken:accessToken }
		}

		// sending response success
		console.log('THIS GUY ACTUALLY LOGGED IN') 
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
		      throw { status: 401, messsage: 'Token Expired' }
		    }
		    if(user.use !== 'account-verification') {
		    	throw { status: 401, messsage: 'wrong token' }
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

async function forgotPassword (email) {
	try {
		// check if the email exist or not
		const isExist = await prisma.user.findUnique({
		  where: {
		    email: email
		  }
		})
		if (!isExist) {
			throw { status: 404, message:'User not exist'}
		}
		// generate accessToken
		const accessToken = generateHourToken(isExist)
		// send the token as a link to the user


	} catch (err) {
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function sendEmail (targetEmail, html, subject) {
	// throw { status:500, message:'this error is manipulated' }
	console.log(targetEmail, html, subject)
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
			subject: subject,
			html: html
		})

		console.log('message sent: '+ info )
		console.log('email sent')
	} catch (err) {
		console.log('email not sent:', err)
		throw { status:err.status || 500, message:'unable to send email', errors:err }
	}
}

export { registerUser, loginUser, verifyUser, sendEmail, generateHourToken }
