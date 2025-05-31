'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { Loader2 } from 'lucide-react'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  emailVerified: boolean
}

interface Organization {
  id: number
  name: string
}

function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      // In a real app, this would check the session/JWT
      const response = await fetch('/api/auth/me')
      
      if (!response.ok) {
        throw new Error('Not authenticated')
      }

      const { user, organization } = await response.json()
      
      // Check if user's email is verified
      if (!user.emailVerified) {
        router.push('/verify-email')
        return
      }

      setUser(user)
      setOrganization(organization)
    } catch (error) {
      console.error('Failed to fetch user data:', error)
      setError('Failed to load user information')
      // Redirect to login if not authenticated
      router.push('/sign-in')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  if (!user || !organization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No user data found</p>
          <button
            onClick={() => router.push('/sign-in')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <OnboardingWizard
      user={{
        firstName: user.firstName,
        email: user.email,
      }}
      organization={{
        name: organization.name,
      }}
    />
  )
}

export default OnboardingPage 