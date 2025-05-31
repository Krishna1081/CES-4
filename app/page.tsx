import Link from 'next/link'
import { Button } from '@/components/ui/button'

function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Email Marketing
          <span className="text-blue-600"> Made Simple</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Build meaningful relationships with your customers through personalized email campaigns. 
          Connect your mailbox, verify your domain, and start sending in minutes.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild size="lg">
            <Link href="/sign-up">
              Get Started Free
            </Link>
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href="/sign-in">
              Sign In
            </Link>
          </Button>
        </div>
        
        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <span className="text-2xl">📧</span>
            </div>
            <h3 className="mt-4 font-semibold">Connect Mailbox</h3>
            <p className="mt-2 text-sm text-gray-600">
              Securely connect your Gmail or Outlook account
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <span className="text-2xl">🛡️</span>
            </div>
            <h3 className="mt-4 font-semibold">Verify Domain</h3>
            <p className="mt-2 text-sm text-gray-600">
              Ensure optimal deliverability with DNS validation
            </p>
          </div>
          
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="mt-4 font-semibold">Start Sending</h3>
            <p className="mt-2 text-sm text-gray-600">
              Launch campaigns with email warm-up protection
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HomePage 