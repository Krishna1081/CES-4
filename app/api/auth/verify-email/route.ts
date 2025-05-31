import { NextRequest, NextResponse } from 'next/server'
import { verifyEmailSchema } from '@/lib/auth/schemas'
import { verifyUserEmail } from '@/lib/db/auth-queries'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const { token } = verifyEmailSchema.parse(body)
    
    // Verify the email
    await verifyUserEmail(token)
    
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    })
  } catch (error) {
    console.error('Email verification error:', error)
    
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