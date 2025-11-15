'use client'

import React, { useState } from 'react'
import { Input, InputProps } from './Input'

export interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)
    
    return (
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`${showToggle ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/70 transition-colors"
            tabIndex={-1}
          >
            <span className="material-symbols-outlined text-lg">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

