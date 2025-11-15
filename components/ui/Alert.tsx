import React from 'react'

export interface AlertProps {
  variant?: 'error' | 'success' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  className?: string
  onClose?: () => void
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
  onClose,
}) => {
  const variantClasses = {
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }
  
  const iconMap = {
    error: 'error',
    success: 'check_circle',
    warning: 'warning',
    info: 'info',
  }
  
  return (
    <div className={`p-3 border ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-base">{iconMap[variant]}</span>
        <div className="flex-1">
          {title && (
            <p className="text-xs font-semibold mb-1">{title}</p>
          )}
          <p className="text-xs">{children}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current opacity-60 hover:opacity-100 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  )
}

