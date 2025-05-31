'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WelcomeScreen } from './welcome-screen'
import { ProgressIndicator } from './progress-indicator'
import { MailboxConnectionStep } from './mailbox-connection-step'
import { DnsValidationStep } from './dns-validation-step'
import { WarmupConfigStep } from './warmup-config-step'

interface OnboardingWizardProps {
  user: {
    firstName: string
    email: string
  }
  organization: {
    name: string
  }
}

type OnboardingStep = 'welcome' | 'mailbox' | 'dns' | 'warmup' | 'complete'

function OnboardingWizard({ user, organization }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [connectedDomain, setConnectedDomain] = useState('')

  const steps = [
    {
      id: 'mailbox',
      title: 'Connect Mailbox',
      description: 'Link your email account',
    },
    {
      id: 'dns',
      title: 'Verify Domain',
      description: 'Check DNS records',
    },
    {
      id: 'warmup',
      title: 'Configure Warm-up',
      description: 'Set sending limits',
    },
  ]

  const stepIndexMap: Record<OnboardingStep, number> = {
    welcome: -1,
    mailbox: 0,
    dns: 1,
    warmup: 2,
    complete: 3,
  }

  const handleWelcomeStart = () => {
    setCurrentStep('mailbox')
  }

  const handleMailboxNext = () => {
    // Mark mailbox connection as completed
    setCompletedSteps(prev => [...prev, 0])
    
    // Extract domain from user's email for DNS validation
    const domain = user.email.split('@')[1]
    setConnectedDomain(domain)
    
    setCurrentStep('dns')
  }

  const handleMailboxBack = () => {
    setCurrentStep('welcome')
  }

  const handleDnsNext = () => {
    // Mark DNS validation as completed
    setCompletedSteps(prev => [...prev, 1])
    setCurrentStep('warmup')
  }

  const handleDnsBack = () => {
    setCurrentStep('mailbox')
  }

  const handleWarmupNext = () => {
    // Mark warm-up configuration as completed
    setCompletedSteps(prev => [...prev, 2])
    
    // Complete onboarding and redirect to dashboard
    completeOnboarding()
  }

  const handleWarmupBack = () => {
    setCurrentStep('dns')
  }

  const completeOnboarding = async () => {
    try {
      // Mark onboarding as complete in the backend
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.email, // In real app, use user ID
          completedAt: new Date().toISOString(),
        }),
      })

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      // Still redirect to dashboard even if API call fails
      router.push('/dashboard')
    }
  }

  if (currentStep === 'welcome') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <WelcomeScreen firstName={user.firstName} onStart={handleWelcomeStart} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Setup Your Email Marketing Platform
          </h1>
          <p className="mt-2 text-gray-600">
            Welcome, {user.firstName}! Let's get {organization.name} ready to send campaigns.
          </p>
        </div>

        <ProgressIndicator
          steps={steps}
          currentStep={stepIndexMap[currentStep]}
          completedSteps={completedSteps}
        />

        <div className="mx-auto max-w-2xl">
          {currentStep === 'mailbox' && (
            <MailboxConnectionStep
              onNext={handleMailboxNext}
              onBack={handleMailboxBack}
            />
          )}

          {currentStep === 'dns' && (
            <DnsValidationStep
              domain={connectedDomain}
              onNext={handleDnsNext}
              onBack={handleDnsBack}
            />
          )}

          {currentStep === 'warmup' && (
            <WarmupConfigStep
              onNext={handleWarmupNext}
              onBack={handleWarmupBack}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export { OnboardingWizard } 