const express    = require('express')
const router     = express.Router()
const multer     = require('multer')
const { v2: cloudinary } = require('cloudinary')
const { protect } = require('../middleware/auth')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    ['image/jpeg','image/png','image/webp'].includes(file.mimetype)
      ? cb(null, true) : cb(new Error('Only JPEG/PNG/WEBP allowed'), false)
  },
})

router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' })
    const type   = req.body.type || 'progress'
    const folder = `forge-fitness/${type}/${req.user._id}`
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', transformation: [{ width: 800, quality: 'auto:good' }] },
        (err, r) => err ? reject(err) : resolve(r)
      )
      stream.end(req.file.buffer)
    })
    res.json({ url: result.secure_url, publicId: result.public_id })
  } catch (err) {
    console.error('[Upload]', err)
    res.status(500).json({ error: 'Upload failed: ' + err.message })
  }
})

module.exports = router
