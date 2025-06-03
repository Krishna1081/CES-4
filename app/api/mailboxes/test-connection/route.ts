import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createTransport } from 'nodemailer'

const connectionSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  imap: z.object({
    server: z.string(),
    port: z.number(),
    security: z.enum(['none', 'ssl', 'tls']),
    username: z.string()
  }),
  smtp: z.object({
    server: z.string(),
    port: z.number(),
    security: z.enum(['none', 'ssl', 'tls']),
    username: z.string(),
    requireAuth: z.boolean()
  })
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = connectionSchema.parse(body)

    // Test SMTP connection
    const smtpConfig = {
      host: data.smtp.server,
      port: data.smtp.port,
      secure: data.smtp.security === 'ssl',
      auth: data.smtp.requireAuth ? {
        user: data.smtp.username,
        pass: data.password
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    }

    const transporter = createTransport(smtpConfig)
    await transporter.verify()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to test connection' 
      },
      { status: 400 }
    )
  }
} 