const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  memberId:  { type: String, default: () => `FRG-${new Date().getFullYear()}-${Math.floor(1000+Math.random()*9000)}` },
  fullName:  { type: String, required: true, trim: true, maxlength: 100 },
  email:     { type: String, required: true, lowercase: true, trim: true },
  password:  { type: String, minlength: 8, select: false },
  avatar:    { type: String, default: null },
  phone:     { type: String, default: null },
  googleId:  { type: String, default: null },
  role:      { type: String, enum: ['member','admin','trainer'], default: 'member' },
  provider:  { type: String, enum: ['credentials','google'],     default: 'credentials' },
  isActive:         { type: Boolean, default: true },
  isEmailVerified:  { type: Boolean, default: false },
  emailVerifyToken: { type: String, select: false },
  passwordResetToken:  { type: String, select: false },
  passwordResetExpiry: { type: Date,   select: false },
  lastLogin: Date,
  membership: {
    plan:   { type: String, enum: ['free','standard','pro','elite'], default: 'free' },
    status: { type: String, enum: ['active','expired','cancelled'],  default: 'active' },
    startDate: Date, endDate: Date, razorpayPaymentId: String,
  },
  assignedTrainer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
  toJSON: { transform: (_, r) => { delete r.password; delete r.__v; return r } }
})

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})
userSchema.methods.comparePassword = function(c) { return bcrypt.compare(c, this.password) }
userSchema.index({ email: 1 })
userSchema.index({ memberId: 1 })
userSchema.index({ role: 1, 'membership.status': 1 })

module.exports = mongoose.models.User || mongoose.model('User', userSchema)
