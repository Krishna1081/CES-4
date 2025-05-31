import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import { getSMTPConfig } from '../lib/email/config/smtp'

// Load environment variables
dotenv.config()

const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_FROM',
  'SMTP_SECURE'
]

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  process.exit(1)
}

// Check for password (either plain or base64)
if (!process.env.SMTP_PASS && !process.env.SMTP_PASS_BASE64) {
  console.error('❌ Missing password: Neither SMTP_PASS nor SMTP_PASS_BASE64 is set')
  process.exit(1)
}

console.log('📧 SMTP Configuration:')
console.log('Host:', process.env.SMTP_HOST)
console.log('Port:', process.env.SMTP_PORT)
console.log('User:', process.env.SMTP_USER)
console.log('From:', process.env.SMTP_FROM)
console.log('Secure:', process.env.SMTP_SECURE)
console.log('\n')

async function testSMTP() {
  console.log('🔄 Creating SMTP transport...')
  
  const config = getSMTPConfig()
  console.log('📝 Using config:', JSON.stringify(config, (key, value) => {
    if (key === 'pass') return '********'
    return value
  }, 2))
  
  const transporter = nodemailer.createTransport(config)

  try {
    console.log('🔄 Verifying SMTP connection...')
    await transporter.verify()
    console.log('✅ SMTP connection successful!')

    console.log('📨 Attempting to send test email...')
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_USER, // Send to self
      subject: 'SMTP Test',
      text: 'If you receive this email, SMTP is working correctly!'
    })

    console.log('✅ Test email sent successfully!')
    console.log('📊 Message info:', {
      messageId: info.messageId,
      response: info.response
    })
  } catch (error) {
    console.error('❌ SMTP error:', error)
    process.exit(1)
  }
}

console.log('🔄 Starting SMTP test...')
testSMTP()
  .then(() => {
    console.log('✅ SMTP test completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ SMTP test failed:', error)
    process.exit(1)
  }) 