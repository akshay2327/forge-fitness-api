const mongoose = require('mongoose')
const dns = require('dns')
dns.setServers(['8.8.8.8', '8.8.4.4'])
let isConnected = false

const connectDB = async () => {
  if (isConnected) return
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    isConnected = true
    console.log(`✅ MongoDB: ${conn.connection.host}`)
    mongoose.connection.on('error', err => console.error('MongoDB error:', err))
    mongoose.connection.on('disconnected', () => { isConnected = false })
  } catch (err) {
    console.error('❌ MongoDB failed:', err.message)
    process.exit(1)
  }
}

module.exports = { connectDB }
