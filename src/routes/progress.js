const express = require('express')
const router  = express.Router()
const { protect } = require('../middleware/auth')
const { body, validationResult } = require('express-validator')
const ProgressLog = require('../models/ProgressLog')

router.get('/', protect, async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 90
    const since = new Date(); since.setDate(since.getDate() - days)
    const logs  = await ProgressLog.find({ userId: req.user._id, loggedAt: { $gte: since } }).sort({ loggedAt: -1 })
    let stats = null
    if (logs.length >= 2) {
      const delta    = logs[0].weight - logs[logs.length-1].weight
      const daysDiff = Math.ceil((new Date(logs[0].loggedAt) - new Date(logs[logs.length-1].loggedAt)) / 86400000)
      stats = { currentWeight: logs[0].weight, startWeight: logs[logs.length-1].weight, weightDelta: parseFloat(delta.toFixed(1)), weeklyChange: parseFloat((delta/(daysDiff/7)).toFixed(2)), totalLogs: logs.length, daysDiff }
    }
    res.json({ logs, stats })
  } catch (err) { res.status(500).json({ error: 'Failed to fetch progress' }) }
})

router.post('/', protect, [ body('weight').isFloat({ min:20, max:300 }) ], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() })
    const log = await ProgressLog.create({ userId: req.user._id, ...req.body })
    res.status(201).json({ log, message: 'Progress logged!' })
  } catch (err) { res.status(500).json({ error: 'Failed to log progress' }) }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const log = await ProgressLog.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    if (!log) return res.status(404).json({ error: 'Log not found' })
    res.json({ message: 'Log deleted' })
  } catch (err) { res.status(500).json({ error: 'Failed to delete' }) }
})

module.exports = router
