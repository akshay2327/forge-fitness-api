require('dotenv').config()
const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])

const mongoose = require('mongoose')
const bcrypt   = require('bcryptjs')

const userSchema = new mongoose.Schema({
  memberId:  { type: String, default: () => `FRG-${new Date().getFullYear()}-${String(Math.floor(1000+Math.random()*9000))}` },
  fullName:  String,
  email:     { type: String, lowercase: true },
  password:  String,
  role:      { type: String, default: 'member' },
  provider:  { type: String, default: 'credentials' },
  isActive:  { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: true },
  membership: {
    plan:   { type: String, default: 'free' },
    status: { type: String, default: 'active' },
  },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

async function seed() {
  try {
    console.log('Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
    console.log('✅ Connected!\n')

    // Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@forgefitness.com'
    const adminPass  = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ForgeAdmin@2026!', 12)
    await User.findOneAndUpdate(
      { email: adminEmail },
      { memberId:'FRG-ADMIN-0001', fullName: process.env.ADMIN_NAME||'Forge Admin', email: adminEmail, password: adminPass, role:'admin', membership:{ plan:'elite', status:'active' } },
      { upsert: true, new: true }
    )
    console.log('✅ Admin:', adminEmail)

    // Trainer
    const trainerPass = await bcrypt.hash('Trainer@123', 12)
    await User.findOneAndUpdate(
      { email: 'marcus@forgefitness.com' },
      { memberId:'FRG-TRAINER-0001', fullName:'Marcus Webb', email:'marcus@forgefitness.com', password: trainerPass, role:'trainer', membership:{ plan:'pro', status:'active' } },
      { upsert: true, new: true }
    )
    console.log('✅ Trainer: marcus@forgefitness.com')

    // Demo Member
    const memberPass = await bcrypt.hash('Member@123', 12)
    await User.findOneAndUpdate(
      { email: 'demo@forgefitness.com' },
      { memberId:'FRG-2024-0042', fullName:'Arjun Kumar', email:'demo@forgefitness.com', password: memberPass, role:'member', membership:{ plan:'pro', status:'active' } },
      { upsert: true, new: true }
    )
    console.log('✅ Demo member: demo@forgefitness.com')

    console.log('\n🎉 Database seeded successfully!\n')
    console.log('─────────────────────────────────────')
    console.log('  Admin:   admin@forgefitness.com  /  ForgeAdmin@2026!')
    console.log('  Trainer: marcus@forgefitness.com /  Trainer@123')
    console.log('  Member:  demo@forgefitness.com   /  Member@123')
    console.log('─────────────────────────────────────\n')
  } catch (err) {
    console.error('Seed error:', err.message)
  } finally {
    await mongoose.disconnect()
    console.log('Disconnected.')
  }
}

seed()
