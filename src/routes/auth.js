import express from 'express'
const router = express.Router()

import authenticateUser from '../middlewares/authenticateUser.js'
import { check, validationResult } from 'express-validator'
import { registerUser, loginUser, verifyUser, sendVerificationEmail } from '../services/auth.js'


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
    res.status(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.post('/login', validateUser, async (req, res) => {
  const { email, password } = req.body
  const validationRes = validationResult(req)
  try {
    checkErrorFromValidate(validationRes)
    const result = await loginUser(email, password)
    res.status(result.status).json(result) 
  } catch (err) {
    res.status(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.get('/verify/:token', async (req, res) => {
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
    res.status(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.post('/verify/send-email', authenticateUser, async (req, res) => {
  const user = req.user
  const lastSentEmail = new Date(user.lastSentEmail)
  const currentTime = new Date()
  const differenceInMs = currentTime - lastSentEmail
  const differenceInSeconds = Math.floor((currentTime - lastSentEmail)/1000)

  console.log('last: ', lastSentEmail)
  console.log('current: ', currentTime)
  console.log('difference: ', differenceInSeconds)
  try {
    if (differenceInSeconds < 3600) {
      throw { status:400, message:'Send again only 1hr after the first email' }
    }
    const emailInfo = await sendVerificationEmail(user)
    res.status(200).json({ status: 200, message: 'successfully sent verification Email, check your email' })
  } catch (err) {
    res.status(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})


// STILL TESTING
router.post('/forgot-password',check('email').isEmail(), (req, res) => {
  const email = req.body.email
  
  // check if the email exist on the user table
  // if exist, send reset email link to the user
  const validationRes = validationResult(req)

  try {
    checkErrorFromValidate(validationRes)
  } catch (err) {
    res.status(err.status).json({ status: err.status, message: err.message, completeError: err })
  }
})


router.post('/forgot-password/change', (req, res) => {
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
          
          const token = 'YOUR_RESET_TOKEN'; // Replace with the actual reset token
          
          // Make the POST request to the server
          fetch('/reset-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token, newPassword })
          })
          .then(response => {
            if (response.ok) {
              alert('Password changed successfully');
              // Redirect the user to the login page or any other desired page
              window.location.href = '/login';
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
})

router.get('/secret', authenticateUser, (req, res) => {
  const secretData = ['alpha', 'bruno', 'changshi']
  const user = req.user
  console.log('this user is authenticated', user)
  res.status(200).json({data:secretData})
})

export default router;