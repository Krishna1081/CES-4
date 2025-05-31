import { randomBytes } from 'crypto'

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex')
}

export function generateResetToken(): string {
  return randomBytes(32).toString('hex')
}

export function isTokenExpired(createdAt: Date, expiryHours = 24): boolean {
  const now = new Date()
  const expiry = new Date(createdAt.getTime() + expiryHours * 60 * 60 * 1000)
  return now > expiry
} 