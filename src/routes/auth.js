import express from 'express'
const router = express.Router()
import authenticateUser from '../middlewares/authenticateUser.js'
import { check, validationResult } from 'express-validator'
import { getDifferenceInSecond } from '../services/times.js'
import { 
  registerUser, 
  loginUser, 
  verifyUser, 
  sendEmail, 
  generateHourToken, 
  forgotPassword,
  forgotPasswordAction ,
  verifyAndSendEmail,
  getChangePasswordHtml
} from '../services/auth.js'


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
  const validationRes = validationResult(req)
  try {
    checkErrorFromValidate(validationRes)
    const result = await loginUser(email, password)
    res.status(result.status).json(result) 
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})

router.post('/verify/send-email', async (req, res) => {
  const authHeader = req.headers['authorization']
  const temporaryToken = authHeader && authHeader.split(' ')[1]

  try {
    const verifyAndSendEmailData = await verifyAndSendEmail(temporaryToken)
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
    const forgotPasswordData = await forgotPassword(email)
    console.log(forgotPasswordData)
    res.status(200).json({ status:200, message:'Change Password link sent, Check your email' })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})

router.get('/forgot-password/modify/:token', (req, res) => {  
  const token = String(req.params.token) //this must contain the 
  try {
    const changePasswordHtml = getChangePasswordHtml(token)
    res.status(200).send(changePasswordHtml)
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})

router.post('/forgot-password/action', async(req, res) => {
  const temporaryToken = req.body.token
  const newPassword = req.body.newPassword
  try {
    const data = await forgotPasswordAction(temporaryToken, newPassword)
    res.status(200).json({ status:200, message:'password changed' })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
})




router.get('/secret', authenticateUser, (req, res) => {
  const user = req.user
  const secretData = ['alpha', 'bruno', 'changshi']
  res.status(200).json({data:secretData})
})

export default router