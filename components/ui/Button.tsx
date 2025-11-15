import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      iconPosition = 'left',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'font-medium transition-all duration-300 inline-flex items-center justify-center gap-2'
    
    const variantClasses = {
      primary: 'text-white bg-black hover:bg-black/90 disabled:bg-black/50 disabled:cursor-not-allowed shadow-sm hover:shadow-md',
      secondary: 'text-black/70 border border-black/20 hover:bg-black/5 hover:border-black/40 hover:text-black',
      outline: 'text-black/70 border border-black/10 hover:bg-black/5 hover:border-black/20',
      ghost: 'text-black/70 hover:bg-black/5 hover:text-black',
      danger: 'text-red-600 border border-red-200 hover:bg-red-50 hover:text-red-700',
    }
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-2.5 text-sm',
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`
    
    return (
      <button ref={ref} className={classes} {...props}>
        {icon && iconPosition === 'left' && icon}
        {children}
        {icon && iconPosition === 'right' && icon}
      </button>
    )
  }
)

Button.displayName = 'Button'

