import { z } from 'zod'
import type { IMAPConfig } from './types'

const imapConfigSchema = z.object({
  host: z.string().min(1, 'IMAP host is required'),
  port: z.number().int().positive('IMAP port must be a positive number'),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().email('IMAP user must be a valid email'),
    pass: z.string().min(1, 'IMAP password is required')
  }),
  tls: z.object({
    rejectUnauthorized: z.boolean()
  })
})

export function getIMAPConfig(): IMAPConfig {
  // Try base64 encoded password first, fallback to plain text
  let password: string
  if (process.env.IMAP_PASS_BASE64) {
    try {
      password = Buffer.from(process.env.IMAP_PASS_BASE64, 'base64').toString('utf8')
      console.log('🔍 IMAP: Using base64 decoded password')
    } catch (error) {
      console.error('❌ IMAP: Failed to decode base64 password:', error)
      password = process.env.IMAP_PASS || ''
    }
  } else {
    password = process.env.IMAP_PASS || ''
    console.log('🔍 IMAP: Using plain text password')
  }

  console.log('🔍 IMAP Password debugging:')
  console.log('Password exists:', !!password)
  console.log('Password length:', password?.length)
  console.log('Password first 3 chars:', password?.substring(0, 3))

  const config = {
    host: process.env.IMAP_HOST,
    port: parseInt(process.env.IMAP_PORT || '993', 10),
    secure: process.env.IMAP_SECURE === 'true',
    auth: {
      user: process.env.IMAP_USER,
      pass: password // Use the decoded password
    },
    tls: {
      rejectUnauthorized: process.env.IMAP_TLS_REJECT_UNAUTHORIZED === 'true'
    }
  }

  try {
    return imapConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(`Invalid IMAP configuration:\n${errors}`)
    }
    throw error
  }
} 