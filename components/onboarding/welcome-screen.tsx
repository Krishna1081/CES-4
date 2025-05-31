'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, Shield, Zap } from 'lucide-react'

interface WelcomeScreenProps {
  firstName: string
  onStart: () => void
}

function WelcomeScreen({ firstName, onStart }: WelcomeScreenProps) {
  const features = [
    {
      icon: Mail,
      title: 'Connect Your Mailbox',
      description: 'Securely connect your email account to start sending campaigns',
    },
    {
      icon: Shield,
      title: 'Verify Your Domain',
      description: 'Ensure optimal deliverability with proper DNS configuration',
    },
    {
      icon: Zap,
      title: 'Email Warm-up',
      description: 'Gradually increase your sending volume for better reputation',
    },
  ]

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">
            Welcome to Email Marketing Platform, {firstName}!
          </CardTitle>
          <CardDescription className="text-lg">
            Let's get you set up and ready to send your first campaign
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">What we'll set up together:</h3>
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <feature.icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{feature.title}</h4>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>This setup takes about 5 minutes</strong> and ensures your emails 
              reach the inbox, not the spam folder.
            </p>
          </div>
          
          <Button onClick={onStart} className="w-full" size="lg">
            Let's Get Started
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export { WelcomeScreen } 