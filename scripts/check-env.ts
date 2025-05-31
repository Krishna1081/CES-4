import dotenv from 'dotenv'
import { getSMTPConfig } from '../lib/email/config/smtp'

// Load environment variables
dotenv.config()

const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'SMTP_SECURE'
]

console.log('🔍 Checking environment variables...\n')

// Check for missing variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  process.exit(1)
}

// Print current values (masking sensitive data)
console.log('📧 Current SMTP Configuration:')
console.log('Host:', process.env.SMTP_HOST)
console.log('Port:', process.env.SMTP_PORT)
console.log('User:', process.env.SMTP_USER)
console.log('From:', process.env.SMTP_FROM)
console.log('Secure:', process.env.SMTP_SECURE)
console.log('Pass:', process.env.SMTP_PASS ? '********' : 'NOT SET')

// Try to get SMTP config
try {
  console.log('\n📝 Parsed SMTP Config:')
  const config = getSMTPConfig()
  console.log(JSON.stringify(config, (key, value) => {
    // Mask sensitive data
    if (key === 'pass') return '********'
    return value
  }, 2))
  console.log('\n✅ All environment variables are set and config is valid')
} catch (error) {
  console.error('\n❌ Error parsing SMTP config:', error)
  process.exit(1)
} 