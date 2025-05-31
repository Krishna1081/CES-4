'use client'

import { CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  id: string
  title: string
  description: string
}

interface ProgressIndicatorProps {
  steps: Step[]
  currentStep: number
  completedSteps: number[]
}

function ProgressIndicator({ steps, currentStep, completedSteps }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            <div className="flex items-center">
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                  {
                    'border-green-500 bg-green-500 text-white': completedSteps.includes(index),
                    'border-blue-500 bg-blue-500 text-white': currentStep === index && !completedSteps.includes(index),
                    'border-gray-300 bg-gray-100 text-gray-500': currentStep !== index && !completedSteps.includes(index),
                  }
                )}
              >
                {completedSteps.includes(index) ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1 w-16 transition-colors sm:w-24',
                    {
                      'bg-green-500': completedSteps.includes(index),
                      'bg-blue-500': currentStep > index,
                      'bg-gray-200': currentStep <= index,
                    }
                  )}
                />
              )}
            </div>
            
            <div className="mt-2 text-center">
              <p
                className={cn(
                  'text-sm font-medium',
                  {
                    'text-green-600': completedSteps.includes(index),
                    'text-blue-600': currentStep === index,
                    'text-gray-500': currentStep !== index && !completedSteps.includes(index),
                  }
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-gray-500 hidden sm:block">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { ProgressIndicator } 