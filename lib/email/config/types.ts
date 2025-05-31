export interface SMTPConfig {
  host: string
  port: number
  secure: boolean | 'auto'
  auth: {
    user: string
    pass: string
  }
  from: string
}

export interface IMAPConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  tls: {
    rejectUnauthorized: boolean
  }
}

export interface EmailConfig {
  smtp: SMTPConfig
  imap: IMAPConfig
}

export interface EmailVerificationStatus {
  sent: boolean
  delivered: boolean
  verified: boolean
  lastAttempt: Date | null
  attempts: number
  error?: string
} 