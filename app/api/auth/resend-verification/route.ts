import { NextRequest, NextResponse } from 'next/server'
import { resendVerificationSchema } from '@/lib/auth/schemas'
import { findUserByEmail } from '@/lib/db/auth-queries'
import { EmailService } from '@/lib/email/services/email.service'
import { db } from '@/lib/db/drizzle'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const { email } = resendVerificationSchema.parse(body)
    
    // Find user
    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      )
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate new verification token
    const verificationToken = crypto.randomUUID()
    
    // Update user with new token
    await db
      .update(users)
      .set({
        emailVerificationToken: verificationToken,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))

    // Send verification email using the new email service
    const emailService = EmailService.getInstance()
    const emailStatus = await emailService.sendVerificationEmail(
      user.email,
      user.firstName || 'User', // Provide a default value if firstName is null
      verificationToken
    )

    if (!emailStatus.sent) {
      console.error('Failed to send verification email:', emailStatus.error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })
  } catch (error) {
    console.error('Resend verification error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 