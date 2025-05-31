import { z } from 'zod'
import type { SMTPConfig } from './types'
import type { Options as SMTPTransportOptions } from 'nodemailer/lib/smtp-transport'

const smtpConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().positive('SMTP port must be a positive number'),
  secure: z.union([
    z.boolean(),
    z.literal('auto')
  ]),
  auth: z.object({
    user: z.string().email('SMTP user must be a valid email'),
    pass: z.string().min(1, 'SMTP password is required')
  }),
  from: z.string().email('From email must be a valid email address')
})

export function getSMTPConfig(): SMTPTransportOptions {
  const port = Number(process.env.SMTP_PORT)
  
  // Try base64 encoded password first, fallback to plain text
  let password: string
  if (process.env.SMTP_PASS_BASE64) {
    try {
      password = Buffer.from(process.env.SMTP_PASS_BASE64, 'base64').toString('utf8')
      console.log('🔍 Using base64 decoded password')
    } catch (error) {
      console.error('❌ Failed to decode base64 password:', error)
      password = process.env.SMTP_PASS || ''
    }
  } else {
    password = process.env.SMTP_PASS || ''
    console.log('🔍 Using plain text password')
  }
  
  console.log('🔍 Password debugging:')
  console.log('Password exists:', !!password)
  console.log('Password length:', password?.length)
  console.log('Password type:', typeof password)
  console.log('Password first 3 chars:', password?.substring(0, 3))
  
  // Also check if there are other environment variables
  console.log('🔍 All SMTP related env vars:')
  Object.keys(process.env)
    .filter(key => key.includes('SMTP') || key.includes('smtp'))
    .forEach(key => {
      const value = process.env[key]
      if (key.includes('PASS') || key.includes('pass')) {
        console.log(`${key}: ${value ? `[${value.length} chars]` : 'undefined'}`)
      } else {
        console.log(`${key}: ${value}`)
      }
    })
  
  // Validate that we have all required values
  if (!password || password.includes('secret')) {
    throw new Error('SMTP password is missing or contains placeholder value')
  }
  
  return {
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465, // Always use secure for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: password // Use the decoded password
    },
    // Add extended configuration but disable debug to prevent password masking
    connectionTimeout: 30000, // 30 seconds
    greetingTimeout: 30000,  // 30 seconds
    socketTimeout: 30000,    // 30 seconds
    tls: {
      rejectUnauthorized: true, // Verify certificates
      minVersion: 'TLSv1.2'     // Use modern TLS
    },
    debug: false, // Disable debug to prevent password masking
    logger: false // Disable logger to prevent password masking
  }
} 