import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getUserWithOrganization } from '@/lib/db/auth-queries'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    const userWithOrg = await getUserWithOrganization(session.user.id)
    
    if (!userWithOrg) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      user: {
        id: userWithOrg.user.id,
        email: userWithOrg.user.email,
        firstName: userWithOrg.user.firstName,
        lastName: userWithOrg.user.lastName,
        emailVerified: userWithOrg.user.emailVerified,
      },
      organization: {
        id: userWithOrg.organization.id,
        name: userWithOrg.organization.name,
      },
    })
  } catch (error) {
    console.error('Auth me error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 