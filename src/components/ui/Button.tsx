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
          'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 cubic-bezier(0.4, 0, 0.2, 1) disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider',
          {
            'bg-gradient-to-br from-f1-red to-f1-red-dark hover:from-f1-red-dark hover:to-f1-red-dark text-white shadow-lg hover:shadow-f1-glow transform hover:scale-105 active:scale-95': variant === 'primary',
            'border-2 border-f1-red text-f1-red hover:bg-f1-red/10 hover:shadow-f1-glow-sm bg-transparent backdrop-blur-sm': variant === 'secondary',
            'text-f1-gray-light hover:text-white hover:bg-white/5 bg-transparent': variant === 'ghost',
            'bg-gradient-to-br from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white shadow-lg hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]': variant === 'danger',
            'px-3 py-1.5 text-xs gap-1.5': size === 'sm',
            'px-5 py-2.5 text-sm gap-2': size === 'md',
            'px-7 py-3.5 text-base gap-2': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-f1-red rounded-full animate-spin spinner-f1" />
            {children}
          </span>
        ) : children}
      </button>
    )
  }
)
Button.displayName = 'Button'
