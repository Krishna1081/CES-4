'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CheckCircle, Info, Zap, TrendingUp, Shield } from 'lucide-react'

interface WarmupConfigStepProps {
  onNext: () => void
  onBack: () => void
}

type WarmupOption = 'enable' | 'skip'

function WarmupConfigStep({ onNext, onBack }: WarmupConfigStepProps) {
  const [selectedOption, setSelectedOption] = useState<WarmupOption>('enable')
  const [isConfiguring, setIsConfiguring] = useState(false)

  const warmupBenefits = [
    {
      icon: TrendingUp,
      title: 'Improved Deliverability',
      description: 'Gradually build sender reputation for better inbox placement',
    },
    {
      icon: Shield,
      title: 'Avoid Spam Filters',
      description: 'Prevent your emails from being marked as spam',
    },
    {
      icon: CheckCircle,
      title: 'Higher Engagement',
      description: 'Better engagement rates lead to improved sender score',
    },
  ]

  const handleConfigure = async () => {
    setIsConfiguring(true)
    
    try {
      if (selectedOption === 'enable') {
        // Configure warm-up settings
        const response = await fetch('/api/warmup/configure', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            enabled: true,
            dailyLimit: 20, // Start with 20 emails per day
            incrementPerDay: 5, // Increase by 5 emails per day
            maxDailyLimit: 200, // Cap at 200 emails per day
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to configure warm-up')
        }
      }
      
      // Simulate configuration delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onNext()
    } catch (error) {
      console.error('Warm-up configuration error:', error)
    } finally {
      setIsConfiguring(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Email Warm-up Configuration
        </CardTitle>
        <CardDescription>
          Email warm-up gradually increases your sending volume to build sender reputation 
          and improve deliverability.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>What is email warm-up?</strong> It's the process of gradually increasing 
            your email sending volume to establish a positive sender reputation with email 
            service providers like Gmail, Outlook, and others.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="font-medium">Benefits of Email Warm-up:</h3>
          <div className="grid gap-4">
            {warmupBenefits.map((benefit, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <benefit.icon className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{benefit.title}</h4>
                  <p className="text-sm text-gray-600">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium">Choose your approach:</h3>
          <RadioGroup
            value={selectedOption}
            onValueChange={(value) => setSelectedOption(value as WarmupOption)}
          >
            <div className="space-y-3">
              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="enable" id="enable" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="enable" className="font-medium cursor-pointer">
                    Enable Email Warm-up (Recommended)
                  </Label>
                  <div className="mt-2 space-y-2 text-sm text-gray-600">
                    <p>We'll automatically warm up your mailbox with these settings:</p>
                    <ul className="ml-4 space-y-1 list-disc">
                      <li>Start with 20 emails per day</li>
                      <li>Increase by 5 emails daily</li>
                      <li>Reach 200 emails per day in 6 weeks</li>
                      <li>Send to a mix of domains for better reputation</li>
                    </ul>
                  </div>
                  <div className="mt-3 rounded-lg bg-green-50 p-3">
                    <p className="text-sm text-green-800">
                      <strong>Best for:</strong> New domains or mailboxes that haven't sent 
                      marketing emails before.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-3 rounded-lg border p-4">
                <RadioGroupItem value="skip" id="skip" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="skip" className="font-medium cursor-pointer">
                    Skip Warm-up
                  </Label>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      Skip the warm-up process and start sending campaigns immediately.
                    </p>
                  </div>
                  <div className="mt-3 rounded-lg bg-yellow-50 p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Best for:</strong> Established domains with good sending history. 
                      Note: Higher risk of deliverability issues.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleConfigure}
            disabled={isConfiguring}
          >
            {isConfiguring ? (
              'Configuring...'
            ) : selectedOption === 'enable' ? (
              'Enable Warm-up & Continue'
            ) : (
              'Skip & Continue'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { WarmupConfigStep } 