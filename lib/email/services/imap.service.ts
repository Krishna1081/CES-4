import Imap from 'node-imap'
import { simpleParser } from 'mailparser'
import { getIMAPConfig } from '../config/imap'
import type { EmailVerificationStatus } from '../config/types'
import type { ImapMessage, ImapMessageBodyInfo } from 'node-imap'
import type { ParsedMail } from 'mailparser'
import type { Readable } from 'stream'

export class IMAPService {
  private imap: Imap | null = null
  private static instance: IMAPService
  private isConnected: boolean = false
  private connectionPromise: Promise<boolean> | null = null

  private constructor() {
    try {
      console.log('🔄 Initializing IMAP service...')
      const config = getIMAPConfig()
      this.imap = new Imap({
        user: config.auth.user,
        password: config.auth.pass,
        host: config.host,
        port: config.port,
        tls: true,
        tlsOptions: { rejectUnauthorized: config.tls.rejectUnauthorized },
        debug: (info) => {
          console.log('🔍 IMAP Debug:', info)
        }
      })

      this.setupEventHandlers()
      console.log('✅ IMAP service initialized')
    } catch (error) {
      console.error('❌ Failed to initialize IMAP service:', error)
      this.imap = null
    }
  }

  private setupEventHandlers() {
    if (!this.imap) return

    this.imap.on('ready', () => {
      console.log('✅ IMAP connection established')
      this.isConnected = true
    })

    this.imap.on('error', (error: Error) => {
      console.error('❌ IMAP error:', error)
      this.isConnected = false
      this.connectionPromise = null
    })

    this.imap.on('end', () => {
      console.log('👋 IMAP connection ended')
      this.isConnected = false
      this.connectionPromise = null
    })
  }

  public static getInstance(): IMAPService {
    if (!IMAPService.instance) {
      IMAPService.instance = new IMAPService()
    }
    return IMAPService.instance
  }

  public async connect(): Promise<boolean> {
    if (!this.imap) {
      console.error('❌ IMAP service not initialized')
      throw new Error('IMAP service not initialized')
    }

    if (this.isConnected) {
      console.log('ℹ️ IMAP already connected')
      return true
    }

    // If a connection attempt is already in progress, return that promise
    if (this.connectionPromise) {
      console.log('ℹ️ IMAP connection already in progress')
      return this.connectionPromise
    }

    this.connectionPromise = new Promise((resolve) => {
      console.log('🔄 Attempting IMAP connection...')
      
      // Set a connection timeout
      const timeout = setTimeout(() => {
        console.error('❌ IMAP connection timeout')
        this.isConnected = false
        this.connectionPromise = null
        resolve(false)
      }, 30000) // 30 seconds timeout

      this.imap!.once('ready', () => {
        console.log('✅ IMAP connection ready')
        clearTimeout(timeout)
        this.isConnected = true
        this.connectionPromise = null
        resolve(true)
      })

      this.imap!.once('error', (error) => {
        console.error('❌ IMAP connection error:', error)
        clearTimeout(timeout)
        this.isConnected = false
        this.connectionPromise = null
        resolve(false)
      })

      try {
        this.imap!.connect()
      } catch (error) {
        console.error('❌ IMAP connect error:', error)
        clearTimeout(timeout)
        this.isConnected = false
        this.connectionPromise = null
        resolve(false)
      }
    })

    return this.connectionPromise
  }

  public async checkVerificationStatus(
    email: string,
    token: string
  ): Promise<EmailVerificationStatus> {
    if (!this.imap || !this.isConnected) {
      console.error('❌ IMAP service not connected')
      throw new Error('IMAP service not connected')
    }

    return new Promise((resolve, reject) => {
      console.log('🔄 Opening INBOX...')
      this.imap!.openBox('INBOX', false, (err: Error | null, box: Imap.Box) => {
        if (err) {
          console.error('❌ Error opening INBOX:', err)
          reject(err)
          return
        }

        console.log('📬 INBOX opened successfully')
        const searchCriteria = [
          ['FROM', process.env.SMTP_FROM || ''],
          ['SUBJECT', 'Welcome aboard, QuickIntell!'],
          ['SINCE', new Date(Date.now() - 24 * 60 * 60 * 1000)]
        ]

        console.log('🔍 Searching for verification email...')
        this.imap!.search(searchCriteria, (err: Error | null, results: number[]) => {
          if (err) {
            console.error('❌ Search error:', err)
            reject(err)
            return
          }

          if (results.length === 0) {
            console.log('ℹ️ No matching emails found')
            resolve({
              sent: true,
              delivered: false,
              verified: false,
              lastAttempt: new Date(),
              attempts: 1
            })
            return
          }

          console.log(`📨 Found ${results.length} matching emails`)
          const fetch = this.imap!.fetch(results, { bodies: '' })
          let found = false

          fetch.on('message', (msg: ImapMessage) => {
            msg.on('body', (stream: Readable, info: ImapMessageBodyInfo) => {
              simpleParser(stream, async (err: Error | null, parsed: ParsedMail) => {
                if (err) {
                  console.error('❌ Error parsing email:', err)
                  return
                }

                const html = parsed.html || ''
                if (html.includes(token)) {
                  console.log('✅ Verification token found in email')
                  found = true
                  resolve({
                    sent: true,
                    delivered: true,
                    verified: true,
                    lastAttempt: new Date(),
                    attempts: 1
                  })
                }
              })
            })
          })

          fetch.once('error', (err: Error) => {
            console.error('❌ Fetch error:', err)
            reject(err)
          })

          fetch.once('end', () => {
            if (!found) {
              console.log('ℹ️ Verification token not found in emails')
              resolve({
                sent: true,
                delivered: true,
                verified: false,
                lastAttempt: new Date(),
                attempts: 1
              })
            }
          })
        })
      })
    })
  }

  public async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      console.log('👋 Disconnecting from IMAP...')
      this.imap.end()
      this.isConnected = false
      this.connectionPromise = null
    }
  }
} 