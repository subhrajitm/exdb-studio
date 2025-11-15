import React from 'react'

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string
  variant?: 'default' | 'primary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  title?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'default',
  size = 'md',
  title,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  }
  
  const variantClasses = {
    default: 'hover:bg-black/10',
    primary: 'hover:bg-blue-100 text-blue-600 hover:text-blue-700',
    danger: 'hover:bg-red-100 text-red-600 hover:text-red-700',
    success: 'hover:bg-green-100 text-green-600 hover:text-green-700',
  }
  
  const iconSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }
  
  return (
    <button
      className={`transition-colors group ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={title}
      {...props}
    >
      <span className={`material-symbols-outlined ${iconSizeClasses[size]}`}>
        {icon}
      </span>
    </button>
  )
}

