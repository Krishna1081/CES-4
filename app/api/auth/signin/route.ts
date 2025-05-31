import { NextRequest, NextResponse } from 'next/server'
import { signInSchema } from '@/lib/auth/schemas'
import { findUserByEmail, getUserWithOrganization } from '@/lib/db/auth-queries'
import { comparePasswords, setSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signInSchema.parse(body)
    const { email, password } = validatedData
    
    // Find user by email
    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before signing in' },
        { status: 401 }
      )
    }
    
    // Verify password
    const isPasswordValid = await comparePasswords(password, user.passwordHash)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }
    
    // Update last login time
    await updateLastLogin(user.id)
    
    // Get user with organization data
    const userWithOrg = await getUserWithOrganization(user.id)
    
    // Set session
    await setSession(user)
    
    // Determine if user needs onboarding
    // For now, we'll assume users need onboarding if they haven't logged in before
    const needsOnboarding = !user.lastLoginAt
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: userWithOrg?.organization,
      needsOnboarding,
    })
  } catch (error) {
    console.error('Sign in error:', error)
    
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

async function updateLastLogin(userId: number) {
  try {
    const { db } = await import('@/lib/db/drizzle')
    const { users } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    
    await db
      .update(users)
      .set({
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  } catch (error) {
    console.error('Failed to update last login:', error)
    // Don't fail signin if this fails
  }
} 