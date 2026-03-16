const mongoose = require('mongoose')

const assessmentSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  age:            { type: Number, required: true, min: 10, max: 100 },
  gender:         { type: String, enum: ['male','female','other'], required: true },
  weight:         { type: Number, required: true, min: 20, max: 300 },
  height:         { type: Number, required: true, min: 100, max: 250 },
  bmi: Number, bmiCategory: String, bodyFatPercent: Number,
  measurements:   { chest: Number, waist: Number, hips: Number, bicep: Number, thigh: Number, calf: Number },
  fitnessGoal:    { type: String, enum: ['fat-loss','muscle-gain','maintenance','strength','endurance'], required: true },
  targetWeight:   Number,
  activityLevel:  { type: String, enum: ['sedentary','light','moderate','active','very-active'], required: true },
  dietPreference: { type: String, enum: ['veg','non-veg','vegan','eggetarian'], required: true },
  sleepHours: Number, waterIntakeLiters: Number,
  medicalConditions: String, allergies: [String],
  tdee: Number, targetCalories: Number,
  proteinTarget: Number, carbTarget: Number, fatTarget: Number,
  isInitial: { type: Boolean, default: false },
  takenAt:   { type: Date, default: Date.now },
  notes: String,
}, { timestamps: true })

assessmentSchema.pre('save', function(next) {
  const h = this.height / 100
  this.bmi = parseFloat((this.weight / (h * h)).toFixed(1))
  this.bmiCategory = this.bmi < 18.5 ? 'Underweight' : this.bmi < 25 ? 'Normal' : this.bmi < 30 ? 'Overweight' : 'Obese'
  const bmr = this.gender === 'male'
    ? 10 * this.weight + 6.25 * this.height - 5 * this.age + 5
    : 10 * this.weight + 6.25 * this.height - 5 * this.age - 161
  const mult = { sedentary:1.2, light:1.375, moderate:1.55, active:1.725, 'very-active':1.9 }
  this.tdee = Math.round(bmr * (mult[this.activityLevel] || 1.55))
  const adj  = { 'fat-loss':-500, 'muscle-gain':300, maintenance:0, strength:200, endurance:100 }
  this.targetCalories = this.tdee + (adj[this.fitnessGoal] || 0)
  this.proteinTarget  = Math.round(this.weight * 2.0)
  this.fatTarget      = Math.round(this.targetCalories * 0.25 / 9)
  this.carbTarget     = Math.round((this.targetCalories - this.proteinTarget * 4 - this.fatTarget * 9) / 4)
  next()
})
assessmentSchema.index({ userId: 1, takenAt: -1 })
module.exports = mongoose.models.Assessment || mongoose.model('Assessment', assessmentSchema)
