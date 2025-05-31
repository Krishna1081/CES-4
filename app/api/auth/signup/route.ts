import { NextRequest, NextResponse } from 'next/server'
import { signUpSchema } from '@/lib/auth/schemas'
import { createUserWithOrganization, findUserByEmail } from '@/lib/db/auth-queries'
import { EmailService } from '@/lib/email/services/email.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signUpSchema.parse(body)
    
    // Check if user already exists
    const existingUser = await findUserByEmail(validatedData.email)
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }
    
    // Create user with organization
    const result = await createUserWithOrganization(validatedData)
    
    // Send verification email using the new email service
    try {
      const emailService = EmailService.getInstance()
      const emailStatus = await emailService.sendVerificationEmail(
        validatedData.email,
        validatedData.firstName,
        result.verificationToken
      )

      if (!emailStatus.sent) {
        console.error('Failed to send verification email:', emailStatus.error)
        // Don't fail the signup if email fails, user can resend later
      }
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail the signup if email fails, user can resend later
    }
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your account.',
    })
  } catch (error) {
    console.error('Signup error:', error)
    
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