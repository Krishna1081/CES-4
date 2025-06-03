'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DNSValidationButtonProps {
  onValidate: () => Promise<void>
  isValidating: boolean
  lastValidated?: Date
}

export function DNSValidationButton({
  onValidate,
  isValidating,
  lastValidated,
}: DNSValidationButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleValidate = async () => {
    try {
      await onValidate()
      setIsOpen(false)
    } catch (error) {
      console.error('Error validating DNS:', error)
      toast.error('Failed to validate DNS records')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handleValidate}
        disabled={isValidating}
      >
        {isValidating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Validating...
          </>
        ) : (
          <>
            <Icon icon={CheckCircle2} className="h-4 w-4 mr-2" />
            Validate DNS
          </>
        )}
      </Button>
      {lastValidated && (
        <span className="text-sm text-muted-foreground">
          Last validated: {new Date(lastValidated).toLocaleString()}
        </span>
      )}
    </div>
  )
} 