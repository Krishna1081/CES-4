'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'

interface DatePickerWithRangeProps {
  date?: DateRange
  onDateChange?: (date: DateRange | undefined) => void
  className?: string
}

export function DatePickerWithRange({
  date,
  onDateChange,
  className,
}: DatePickerWithRangeProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined
    onDateChange?.(newDate ? { from: newDate, to: date?.to } : undefined)
  }

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value ? new Date(e.target.value) : undefined
    onDateChange?.(date?.from ? { from: date.from, to: newDate } : undefined)
  }

  const formatDateForInput = (date: Date | undefined) => {
    return date ? format(date, 'yyyy-MM-dd') : ''
  }

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        className={cn(
          'w-[300px] justify-start text-left font-normal',
          !date && 'text-muted-foreground'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date?.from ? (
          date.to ? (
            <>
              {format(date.from, 'LLL dd, y')} -{' '}
              {format(date.to, 'LLL dd, y')}
            </>
          ) : (
            format(date.from, 'LLL dd, y')
          )
        ) : (
          <span>Pick a date range</span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white border rounded-md shadow-lg z-50 min-w-[300px]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">From</label>
              <Input
                type="date"
                value={formatDateForInput(date?.from)}
                onChange={handleFromDateChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">To</label>
              <Input
                type="date"
                value={formatDateForInput(date?.to)}
                onChange={handleToDateChange}
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => setIsOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 