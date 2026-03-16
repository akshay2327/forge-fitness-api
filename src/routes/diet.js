const express = require('express')
const router  = express.Router()
const { protect, restrictTo } = require('../middleware/auth')
const DietPlan = require('../models/DietPlan')

router.get('/', protect, async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ userId: req.user._id, isActive: true })
      .sort({ createdAt: -1 })
    if (!plan) return res.status(404).json({ error: 'No active diet plan found.' })
    res.json({ plan })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch diet plan' }) }
})

router.post('/', protect, restrictTo('admin','trainer'), async (req, res) => {
  try {
    await DietPlan.updateMany({ userId: req.body.userId, isActive: true }, { isActive: false })
    const plan = await DietPlan.create({ ...req.body, createdBy: req.user._id, isActive: true })
    res.status(201).json({ plan, message: 'Diet plan assigned!' })
  } catch (err) { res.status(500).json({ error: 'Failed to create diet plan' }) }
})

module.exports = router
