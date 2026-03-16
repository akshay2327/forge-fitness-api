const mongoose = require('mongoose')

const progressLogSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weight:            { type: Number, required: true, min: 20, max: 300 },
  bodyFatPercent:    Number,
  measurements:      { chest: Number, waist: Number, hips: Number, bicep: Number, thigh: Number, calf: Number },
  photos:            { front: String, back: String, side: String },
  mood:              { type: Number, min: 1, max: 5 },
  energyLevel:       { type: Number, min: 1, max: 5 },
  sleepHours:        Number,
  waterIntakeLiters: Number,
  caloriesConsumed:  Number,
  notes:             String,
  loggedAt:          { type: Date, default: Date.now },
}, { timestamps: true })

progressLogSchema.index({ userId: 1, loggedAt: -1 })
module.exports = mongoose.models.ProgressLog || mongoose.model('ProgressLog', progressLogSchema)
