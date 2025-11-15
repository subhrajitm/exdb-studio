import React from 'react'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | React.ReactNode
  error?: string
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div>
        <label className="flex items-start cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={`mt-1 w-4 h-4 border-black/20 text-black focus:ring-black/20 ${className}`}
            {...props}
          />
          {label && (
            <span className="ml-2 text-xs text-black/60">{label}</span>
          )}
        </label>
        {error && (
          <p className="mt-1 text-xs text-red-700 ml-6">{error}</p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

