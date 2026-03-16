const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/auth')
const User        = require('../models/User')
const Assessment  = require('../models/Assessment')
const ProgressLog = require('../models/ProgressLog')

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedTrainer','fullName avatar email memberId')
    res.json({ user })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch profile' }) }
})

router.patch('/profile', protect, async (req, res) => {
  try {
    const allowed = ['fullName','phone','avatar']
    const updates = {}
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
    res.json({ user, message: 'Profile updated!' })
  } catch (err) { res.status(500).json({ error: 'Failed to update profile' }) }
})

// PDF report data
router.get('/report-data', protect, async (req, res) => {
  try {
    const [user, assess, progress] = await Promise.all([
      User.findById(req.user._id),
      Assessment.findOne({ userId: req.user._id }).sort({ takenAt: -1 }),
      ProgressLog.find({ userId: req.user._id }).sort({ loggedAt: -1 }).limit(30),
    ])
    const startW   = progress.length ? progress[progress.length - 1].weight : assess?.weight || 0
    const currentW = progress.length ? progress[0].weight : assess?.weight || 0
    res.json({
      member: {
        name: user.fullName, email: user.email,
        memberId: user.memberId, plan: user.membership?.plan,
        memberSince: user.createdAt,
      },
      current: assess ? {
        weight: assess.weight, height: assess.height,
        bmi: assess.bmi, bmiCategory: assess.bmiCategory,
        goal: assess.fitnessGoal, activityLevel: assess.activityLevel,
        dietPreference: assess.dietPreference, targetCalories: assess.targetCalories,
        proteinTarget: assess.proteinTarget, carbTarget: assess.carbTarget, fatTarget: assess.fatTarget,
      } : null,
      progress: {
        startWeight: startW, currentWeight: currentW,
        weightChange: parseFloat((currentW - startW).toFixed(1)),
        totalLogs: progress.length,
      },
      weightHistory: progress.map(p => ({ date: p.loggedAt, weight: p.weight, notes: p.notes })),
    })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch report data' }) }
})

module.exports = router
