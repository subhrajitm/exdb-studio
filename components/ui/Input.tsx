import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={props.id} className="block text-xs font-medium text-black/70 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${fullWidth ? 'w-full' : ''} px-4 py-2.5 text-sm border ${
            error ? 'border-red-300' : 'border-black/10'
          } bg-white focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black/20 transition-all duration-300 ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-700">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-black/50">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

