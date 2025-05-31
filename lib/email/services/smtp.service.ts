import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { getSMTPConfig } from '../config/smtp'
import type { EmailVerificationStatus } from '../config/types'

export class SMTPService {
  private transporter: Transporter | null = null
  private static instance: SMTPService

  private constructor() {
    try {
      console.log('🔄 Initializing SMTP service...')
      
      // Debug environment variables
      console.log('🔍 Environment variables at initialization:')
      console.log('SMTP_HOST:', process.env.SMTP_HOST)
      console.log('SMTP_PORT:', process.env.SMTP_PORT)
      console.log('SMTP_USER:', process.env.SMTP_USER)
      console.log('SMTP_FROM:', process.env.SMTP_FROM)
      console.log('SMTP_SECURE:', process.env.SMTP_SECURE)
      console.log('SMTP_PASS:', process.env.SMTP_PASS ? 'SET' : 'NOT SET')
      
      const config = getSMTPConfig()
      console.log('📝 Using SMTP config:', JSON.stringify(config, (key, value) => {
        if (key === 'pass') return '********'
        return value
      }, 2))
      
      this.transporter = nodemailer.createTransport(config)
      console.log('✅ SMTP service initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize SMTP service:', error)
      this.transporter = null
    }
  }

  public static getInstance(): SMTPService {
    if (!SMTPService.instance) {
      SMTPService.instance = new SMTPService()
    }
    return SMTPService.instance
  }

  public async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ No transporter available for verification')
      return false
    }

    try {
      console.log('🔄 Verifying SMTP connection...')
      await this.transporter.verify()
      console.log('✅ SMTP connection verification successful')
      return true
    } catch (error) {
      console.error('❌ SMTP connection verification failed:', error)
      return false
    }
  }

  public async sendVerificationEmail(
    to: string,
    firstName: string,
    token: string
  ): Promise<EmailVerificationStatus> {
    if (!this.transporter) {
      throw new Error('SMTP service not initialized')
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    try {
      console.log('📧 Sending verification email to:', to)
      console.log('🔍 Current environment at send time:')
      console.log('SMTP_FROM:', process.env.SMTP_FROM)
      
      // Let's skip the verification for now and try to send directly
      console.log('📨 Attempting to send email directly...')
      
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM,
        to,
        subject: 'Welcome aboard, QuickIntell!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Welcome to QuickIntell</title>
          </head>
          <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; margin: 0; padding: 0;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome aboard, QuickIntell!</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <h2 style="color: #333; margin-top: 0; font-size: 20px;">Hi ${firstName},</h2>
                
                <p style="margin-bottom: 20px;">We are so excited that you have chosen to use <strong>QuickIntell</strong> for your email marketing needs. To enable email campaigns and warm-up on any email address, simply add it to your dashboard using the "Connect Mailbox" button.</p>
                
                <p style="margin-bottom: 20px;">We understand it may be a bit early to ask, but if you could let others know about QuickIntell through a review, that would be great.</p>
                
                <p style="margin-bottom: 20px; font-style: italic; color: #666;">In the rare event that this email ended up in your spam folder, please move it to your inbox and add it to your whitelist.</p>
                
                <p style="margin-bottom: 30px; font-weight: 600;">There's just one more small step: please click the button below to verify your email address.</p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${verificationUrl}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    Verify Email Address
                  </a>
                </div>
                
                <p style="margin-bottom: 20px;">At <strong>QuickScribe LLC</strong> (the company behind QuickIntell), we are always working to improve and be better than we were yesterday.</p>
                
                <p style="margin-bottom: 30px;">As a way of thanking our most trusted customers, we sometimes offer free giveaways of our other SaaS products through elaborate reviews.</p>
                
                <p style="margin-bottom: 20px; font-style: italic; color: #666;">If you haven't created an account yet, no further action is required.</p>
                
                <!-- Divider -->
                <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                
                <!-- Fallback URL -->
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                  <strong>If you're having trouble clicking the "Verify Email Address" button,</strong> copy and paste the URL below into your web browser:
                </p>
                <p style="word-break: break-all; color: #667eea; font-size: 12px; background-color: #f8f9fa; padding: 10px; border-radius: 4px; border-left: 4px solid #667eea;">
                  ${verificationUrl}
                </p>
                
                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; text-align: center;">
                  <p style="font-size: 12px; color: #999; margin: 0;">
                    This email was sent by QuickScribe LLC<br>
                    If you didn't create an account with us, please ignore this email.
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `
      })

      console.log('✅ Email sent successfully!')
      return {
        sent: true,
        delivered: true,
        verified: false,
        lastAttempt: new Date(),
        attempts: 1
      }
    } catch (error) {
      console.error('❌ Failed to send verification email:', error)
      return {
        sent: false,
        delivered: false,
        verified: false,
        lastAttempt: new Date(),
        attempts: 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
} 