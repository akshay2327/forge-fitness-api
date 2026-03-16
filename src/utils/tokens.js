const jwt = require('jsonwebtoken')

const generateTokens = (user) => {
  const payload = { id: user._id.toString(), email: user.email, role: user.role, memberId: user.memberId }
  const accessToken  = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' })
  const refreshToken = jwt.sign({ id: user._id.toString() }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' })
  return { accessToken, refreshToken }
}

const verifyRefreshToken = (token) => jwt.verify(token, process.env.JWT_REFRESH_SECRET)
const verifyAccessToken  = (token) => jwt.verify(token, process.env.JWT_SECRET)

module.exports = { generateTokens, verifyRefreshToken, verifyAccessToken }
