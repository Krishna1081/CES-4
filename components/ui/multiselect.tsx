import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface MultiSelectProps {
  options: MultiSelectOption[]
  value: (string | number)[]
  onChange: (value: (string | number)[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  selectAllLabel?: string
  removeAllLabel?: string
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  selectAllLabel = 'Select All',
  removeAllLabel = 'Remove All',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const allSelected = value.length === options.filter(o => !o.disabled).length

  function handleSelect(option: MultiSelectOption) {
    if (option.disabled) return
    if (value.includes(option.value)) {
      onChange(value.filter(v => v !== option.value))
    } else {
      onChange([...value, option.value])
    }
  }

  function handleSelectAll() {
    onChange(options.filter(o => !o.disabled).map(o => o.value))
  }

  function handleRemoveAll() {
    onChange([])
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-1">
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent border border-border transition-colors"
          onClick={handleRemoveAll}
          disabled={value.length === 0}
        >
          {removeAllLabel}
        </button>
        <button
          type="button"
          className="text-xs px-2 py-1 rounded bg-muted hover:bg-accent border border-border transition-colors"
          onClick={handleSelectAll}
          disabled={allSelected}
        >
          {selectAllLabel}
        </button>
      </div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className={cn(
              'flex min-h-[2.5rem] w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <div className="flex flex-wrap gap-1 flex-1">
              {value.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                options
                  .filter(o => value.includes(o.value))
                  .map(o => (
                    <span
                      key={o.value}
                      className="inline-flex items-center rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-medium shadow-sm mr-1 mb-1 border border-border"
                    >
                      {o.label}
                      <button
                        type="button"
                        className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                        tabIndex={-1}
                        onClick={e => {
                          e.stopPropagation()
                          onChange(value.filter(v => v !== o.value))
                        }}
                        aria-label={`Remove ${o.label}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
              )}
            </div>
            <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
          </button>
        </Popover.Trigger>
        <Popover.Content className="z-50 w-72 rounded-md border bg-popover p-2 shadow-md" align="start">
          <ul className="max-h-60 overflow-y-auto" role="listbox" aria-multiselectable="true">
            {options.map(option => (
              <li
                key={option.value}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 cursor-pointer select-none transition-colors',
                  value.includes(option.value)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium'
                    : 'hover:bg-accent',
                  option.disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-selected={value.includes(option.value)}
                aria-disabled={option.disabled}
                tabIndex={option.disabled ? -1 : 0}
                onClick={() => handleSelect(option)}
                onKeyDown={e => {
                  if ((e.key === ' ' || e.key === 'Enter') && !option.disabled) {
                    e.preventDefault()
                    handleSelect(option)
                  }
                }}
              >
                <span className="flex-1">{option.label}</span>
                {value.includes(option.value) && <Check className="h-4 w-4 text-blue-700 dark:text-blue-300" />}
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Root>
    </div>
  )
} 