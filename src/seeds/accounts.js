import bcrypt from 'bcrypt'

const hashedPassword = async () => await bcrypt.hash('muaracoder', 10)
const verifiedUserData = { email: 'loginverified0@mail.com', password:await hashedPassword(), isVerified:true } 
const unverifiedUserData = { email: 'loginunverified@mail.com', password:await hashedPassword() }
const successVerifyTestUser = { email: 'verifysuccess@mail.com', password:await hashedPassword(), lastSentEmail: new Date("2000-01-17T16:45:30")  } //this is absolutely more than 1hrs
const failVerifyTestUser = { email: 'verifyfail@mail.com', password:await hashedPassword() }
const forgotPasswordTestUser = { email: 'forgotpw@mail.com', password:await hashedPassword(), lastChangePassword: new Date("2000-01-17T16:45:30") }
export { verifiedUserData, unverifiedUserData, successVerifyTestUser, failVerifyTestUser, forgotPasswordTestUser }