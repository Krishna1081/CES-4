import { useState, useCallback } from 'react'
import { z, ZodSchema } from 'zod'

interface UseFormOptions<T> {
  schema: ZodSchema<T>
  onSubmit: (data: T) => Promise<void>
  initialData?: Partial<T>
}

interface UseFormReturn<T> {
  data: Partial<T>
  errors: Partial<Record<keyof T, string>>
  isLoading: boolean
  handleChange: (field: keyof T, value: string) => void
  handleSubmit: () => Promise<void>
  reset: () => void
}

export function useForm<T extends Record<string, unknown>>({
  schema,
  onSubmit,
  initialData = {},
}: UseFormOptions<T>): UseFormReturn<T> {
  const [data, setData] = useState<Partial<T>>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = useCallback((field: keyof T, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }, [errors])

  const handleSubmit = useCallback(async () => {
    try {
      setIsLoading(true)
      setErrors({})

      // Validate data
      const validatedData = schema.parse(data)
      
      // Call onSubmit with validated data
      await onSubmit(validatedData)
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Partial<Record<keyof T, string>> = {}
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            const field = err.path[0] as keyof T
            fieldErrors[field] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        // Handle submission errors
        console.error('Form submission error:', error)
        throw error
      }
    } finally {
      setIsLoading(false)
    }
  }, [data, schema, onSubmit])

  const reset = useCallback(() => {
    setData(initialData)
    setErrors({})
    setIsLoading(false)
  }, [initialData])

  return {
    data,
    errors,
    isLoading,
    handleChange,
    handleSubmit,
    reset,
  }
} 