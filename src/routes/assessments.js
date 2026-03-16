const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')
const Assessment = require('../models/Assessment')

router.get('/', protect, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user._id }).sort({ takenAt: -1 }).limit(20)
    res.json({ assessments, latest: assessments[0] || null })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch assessments' }) }
})

router.post('/', protect, [
  body('age').isInt({ min:10, max:100 }),
  body('gender').isIn(['male','female','other']),
  body('weight').isFloat({ min:20, max:300 }),
  body('height').isFloat({ min:100, max:250 }),
  body('fitnessGoal').isIn(['fat-loss','muscle-gain','maintenance','strength','endurance']),
  body('activityLevel').isIn(['sedentary','light','moderate','active','very-active']),
  body('dietPreference').isIn(['veg','non-veg','vegan','eggetarian']),
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
    const count = await Assessment.countDocuments({ userId: req.user._id })
    const assessment = await Assessment.create({ userId: req.user._id, ...req.body, isInitial: count === 0 })
    res.status(201).json({ assessment, message: 'Assessment saved!' })
  } catch (err) { res.status(500).json({ error: 'Failed to save assessment' }) }
})

module.exports = router
