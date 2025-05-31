'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react'

interface MailboxConnectionStepProps {
  onNext: () => void
  onBack: () => void
}

type Provider = 'google' | 'microsoft' | 'other'
type ConnectionState = 'idle' | 'connecting' | 'success' | 'error'

function MailboxConnectionStep({ onNext, onBack }: MailboxConnectionStepProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const providers = [
    {
      id: 'google' as Provider,
      name: 'Google Workspace',
      description: 'Gmail, Google Workspace accounts',
      icon: '🔍', // Using emoji for simplicity
      popular: true,
    },
    {
      id: 'microsoft' as Provider,
      name: 'Microsoft 365',
      description: 'Outlook, Office 365 accounts',
      icon: '📧',
      popular: true,
    },
    {
      id: 'other' as Provider,
      name: 'Other Provider',
      description: 'SMTP/IMAP configuration',
      icon: '⚙️',
      popular: false,
    },
  ]

  const handleConnect = async (provider: Provider) => {
    setSelectedProvider(provider)
    setConnectionState('connecting')
    setErrorMessage('')

    try {
      // Simulate OAuth flow
      if (provider === 'other') {
        // For 'other', skip to success for demo
        setTimeout(() => {
          setConnectionState('success')
        }, 2000)
        return
      }

      // Initiate OAuth flow
      const response = await fetch('/api/auth/oauth/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      })

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth flow')
      }

      const { authUrl } = await response.json()
      
      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      )

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.')
      }

      // Listen for OAuth completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed)
          // Check if connection was successful
          checkConnectionStatus()
        }
      }, 1000)

    } catch (error) {
      console.error('OAuth error:', error)
      setConnectionState('error')
      setErrorMessage(error instanceof Error ? error.message : 'Connection failed')
    }
  }

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/mailboxes/status')
      const { connected } = await response.json()
      
      if (connected) {
        setConnectionState('success')
      } else {
        setConnectionState('error')
        setErrorMessage('Connection was not completed successfully')
      }
    } catch (error) {
      setConnectionState('error')
      setErrorMessage('Failed to verify connection status')
    }
  }

  const handleNext = () => {
    if (connectionState === 'success') {
      onNext()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connect Your Mailbox
        </CardTitle>
        <CardDescription>
          Connect your email account to start sending campaigns. We support the most popular email providers.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {connectionState === 'success' ? (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Mailbox connected successfully!</strong> We've verified your connection and 
              you're ready to send emails.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <h3 className="font-medium">Choose your email provider:</h3>
            <div className="grid gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleConnect(provider.id)}
                  disabled={connectionState === 'connecting'}
                  className={`flex items-center space-x-3 rounded-lg border p-4 text-left transition-colors hover:bg-gray-50 disabled:opacity-50 ${
                    selectedProvider === provider.id && connectionState === 'connecting'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="text-2xl">{provider.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{provider.name}</span>
                      {provider.popular && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{provider.description}</p>
                  </div>
                  {selectedProvider === provider.id && connectionState === 'connecting' && (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  )}
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {connectionState === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Connection failed:</strong> {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={connectionState !== 'success'}
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export { MailboxConnectionStep } 