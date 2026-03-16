require('dotenv').config()
const express       = require('express')
const helmet        = require('helmet')
const cors          = require('cors')
const morgan        = require('morgan')
const compression   = require('compression')
const mongoSanitize = require('express-mongo-sanitize')
const hpp           = require('hpp')
const { connectDB } = require('./config/db')
const { errorHandler, notFound } = require('./middleware/errorHandler')

const authRoutes       = require('./routes/auth')
const userRoutes       = require('./routes/users')
const assessmentRoutes = require('./routes/assessments')
const dietRoutes       = require('./routes/diet')
const workoutRoutes    = require('./routes/workouts')
const progressRoutes   = require('./routes/progress')
const paymentRoutes    = require('./routes/payments')
const adminRoutes      = require('./routes/admin')
const uploadRoutes     = require('./routes/upload')

const app = express()
connectDB()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}))

app.use(mongoSanitize())
app.use(hpp())
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'))

app.get('/health', (req, res) => res.json({
  status: 'ok', env: process.env.NODE_ENV, ts: new Date().toISOString()
}))

const API = '/api/v1'
app.use(`${API}/auth`,        authRoutes)
app.use(`${API}/users`,       userRoutes)
app.use(`${API}/assessments`, assessmentRoutes)
app.use(`${API}/diet`,        dietRoutes)
app.use(`${API}/workouts`,    workoutRoutes)
app.use(`${API}/progress`,    progressRoutes)
app.use(`${API}/payments`,    paymentRoutes)
app.use(`${API}/admin`,       adminRoutes)
app.use(`${API}/upload`,      uploadRoutes)

app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () =>
  console.log(`\n🚀 FORGE API on port ${PORT} [${process.env.NODE_ENV}]\n   http://localhost:${PORT}/health\n`)
)
process.on('SIGTERM', () => server.close(() => process.exit(0)))
process.on('unhandledRejection', (err) => { console.error(err); server.close(() => process.exit(1)) })
module.exports = app
