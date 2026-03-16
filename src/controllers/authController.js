const bcrypt  = require('bcryptjs')
const crypto  = require('crypto')
const dns     = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
const { validationResult } = require('express-validator')
const { OAuth2Client }     = require('google-auth-library')
const User                 = require('../models/User')
const { sendEmail }        = require('../services/emailService')
const { generateTokens, verifyRefreshToken } = require('../utils/tokens')

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
    const { fullName, email, password } = req.body
    if (await User.findOne({ email }))
      return res.status(409).json({ error: 'Account with this email already exists.' })
    const emailToken = crypto.randomBytes(32).toString('hex')
    const user = await User.create({
      fullName, email, password, provider: 'credentials',
      emailVerifyToken: crypto.createHash('sha256').update(emailToken).digest('hex'),
    })
    const verifyUrl = `${process.env.FRONTEND_URL}/auth/verify-email/${emailToken}`
    await sendEmail({ to: email, template: 'welcome', data: { name: fullName, verifyUrl } })
    const tokens = generateTokens(user)
    res.status(201).json({
      message: 'Account created! Please verify your email.',
      ...tokens,
      user: { id: user._id, memberId: user.memberId, fullName: user.fullName, email: user.email, role: user.role },
    })
  } catch (err) { console.error('[Auth] Register:', err); res.status(500).json({ error: 'Registration failed.' }) }
}

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
    const { email, password } = req.body
    const user = await User.findOne({ email }).select('+password')
    if (!user || !user.password) return res.status(401).json({ error: 'Invalid email or password.' })
    if (!user.isActive)  return res.status(403).json({ error: 'Account suspended. Contact support.' })
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password.' })
    user.lastLogin = new Date()
    await user.save({ validateBeforeSave: false })
    const tokens = generateTokens(user)
    res.json({ ...tokens, user: { id: user._id, memberId: user.memberId, fullName: user.fullName, email: user.email, role: user.role, avatar: user.avatar, membership: user.membership } })
  } catch (err) { console.error('[Auth] Login:', err); res.status(500).json({ error: 'Login failed.' }) }
}

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) return res.status(400).json({ error: 'Google ID token required' })
    const ticket  = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    const { email, name, picture, sub: googleId } = ticket.getPayload()
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({ fullName: name, email, avatar: picture, provider: 'google', googleId, isEmailVerified: true })
      await sendEmail({ to: email, template: 'welcome', data: { name, verifyUrl: null } })
    } else {
      if (!user.avatar && picture) user.avatar = picture
      user.lastLogin = new Date()
      await user.save({ validateBeforeSave: false })
    }
    if (!user.isActive) return res.status(403).json({ error: 'Account suspended.' })
    const tokens = generateTokens(user)
    res.json({ ...tokens, user: { id: user._id, memberId: user.memberId, fullName: user.fullName, email: user.email, role: user.role, avatar: user.avatar, membership: user.membership } })
  } catch (err) { console.error('[Auth] Google:', err); res.status(401).json({ error: 'Google authentication failed.' }) }
}

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' })
    const decoded = verifyRefreshToken(refreshToken)
    const user = await User.findById(decoded.id)
    if (!user || !user.isActive) return res.status(401).json({ error: 'Invalid token' })
    res.json(generateTokens(user))
  } catch (err) { res.status(401).json({ error: 'Invalid or expired refresh token' }) }
}

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' })
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.passwordResetToken  = crypto.createHash('sha256').update(resetToken).digest('hex')
    user.passwordResetExpiry = new Date(Date.now() + 30 * 60 * 1000)
    await user.save({ validateBeforeSave: false })
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password/${resetToken}`
    await sendEmail({ to: user.email, template: 'resetPassword', data: { name: user.fullName, resetUrl } })
    res.json({ message: 'If this email exists, a reset link has been sent.' })
  } catch (err) { res.status(500).json({ error: 'Failed to send reset email' }) }
}

exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOne({ passwordResetToken: hashedToken, passwordResetExpiry: { $gt: Date.now() } })
    if (!user) return res.status(400).json({ error: 'Reset link invalid or expired.' })
    user.password            = req.body.password
    user.passwordResetToken  = undefined
    user.passwordResetExpiry = undefined
    await user.save()
    res.json({ message: 'Password updated successfully.' })
  } catch (err) { res.status(500).json({ error: 'Failed to reset password' }) }
}

exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
    const user = await User.findOneAndUpdate({ emailVerifyToken: hashedToken }, { isEmailVerified: true, emailVerifyToken: undefined }, { new: true })
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link.' })
    res.json({ message: 'Email verified successfully!' })
  } catch (err) { res.status(500).json({ error: 'Verification failed' }) }
}

exports.logout        = async (req, res) => res.json({ message: 'Logged out successfully.' })
exports.getMe         = async (req, res) => res.json({ user: await User.findById(req.user._id).populate('assignedTrainer', 'fullName avatar') })
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    const user = await User.findById(req.user._id).select('+password')
    if (!await bcrypt.compare(currentPassword, user.password)) return res.status(401).json({ error: 'Current password is incorrect.' })
    user.password = newPassword
    await user.save()
    res.json({ message: 'Password changed successfully.' })
  } catch (err) { res.status(500).json({ error: 'Failed to change password' }) }
}
