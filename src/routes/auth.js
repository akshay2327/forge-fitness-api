const express  = require('express')
const router   = express.Router()
const rateLimit = require('express-rate-limit')
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const { protect }    = require('../middleware/auth')

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
})

const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
]
const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
]

router.post('/register',         limiter, registerRules, authController.register)
router.post('/login',            limiter, loginRules,    authController.login)
router.post('/google',           limiter,                authController.googleAuth)
router.post('/refresh',                                  authController.refreshToken)
router.post('/forgot-password',  limiter,                authController.forgotPassword)
router.post('/reset-password/:token',                    authController.resetPassword)
router.get('/verify-email/:token',                       authController.verifyEmail)
router.post('/logout',           protect,                authController.logout)
router.get('/me',                protect,                authController.getMe)
router.patch('/change-password', protect,                authController.changePassword)

module.exports = router
