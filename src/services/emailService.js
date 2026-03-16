const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

const base = (content) => `<!DOCTYPE html><html><body style="background:#0a0a0a;font-family:Arial,sans-serif;padding:40px">
<table width="560" style="background:#181818;border-radius:12px;border:1px solid #222;margin:0 auto">
<tr><td style="background:#111;padding:24px 40px;border-bottom:1px solid #222">
  <span style="font-size:26px;font-weight:900;color:#f0ede8;letter-spacing:3px">FORGE<span style="color:#e8c547">.</span></span>
</td></tr>
<tr><td style="padding:36px 40px">${content}</td></tr>
<tr><td style="background:#111;padding:16px 40px;border-top:1px solid #222;text-align:center">
  <p style="color:#888;font-size:12px;margin:0">© ${new Date().getFullYear()} FORGE Fitness · Jaipur, Rajasthan</p>
</td></tr></table></body></html>`

const templates = {
  welcome: ({ name, verifyUrl }) => ({
    subject: `Welcome to FORGE, ${name}! 💪`,
    html: base(`<h2 style="color:#f0ede8;margin:0 0 12px">Welcome, ${name}!</h2>
      <p style="color:#888;font-size:15px;line-height:1.6">You're officially part of the FORGE family.</p>
      ${verifyUrl ? `<a href="${verifyUrl}" style="display:inline-block;background:#e8c547;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:20px">Verify Email →</a>` : 
      `<a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#e8c547;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:20px">Go to Dashboard →</a>`}`),
  }),
  resetPassword: ({ name, resetUrl }) => ({
    subject: 'Reset your FORGE password',
    html: base(`<h2 style="color:#f0ede8;margin:0 0 12px">Password Reset</h2>
      <p style="color:#888;font-size:15px;line-height:1.6">Hi ${name}, click below to reset your password. Expires in 30 minutes.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#e8c547;color:#000;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:20px">Reset Password →</a>`),
  }),
}

const sendEmail = async ({ to, template, data }) => {
  if (!templates[template]) throw new Error(`Template "${template}" not found`)
  const { subject, html } = templates[template](data)
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FORGE Fitness <noreply@forgefitness.com>',
      to, subject, html,
    })
    console.log(`[Email] "${template}" → ${to} (${result.id})`)
    return result
  } catch (err) {
    console.error(`[Email] Failed "${template}" → ${to}:`, err.message)
  }
}

module.exports = { sendEmail }
