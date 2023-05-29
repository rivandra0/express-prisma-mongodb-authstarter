import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'

import { pFindUserByEmail } from './prisma-queries.js'
import { getDifferenceInSecond } from '../services/times.js'

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
			// console.log('newly created user is deleted')
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
	// console.log('start searching')

	try {
		// finding one matching user'
		const userRow = await prisma.user.findFirst({
		  where: {
		    email: email
		  }
		})

		if(userRow === null) {
			// console.log(userRow)
			throw { status: 404, message: 'User not found' }
		}
		// console.log('searching result', userRow)
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
		// console.log('THIS GUY ACTUALLY LOGGED IN')
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

		const userRead = await prisma.user.findFirst({
			where: {
		    		email: userData.email,
		  	},
		})

		if(userRead.isVerified === true) {
			throw { status: 403, messsage: 'Account already verified' }
		}

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
		// its 24hr in form of seconds 86400 CHANGE LATER
		const LIMIT_TIME = 10
		const user = await pFindUserByEmail(email)
	    if (user === null) {
	      throw { status:404, message:'User not exist' } 
	    }

	    const lastRequest = new Date(user.lastChangePasswordRequest)
	    const currentTime = new Date()
	    const differenceInSeconds = getDifferenceInSecond(lastRequest, currentTime)
	    
	    if(differenceInSeconds < LIMIT_TIME) {
	      throw { status:400, message:'Send again only 1 day after setting the password' }
	    }

	    const targetEmail = user.email
	    const newUser = { email:user.email, password:user.password, use:'change-password' }
	    const token = generateHourToken(newUser)
	    const html = `
	      <h1>Change Your Password</h1>
	      <p>This password change only valid for 1 hour. Click the button below to change your password</p>
	      <a href="${process.env.SITE_HOST}/auth/forgot-password/modify/${token}" style="text-decoration: none; background-color: #eaeaea; color: #333; padding: 20px 20px; border-radius: 4px;"> Change Password </a>
	    `
	    const emailSend = await sendEmail (targetEmail, html, 'Change Password')

	    const updateLastEmailSent = await prisma.user.update({
	      where: {
	        email: targetEmail,
	      },
	      data: {
	        lastChangePasswordRequest: new Date()
	      }
	    })


	} catch (err) {
		throw { status: err.status || 500, errors: err, message: err.message }
	}
}

async function sendEmail (targetEmail, html, subject) {
	// throw { status:500, message:'this error is manipulated' }
	// console.log(targetEmail, html, subject)
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

		// console.log('message sent: '+ info )
		// console.log('email sent')
	} catch (err) {
		// console.log('email not sent:', err)
		throw { status:err.status || 500, message:'unable to send email', errors:err }
	}
}

async function verifyAndSendEmail (temporaryToken) {
	const LIMIT_TIME = 3600 //or 1 hr
	try {
		let userDat = null
	    	if (temporaryToken === null) {
	      	throw { status: 401, messsage: "You don't have any token" }
	    	}
	    jwt.verify(temporaryToken, process.env.ACCESS_TOKEN_SECRET, (err, userData) => {
	      if (err) {
	        throw { status: 401, messsage: 'token not recognized or expired' }
	      }
	      userDat = userData
	    })
	    const lastSentEmail = new Date(userDat.lastSentEmail)
	    const currentTime = new Date()
	    const differenceInSeconds = getDifferenceInSecond(lastSentEmail, currentTime)

	    const targetEmail = userDat.email
	    const newUser = { email:userDat.email, password:userDat.password, use:'account-verification' }
	    const token = generateHourToken(newUser)
	    const html = `
	      <h1>VERIFY YOUR ACCOUNT</h1>
	      <p>This verification only valid for 1hr. Click the button below to verify your account</p>
	      <a href="${process.env.SITE_HOST}/auth/verify/${token}" style="text-decoration: none; background-color: #eaeaea; color: #333; padding: 20px 20px; border-radius: 4px;">Verify Account</a>
	    `
	    if (differenceInSeconds < LIMIT_TIME) {
	      throw { status:403, message:'Send again only 1hr after the first email' }
	    }

	    const user = await pFindUserByEmail(targetEmail)

	    if(user.isVerified) {
	      throw { status:403, message:'user already verified' }
	    }

	    const emailInfo = await sendEmail(targetEmail, html, 'Account Verification')

	    const updateLastEmailSent = await prisma.user.update({
	      where: {
	        email: targetEmail,
	      },
	      data: {
	        lastSentEmail: new Date()
	      }
	    })
	} catch (err) {
		throw { status:err.status || 500, message:err.message, errors:err }
	}
}

