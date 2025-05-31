'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { signInSchema, type SignInInput } from '@/lib/auth/schemas'
import { useForm } from '@/hooks/use-form'

interface SigninFormProps {
  onSuccess?: () => void
}

function SigninForm({ onSuccess }: SigninFormProps) {
  const router = useRouter()

  const {
    data,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
  } = useForm<SignInInput>({
    schema: signInSchema,
    onSubmit: async (formData) => {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Sign in failed')
      }

      // Redirect to dashboard or onboarding based on user state
      if (result.needsOnboarding) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
      
      onSuccess?.()
    },
  })

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }} className="space-y-4">
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
              placeholder="Enter your email"
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-600">
                {errors.email}
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
              placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </Button>

          <div className="text-center text-sm">
            Don't have an account?{' '}
            <Link href="/sign-up" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </div>

          <div className="text-center text-sm">
            <Link href="/forgot-password" className="text-gray-600 hover:underline">
              Forgot your password?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export { SigninForm } 