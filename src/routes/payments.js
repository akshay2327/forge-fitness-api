const express   = require('express')
const router    = express.Router()
const crypto    = require('crypto')
const { protect } = require('../middleware/auth')
const User      = require('../models/User')

const PLANS = {
  standard: { amount: 199900, label: 'Standard Plan', days: 30 },
  pro:      { amount: 349900, label: 'Pro Plan',      days: 30 },
  elite:    { amount: 599900, label: 'Elite Plan',    days: 30 },
}

// Lazy-load Razorpay so missing keys don't crash on startup
let _razorpay = null
function getRazorpay() {
  if (!_razorpay) {
    const Razorpay = require('razorpay')
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  }
  return _razorpay
}

router.post('/create-order', protect, async (req, res) => {
  try {
    const { plan } = req.body
    if (!PLANS[plan]) return res.status(400).json({ error: 'Invalid plan selected.' })
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return res.status(503).json({ error: 'Payment gateway not configured. Please contact support.' })
    }
    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount:   PLANS[plan].amount,
      currency: 'INR',
      receipt:  `frg_${req.user._id.toString().slice(-8)}_${Date.now().toString().slice(-8)}`,
      notes:    { userId: req.user._id.toString(), plan, userEmail: req.user.email },
    })
    res.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      planName: PLANS[plan].label,
    })
  } catch (err) {
    console.error('[Payments] create-order error:', err?.message || err)
    const msg = err?.error?.description || err?.message || 'Failed to create payment order.'
    res.status(500).json({ error: msg })
  }
})

router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' })
    }
    // Verify signature
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')
    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment signature mismatch. Verification failed.' })
    }
    // Activate membership
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + (PLANS[plan]?.days || 30))
    const user = await User.findByIdAndUpdate(req.user._id, {
      'membership.plan':             plan,
      'membership.status':           'active',
      'membership.startDate':        new Date(),
      'membership.endDate':          endDate,
      'membership.razorpayPaymentId': razorpay_payment_id,
    }, { new: true })
    res.json({
      message:    `🎉 ${PLANS[plan]?.label} activated! Valid until ${endDate.toLocaleDateString('en-IN')}.`,
      membership: user.membership,
    })
  } catch (err) {
    console.error('[Payments] verify error:', err?.message || err)
    res.status(500).json({ error: 'Payment verification failed. Contact support.' })
  }
})

// Webhook (for production use - validates Razorpay webhook signature)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const secret    = process.env.RAZORPAY_WEBHOOK_SECRET
    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex')
      if (expected !== signature) return res.status(400).json({ error: 'Invalid webhook signature' })
    }
    const event = JSON.parse(req.body)
    if (event.event === 'payment.captured') {
      const notes = event.payload?.payment?.entity?.notes
      if (notes?.userId && notes?.plan) {
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + (PLANS[notes.plan]?.days || 30))
        await User.findByIdAndUpdate(notes.userId, {
          'membership.plan':    notes.plan,
          'membership.status':  'active',
          'membership.endDate': endDate,
        })
      }
    }
    res.json({ received: true })
  } catch (err) {
    console.error('[Webhook]', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

module.exports = router
