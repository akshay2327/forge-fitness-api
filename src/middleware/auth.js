const { verifyAccessToken } = require('../utils/tokens')
const User = require('../models/User')

exports.protect = async (req, res, next) => {
  try {
    let token
    if (req.headers.authorization?.startsWith('Bearer '))
      token = req.headers.authorization.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Not authenticated. Please log in.' })

    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.id).select('-password')
    if (!user)       return res.status(401).json({ error: 'User no longer exists.' })
    if (!user.isActive) return res.status(403).json({ error: 'Account suspended. Contact support.' })

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' })
    return res.status(401).json({ error: 'Invalid token.' })
  }
}

exports.restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `Access denied. Required: ${roles.join(' or ')}` })
  next()
}

exports.requireMembership = (req, res, next) => {
  const { membership } = req.user
  if (membership.plan === 'free' || membership.status !== 'active')
    return res.status(403).json({ error: 'Active membership required.', code: 'MEMBERSHIP_REQUIRED' })
  next()
}
