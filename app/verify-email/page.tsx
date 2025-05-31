'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

type VerificationState = 'loading' | 'success' | 'error'

function VerifyEmailContent() {
  const [state, setState] = useState<VerificationState>('loading')
  const [message, setMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('No verification token provided')
      return
    }

    async function verifyEmail() {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        })

        const result = await response.json()

        if (response.ok) {
          setState('success')
          setMessage('Email verified successfully! You can now sign in.')
        } else {
          setState('error')
          setMessage(result.error || 'Verification failed')
        }
      } catch (error) {
        console.error('Verification error:', error)
        setState('error')
        setMessage('An unexpected error occurred')
      }
    }

    verifyEmail()
  }, [token])

  const handleContinue = () => {
    router.push('/sign-in')
  }

  const handleResendEmail = async () => {
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: searchParams.get('email') }),
      })

      const result = await response.json()

      if (response.ok) {
        setState('success')
        setMessage('Verification email sent successfully! Please check your inbox.')
      } else {
        setState('error')
        setMessage(result.error || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      setState('error')
      setMessage('An unexpected error occurred')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {state === 'loading' && (
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            )}
            {state === 'success' && (
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            )}
            {state === 'error' && (
              <div className="rounded-full bg-red-100 p-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            )}
          </div>
          
          <CardTitle>
            {state === 'loading' && 'Verifying your email...'}
            {state === 'success' && 'Email verified!'}
            {state === 'error' && 'Verification failed'}
          </CardTitle>
          
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {state === 'success' && (
            <Button onClick={handleContinue} className="w-full">
              Continue to Sign In
            </Button>
          )}
          
          {state === 'error' && (
            <div className="space-y-2">
              <Button
                onClick={handleResendEmail}
                variant="outline"
                className="w-full"
              >
                Resend verification email
              </Button>
              <Button
                onClick={() => router.push('/sign-up')}
                variant="ghost"
                className="w-full"
              >
                Back to Sign Up
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

export default VerifyEmailPage 