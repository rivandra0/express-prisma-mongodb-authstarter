import jwt from 'jsonwebtoken'

function authenticateUser (req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  try {
    if (token === null) {
      throw { status: 401, messsage: "You don't have any token" }
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        // console.log('error on verify: ',err)
        throw { status: 401, messsage: 'token not recognized or expired' }
      }

      // checking if the user is verified
      if(!user.isVerified) {
        throw { status: 401, message: 'Account not verified, please check your email to for the verification link'}
      }
      req.user = user
      next()
    })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
}

export default authenticateUser