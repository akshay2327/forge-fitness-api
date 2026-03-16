const express = require('express')
const router  = express.Router()
const { protect, restrictTo } = require('../middleware/auth')
const WorkoutPlan = require('../models/WorkoutPlan')

router.get('/', protect, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
    if (!plan) return res.status(404).json({ error: 'No active workout plan.' })
    res.json({ plan })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch workout plan' }) }
})

router.get('/today', protect, async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({ userId: req.user._id, isActive: true })
    if (!plan) return res.status(404).json({ error: 'No active workout plan.' })
    const day  = plan.days.find(d => d.dayOfWeek === new Date().getDay())
    res.json({ day: day || null })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch today workout' }) }
})

router.post('/', protect, restrictTo('admin','trainer'), async (req, res) => {
  try {
    await WorkoutPlan.updateMany({ userId: req.body.userId, isActive: true }, { isActive: false })
    const plan = await WorkoutPlan.create({ ...req.body, createdBy: req.user._id, isActive: true })
    res.status(201).json({ plan, message: 'Workout plan assigned!' })
  } catch (err) { res.status(500).json({ error: 'Failed to create workout plan' }) }
})

module.exports = router