function getChangePasswordHtml (token) {
	try {
		if (token === null) {
	      throw { status: 401, messsage: "You don't have any token" }
	    }

	    let userData = null
	    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
	      if (err) {
	        throw { status: 401, messsage: 'token not recognized or expired' }
	      }
	      if(user.use !== 'change-password'){
	        throw { status: 401, messsage: 'wrong token' }
	      }
	      userData = user
	    })

	    const html = `<!DOCTYPE html>
	      <html>
	      <head>
	        <title>Change Password</title>
	      </head>
	      <body>
	        <div style="text-align: center;">
	          <h1>Change Password</h1>
	          <form id="change-password-form">
	            <div>
	              <label for="new-password">New Password</label>
	              <input type="password" id="new-password" name="newPassword" required>
	            </div>
	            <div>
	              <label for="confirm-password">Confirm Password</label>
	              <input type="password" id="confirm-password" name="confirmPassword" required>
	            </div>
	            <div>
	              <button type="submit">Change Password</button>
	            </div>
	          </form>
	        </div>

	        <script>
	          document.getElementById('change-password-form').addEventListener('submit', function(event) {
	            event.preventDefault();
	            
	            const newPassword = document.getElementById('new-password').value;
	            const confirmPassword = document.getElementById('confirm-password').value;
	            
	            if (newPassword !== confirmPassword) {
	              alert('Passwords do not match');
	              return;
	            }
	            
	            const token = '${token}'; // Replace with the actual reset token
	            
	            // Make the POST request to the server
	            fetch('${process.env.SITE_HOST}/auth/forgot-password/action', {
	              method: 'POST',
	              headers: {
	                'Content-Type': 'application/json',
	                'authorization': 'bearer ${token}'
	              },
	              body: JSON.stringify({ token, newPassword })
	            })
	            .then(response => {
	              if (response.ok) {
	                alert('Password changed successfully');
	                // Redirect the user to the login page or any other desired page
	                console.log('successfull')
	                window.location.href = '${process.env.LOGIN_PAGE_URL}';
	              } else {
	                alert('Failed to change password');
	              }
	            })
	            .catch(error => {
	              console.error('Error:', error);
	              alert('An error occurred');
	            });
	          });
	        </script>
	      </body>
	      </html>
	      `
	} catch(err) {
		throw { status:err.status || 500, message:err.message, errors:err }
	}
}

async function forgotPasswordAction (temporaryToken, newPassword) {
     let userData = null
     const LIMIT_TIME = 3600
    	try {
		if(newPassword.length < 8) {
	      	throw { status:400, message:'must be 8-100 character ' }
	    	}
	    	jwt.verify(temporaryToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
	      	if (err) {
	        		throw { status: 401, messsage: 'token not recognized or expired' }
	      	}

		     if(user.use !== 'change-password') {
		        	throw { status: 401, messsage: 'wrong token' }
		     }
		     userData = user
		})

	    	const userFound = await pFindUserByEmail(userData.email)
	    	if (userFound === null) {
	    		throw { status: 404, message: 'user not exist'}
	    	}

	    	const lastRequest = new Date(userFound.lastChangePassword)
	    	const currentTime = new Date()
	    	const differenceInSeconds = getDifferenceInSecond(lastRequest, currentTime)
	    
	    	if(differenceInSeconds < LIMIT_TIME) {
	      	throw { status:403, message:'Password already changed today' }
	    	}
	    	
	    	const newHashedPassword = await bcrypt.hash(newPassword, 10)

	    	const updateLastEmailSent = await prisma.user.update({
	    	where: {
	        	email: userData.email,
	     },
	      data: {
	        password: newHashedPassword,
	        lastChangePassword: new Date()
	      }
	    })
    } catch (err) {
    		throw { status: err.status || 500, errors: err, message: err.message }
    }
}


export { 
	registerUser, 
	loginUser, 
	verifyUser, 
	sendEmail, 
	generateHourToken, 
	forgotPassword, 
	forgotPasswordAction, 
	verifyAndSendEmail, 
	getChangePasswordHtml 
}
