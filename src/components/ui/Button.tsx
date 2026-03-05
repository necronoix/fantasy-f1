import { cn } from '@/lib/utils'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
          {
            'bg-f1-red hover:bg-f1-red-dark text-white': variant === 'primary',
            'border border-f1-gray-mid hover:border-f1-red text-white bg-transparent': variant === 'secondary',
            'text-f1-gray-light hover:text-white bg-transparent': variant === 'ghost',
            'bg-red-800 hover:bg-red-900 text-white': variant === 'danger',
            'px-3 py-1.5 text-xs': size === 'sm',
            'px-4 py-2.5 text-sm': size === 'md',
            'px-6 py-3.5 text-base': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
