const mongoose = require('mongoose')

const exercise = new mongoose.Schema({
  name: String, sets: Number, reps: String, weight: String,
  restSeconds: { type: Number, default: 90 }, notes: String, videoUrl: String,
}, { _id: false })

const workoutDay = new mongoose.Schema({
  dayOfWeek: { type: Number, min: 0, max: 6 },
  name: String,
  type: { type: String, enum: ['strength','cardio','hiit','mobility','rest'] },
  durationMinutes: { type: Number, default: 60 },
  exercises: [exercise], caloriesBurned: Number, notes: String,
}, { _id: false })

const workoutPlanSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:         { type: String, required: true },
  program:       String, goal: String,
  level:         { type: String, enum: ['beginner','intermediate','advanced'] },
  durationWeeks: Number,
  currentWeek:   { type: Number, default: 1 },
  days:          [workoutDay],
  isActive:      { type: Boolean, default: true },
  startDate:     { type: Date, default: Date.now },
  endDate: Date, notes: String,
}, { timestamps: true })

workoutPlanSchema.index({ userId: 1, isActive: 1 })
module.exports = mongoose.models.WorkoutPlan || mongoose.model('WorkoutPlan', workoutPlanSchema)
