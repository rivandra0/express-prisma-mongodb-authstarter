import express from 'express'
const router = express.Router()
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
import bcrypt from 'bcrypt'

import authenticateUser from '../middlewares/authenticateUser.js'
import { pFindUserByEmail } from '../services/prisma-queries.js'

import { check, validationResult } from 'express-validator'
import { registerUser, loginUser, verifyUser, sendEmail, generateHourToken } from '../services/auth.js'
import { getDifferenceInSecond } from '../services/times.js'


const validateUser = [
  check('email').isEmail().withMessage('Wrong email format'),
  check('password').isLength( { min: 8, max: 100 } ).withMessage('password between 8 character and 100 character')
]

const checkErrorFromValidate = (validationRes) => {
  if(!validationRes.isEmpty()) {
    const errMessages = validationRes.errors.map((err, index)=> index+1+ '. '+ err.msg).join(', ')
    throw { status: 400, errors: validationRes.errors, message: errMessages }
  }
  return
}


router.post('/register', validateUser, async (req, res) => {
  const { email, password } = req.body
  const validationRes = validationResult(req)
  try {
    checkErrorFromValidate(validationRes)
    const newUser = await registerUser(email, password)
    res.status(201).json({ status: 201, message:'User Succesfully Created, Please verify your Account', data:newUser})
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.post('/login', validateUser, async (req, res) => {
  const { email, password } = req.body
  console.log(req.body)
  const validationRes = validationResult(req)
  try {
    checkErrorFromValidate(validationRes)
    const result = await loginUser(email, password)
    console.log(result)
    res.status(result.status).json(result) 
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})




router.post('/verify/send-email', async (req, res) => {
  const authHeader = req.headers['authorization']
  const temporaryToken = authHeader && authHeader.split(' ')[1]
  if (temporaryToken === null) {
    throw { status: 401, messsage: "You don't have any token" }
  }
  jwt.verify(temporaryToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      // console.log('error on verify: ',err)
      throw { status: 401, messsage: 'token not recognized or expired' }
    }
    req.user = user
  })

  const user = req.user
  const lastSentEmail = new Date(user.lastSentEmail)
  const currentTime = new Date()
  const differenceInSeconds = getDifferenceInSecond(lastSentEmail, currentTime)

  console.log('last: ', lastSentEmail)
  console.log('current: ', currentTime)
  console.log('difference: ', differenceInSeconds)
  
  const targetEmail = user.email
  const newUser = { email:user.email, password:user.password, use:'account-verification' }
  const token = generateHourToken(newUser)
  const html = `
    <h1>VERIFY YOUR ACCOUNT</h1>
    <p>This verification only valid for 1hr. Click the button below to verify your account</p>
    <a href="${process.env.SITE_HOST}/auth/verify/${token}" style="text-decoration: none; background-color: #eaeaea; color: #333; padding: 20px 20px; border-radius: 4px;">Verify Account</a>
  `

  try {
    if (differenceInSeconds < 3600) {
      throw { status:400, message:'Send again only 1hr after the first email' }
    }

    const user = await pFindUserByEmail(targetEmail)

    if(user.isVerified) {
      throw { status:400, message:'user already verified' }
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

    res.status(200).json({ status: 200, message: 'successfully sent verification Email, check your email' })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.get('/verify/:token', async (req, res) => { // we'll fix dis
  const token = String(req.params.token)
  try {
    await verifyUser(token)
    const redirectDelaySeconds = 2
    const message = 'Your account is verified'
    const p = 'You will be redirected in a few seconds...'
    const redirectURL = 'https://muaracoder.com/'

    const htmlResponse = `
      <html>
        <body>
          <h1>${message}</h1>
          <p>${p}</p>
          <script>
            setTimeout(function() {
              window.location.href = '${redirectURL}'
            }, ${ redirectDelaySeconds * 1000 })
          </script>
        </body>
      </html>
    `;

    res.status(200).send(htmlResponse)

  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})



router.post('/forgot-password', async (req, res) => {
  const email = req.body.email
  try {
    const user = await pFindUserByEmail(email)

    if (user === null) {
      throw { status:404, message:'User not exist' } 
    }

    const lastRequest = new Date(user.lastChangePasswordRequest)
    const currentTime = new Date()
    const differenceInSeconds = getDifferenceInSecond(lastRequest, currentTime)
    
    // its 24hr in form of seconds 86400 CHANGE LATER
    if(differenceInSeconds < 10) {
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

    console.log(updateLastEmailSent)

    console.log(emailSend)
    res.status(200).json({ status:200, message:'Change Password link sent, Check your email' })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})

router.get('/forgot-password/modify/:token', (req, res) => {  
  const token = String(req.params.token) //this must contain the 
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
    res.status(200).send(html)
  } catch (err) {
    res.status(err.status || 500).sendStatus(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})

router.post('/forgot-password/action', async(req, res) => {
  console.log(req.body)
  let userData = null
  const temporaryToken = req.body.token
  const newPassword = req.body.newPassword
  try {
    if(newPassword.length < 8) {
      throw { status:400, message:'must be 8-100 character ' }
    }
    jwt.verify(temporaryToken, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        // console.log('error on verify: ',err)
        throw { status: 401, messsage: 'token not recognized or expired' }
      }

      if(user.use !== 'change-password') {
        throw { status: 401, messsage: 'wrong token' }
      }
      userData = user
    })

    const newHashedPassword = await bcrypt.hash(newPassword, 10)
    console.log(userData)
    const updateLastEmailSent = await prisma.user.update({
      where: {
        email: userData.email,
      },
      data: {
        password: newHashedPassword,
        lastChangePassword: new Date()
      }
    })

    res.status(200).json({ status:200, message:'password changed' })
  } catch (err) {
    res.status(err.status || 500).sendStatus(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})



router.get('/secret', authenticateUser, (req, res) => {
  const secretData = ['alpha', 'bruno', 'changshi']
  const user = req.user
  console.log('this user is authenticated', user)
  res.status(200).json({data:secretData})
})

export default router;