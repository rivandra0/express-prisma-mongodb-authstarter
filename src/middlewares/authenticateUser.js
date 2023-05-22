import jwt from 'jsonwebtoken'

function authenticateUser (req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  console.log('this is on first token:97',token)
  try {
    if (token === null) {
      throw { status: 401, messsage: "You don't have any token" }
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        // console.log('error on verify: ',err)
        throw { status: 401, messsage: 'token not recognized or expired' }
      }
      // console.log("it's pass the verification tbh")
      req.user = user
      next()
    })
  } catch (err) {
    res.status(err.status || 500).json({ status: err.status, message: err.message, completeError: err })
  }
}

export default authenticateUser