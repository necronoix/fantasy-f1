import { cn } from '@/lib/utils'
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-f1-gray-light uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            'w-full bg-f1-gray-dark border rounded-lg px-4 py-3 text-white placeholder-f1-gray text-sm',
            'focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-transparent',
            'transition-all duration-150',
            error ? 'border-red-500' : 'border-f1-gray-mid',
            className
          )}
          {...props}
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
