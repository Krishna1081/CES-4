'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'
import { signUpSchema, type SignUpInput } from '@/lib/auth/schemas'
import { useForm } from '@/hooks/use-form'

interface SignupFormProps {
  onSuccess?: () => void
}

function SignupForm({ onSuccess }: SignupFormProps) {
  const router = useRouter()
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    data,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  } = useForm<SignUpInput>({
    schema: signUpSchema,
    onSubmit: async (formData) => {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed')
      }

      setIsSuccess(true)
      onSuccess?.()
    },
  })

  if (isSuccess) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We've sent a verification link to {data.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              if (data.email) {
                router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
              } else {
                router.push('/verify-email')
              }
            }}
          >
            Go to Verification
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start your email marketing journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                type="text"
                value={data.firstName || ''}
                onChange={(e) => handleChange('firstName', e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.firstName ? 'firstName-error' : undefined}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-red-600">
                  {errors.firstName}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                type="text"
                value={data.lastName || ''}
                onChange={(e) => handleChange('lastName', e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.lastName ? 'lastName-error' : undefined}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-red-600">
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={data.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isLoading}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              type="text"
              value={data.companyName || ''}
              onChange={(e) => handleChange('companyName', e.target.value)}
              disabled={isLoading}
              aria-describedby={errors.companyName ? 'companyName-error' : undefined}
              className={errors.companyName ? 'border-red-500' : ''}
            />
            {errors.companyName && (
              <p id="companyName-error" className="text-sm text-red-600">
                {errors.companyName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={data.password || ''}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={isLoading}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className={errors.password ? 'border-red-500' : ''}
            />
            {errors.password && (
              <p id="password-error" className="text-sm text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export { SignupForm } 