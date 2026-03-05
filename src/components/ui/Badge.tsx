import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'red' | 'green' | 'yellow' | 'gray'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
        {
          'bg-f1-gray-dark text-f1-gray-light': variant === 'default',
          'bg-f1-red/20 text-f1-red': variant === 'red',
          'bg-green-900/40 text-green-400': variant === 'green',
          'bg-yellow-900/40 text-yellow-400': variant === 'yellow',
          'bg-f1-gray-dark text-f1-gray': variant === 'gray',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
