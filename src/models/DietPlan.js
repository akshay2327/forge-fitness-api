const mongoose = require('mongoose')

const foodItem = new mongoose.Schema({
  name: String, quantity: String, calories: Number,
  protein: Number, carbs: Number, fat: Number, notes: String,
}, { _id: false })

const meal = new mongoose.Schema({
  type: { type: String, enum: ['breakfast','mid-morning','lunch','evening-snack','dinner','pre-workout','post-workout'] },
  time: String, items: [foodItem],
  totalCalories: { type: Number, default: 0 }, totalProtein: { type: Number, default: 0 },
  totalCarbs:    { type: Number, default: 0 }, totalFat:     { type: Number, default: 0 },
}, { _id: false })

const dietPlanSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assessmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:          { type: String, required: true },
  goal: String, dietPreference: String,
  targetCalories: Number, targetProtein: Number, targetCarbs: Number, targetFat: Number,
  meals: [meal], hydrationLiters: { type: Number, default: 3 },
  supplements: [String], notes: String,
  isActive:  { type: Boolean, default: true },
  validFrom: { type: Date, default: Date.now }, validUntil: Date,
}, { timestamps: true })

dietPlanSchema.pre('save', function(next) {
  this.meals.forEach(m => {
    m.totalCalories = m.items.reduce((s,i) => s+(i.calories||0), 0)
    m.totalProtein  = m.items.reduce((s,i) => s+(i.protein||0),  0)
    m.totalCarbs    = m.items.reduce((s,i) => s+(i.carbs||0),    0)
    m.totalFat      = m.items.reduce((s,i) => s+(i.fat||0),      0)
  })
  next()
})
dietPlanSchema.index({ userId: 1, isActive: 1 })
module.exports = mongoose.models.DietPlan || mongoose.model('DietPlan', dietPlanSchema)
