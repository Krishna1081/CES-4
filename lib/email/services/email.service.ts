import { SMTPService } from './smtp.service'
import { IMAPService } from './imap.service'
import type { EmailVerificationStatus } from '../config/types'

const VERIFICATION_CHECK_DELAY = 5000 // 5 seconds

export class EmailService {
  private static instance: EmailService
  private smtpService: SMTPService
  private imapService: IMAPService

  private constructor() {
    this.smtpService = SMTPService.getInstance()
    this.imapService = IMAPService.getInstance()
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  public async sendVerificationEmail(
    to: string,
    firstName: string,
    token: string
  ): Promise<EmailVerificationStatus> {
    try {
      console.log('📧 Sending verification email...')
      // Send verification email via SMTP
      const smtpStatus = await this.smtpService.sendVerificationEmail(to, firstName, token)
      
      if (!smtpStatus.sent) {
        console.error('❌ Failed to send email:', smtpStatus.error)
        return smtpStatus
      }

      console.log('✉️ Email sent, waiting for delivery...')
      // Wait a bit before checking IMAP to allow for email delivery
      await this.delay(VERIFICATION_CHECK_DELAY)

      // Connect to IMAP to monitor delivery
      console.log('🔄 Connecting to IMAP...')
      const connected = await this.imapService.connect()
      if (!connected) {
        console.error('❌ Failed to connect to IMAP')
        return {
          ...smtpStatus,
          delivered: false,
          error: 'Failed to connect to IMAP server for delivery monitoring'
        }
      }

      // Check verification status via IMAP
      console.log('🔍 Checking email delivery...')
      const imapStatus = await this.imapService.checkVerificationStatus(to, token)
      
      // Disconnect from IMAP
      await this.imapService.disconnect()

      console.log('📊 Verification status:', imapStatus)
      return {
        ...smtpStatus,
        ...imapStatus
      }
    } catch (error) {
      console.error('❌ Email verification error:', error)
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

  public async verifyConnection(): Promise<{
    smtp: boolean
    imap: boolean
  }> {
    console.log('🔄 Verifying email service connections...')
    const [smtpConnected, imapConnected] = await Promise.all([
      this.smtpService.verifyConnection(),
      this.imapService.connect()
    ])

    if (imapConnected) {
      await this.imapService.disconnect()
    }

    console.log('📊 Connection status:', { smtp: smtpConnected, imap: imapConnected })
    return {
      smtp: smtpConnected,
      imap: imapConnected
    }
  }
} 