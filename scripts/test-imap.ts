import Imap from 'node-imap'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const requiredEnvVars = [
  'IMAP_HOST',
  'IMAP_PORT',
  'IMAP_USER',
  'IMAP_SECURE',
  'IMAP_TLS_REJECT_UNAUTHORIZED'
]

// Check for missing environment variables
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  process.exit(1)
}

// Check for password (either plain or base64)
if (!process.env.IMAP_PASS && !process.env.IMAP_PASS_BASE64) {
  console.error('❌ Missing password: Neither IMAP_PASS nor IMAP_PASS_BASE64 is set')
  process.exit(1)
}

// Get password (base64 decoded or plain text)
let password: string
if (process.env.IMAP_PASS_BASE64) {
  try {
    password = Buffer.from(process.env.IMAP_PASS_BASE64, 'base64').toString('utf8')
    console.log('🔍 Using base64 decoded password')
  } catch (error) {
    console.error('❌ Failed to decode base64 password:', error)
    password = process.env.IMAP_PASS || ''
    console.log('🔍 Falling back to plain text password')
  }
} else {
  password = process.env.IMAP_PASS || ''
  console.log('🔍 Using plain text password')
}

console.log('📧 IMAP Configuration:')
console.log('Host:', process.env.IMAP_HOST)
console.log('Port:', process.env.IMAP_PORT)
console.log('User:', process.env.IMAP_USER)
console.log('Secure:', process.env.IMAP_SECURE)
console.log('TLS Reject Unauthorized:', process.env.IMAP_TLS_REJECT_UNAUTHORIZED)
console.log('Password length:', password?.length)
console.log('\n')

const imap = new Imap({
  user: process.env.IMAP_USER!,
  password: password,
  host: process.env.IMAP_HOST!,
  port: Number(process.env.IMAP_PORT),
  tls: process.env.IMAP_SECURE === 'true',
  tlsOptions: { 
    rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED === 'true'
  },
  debug: (info) => {
    console.log('🔍 IMAP Debug:', info)
  }
})

// Connection event handlers
imap.once('ready', () => {
  console.log('✅ IMAP connection successful!')
  console.log('📫 Attempting to open INBOX...')
  
  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      console.error('❌ Error opening INBOX:', err)
      imap.end()
      return
    }
    
    console.log('📬 INBOX opened successfully!')
    console.log('📊 Mailbox info:', {
      name: box.name,
      messages: {
        total: box.messages.total,
        new: box.messages.new,
        unseen: box.messages.unseen
      }
    })
    
    // Clean up
    console.log('🔚 Closing connection...')
    imap.end()
  })
})

imap.once('error', (err) => {
  console.error('❌ IMAP connection error:', err)
  process.exit(1)
})

imap.once('end', () => {
  console.log('👋 IMAP connection ended')
  process.exit(0)
})

// Start connection
console.log('🔄 Attempting to connect to IMAP server...')
imap.connect() 