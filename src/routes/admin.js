const express = require('express')
const router  = express.Router()
const { protect, restrictTo } = require('../middleware/auth')
const User        = require('../models/User')
const Assessment  = require('../models/Assessment')
const ProgressLog = require('../models/ProgressLog')
const DietPlan    = require('../models/DietPlan')
const WorkoutPlan = require('../models/WorkoutPlan')

router.use(protect, restrictTo('admin'))

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const [total, active, newMonth, trainers] = await Promise.all([
      User.countDocuments({ role: 'member' }),
      User.countDocuments({ role: 'member', 'membership.status': 'active' }),
      User.countDocuments({ role: 'member', createdAt: { $gte: new Date(new Date().setDate(1)) } }),
      User.countDocuments({ role: 'trainer' }),
    ])
    res.json({ stats: { total, active, newMonth, trainers } })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch stats' }) }
})

// List members with search + pagination
router.get('/members', async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1
    const limit  = parseInt(req.query.limit) || 20
    const search = req.query.search?.trim() || ''
    const query  = {}
    if (req.query.role) query.role = req.query.role
    if (search) query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email:    { $regex: search, $options: 'i' } },
      { memberId: { $regex: search, $options: 'i' } },
    ]
    const [members, total] = await Promise.all([
      User.find(query).populate('assignedTrainer','fullName').sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit),
      User.countDocuments(query),
    ])
    res.json({ members, pagination: { page, limit, total, pages: Math.ceil(total/limit) } })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch members' }) }
})

// Single member detail
router.get('/members/:id', async (req, res) => {
  try {
    const [user, assessments, progress] = await Promise.all([
      User.findById(req.params.id).populate('assignedTrainer','fullName'),
      Assessment.find({ userId: req.params.id }).sort({ takenAt: -1 }).limit(5),
      ProgressLog.find({ userId: req.params.id }).sort({ loggedAt: -1 }).limit(30),
    ])
    if (!user) return res.status(404).json({ error: 'Member not found' })
    res.json({ user, assessments, progress })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch member' }) }
})

// Update member
router.patch('/members/:id', async (req, res) => {
  try {
    const allowed = ['assignedTrainer','membership','isActive','role']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
    if (!user) return res.status(404).json({ error: 'Member not found' })
    res.json({ user, message: 'Member updated!' })
  } catch (err) { res.status(500).json({ error: 'Failed to update member' }) }
})

// Suspend / activate member
router.post('/members/:id/suspend', async (req, res) => {
  try {
    const { id } = req.params
    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid member ID format.' })
    }
    const user = await User.findById(id)
    if (!user) return res.status(404).json({ error: 'Member not found' })
    user.isActive = !user.isActive
    await user.save()
    res.json({ user, message: user.isActive ? '✅ Member activated!' : '⚠️ Member suspended!' })
  } catch (err) { console.error('[Admin suspend]', err); res.status(500).json({ error: 'Failed to update member' }) }
})

// Assign trainer to member
router.post('/members/:id/assign-trainer', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { assignedTrainer: req.body.trainerId }, { new: true })
    if (!user) return res.status(404).json({ error: 'Member not found' })
    res.json({ user, message: 'Trainer assigned!' })
  } catch (err) { res.status(500).json({ error: 'Failed to assign trainer' }) }
})

// List trainers
router.get('/trainers', async (req, res) => {
  try {
    const trainers = await User.find({ role: 'trainer' }).select('fullName email memberId')
    res.json({ trainers })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch trainers' }) }
})

// Get gym settings (stored in a special admin user doc or env)
router.get('/settings', async (req, res) => {
  try {
    // Return current settings — stored in process.env or a future Settings model
    res.json({
      settings: {
        gymName:    process.env.GYM_NAME    || 'FORGE Fitness',
        location:   process.env.GYM_LOCATION || 'Jaipur, Rajasthan',
        email:      process.env.GYM_EMAIL    || 'admin@forgefitness.com',
        phone:      process.env.GYM_PHONE    || '+91 98765 43210',
        gst:        process.env.GYM_GST      || '27AABCU9603R1Z1',
        pricingStandard: process.env.PRICE_STANDARD || '1999',
        pricingPro:      process.env.PRICE_PRO      || '3499',
        pricingElite:    process.env.PRICE_ELITE     || '5999',
        trialDays:       process.env.TRIAL_DAYS      || '7',
        refundDays:      process.env.REFUND_DAYS     || '7',
      }
    })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch settings' }) }
})

// Save gym settings — persist to a Settings collection
const mongoose = require('mongoose')
const settingsSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: String }, { timestamps: true })
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema)

router.patch('/settings', async (req, res) => {
  try {
    const fields = ['gymName','location','email','phone','gst','pricingStandard','pricingPro','pricingElite','trialDays','refundDays']
    const saved = []
    for (const field of fields) {
      if (req.body[field] !== undefined) {
        await Settings.findOneAndUpdate({ key: field }, { value: String(req.body[field]) }, { upsert: true, new: true })
        saved.push(field)
      }
    }
    res.json({ message: `✅ Settings saved! (${saved.length} fields updated)` })
  } catch (err) { console.error('[Settings]', err); res.status(500).json({ error: 'Failed to save settings' }) }
})

module.exports = router
