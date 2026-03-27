'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Gavel, Trophy, Users, ArrowLeftRight, CalendarDays, Settings, BookOpen, Car } from 'lucide-react'

interface LeagueNavProps {
  leagueId: string
  isAdmin?: boolean
}

export function LeagueNav({ leagueId, isAdmin }: LeagueNavProps) {
  const pathname = usePathname()
  const base = `/league/${leagueId}`

  const links = [
    { href: base, label: 'Overview', icon: Users, exact: true },
    { href: `${base}/auction`, label: 'Asta', icon: Gavel, exact: false },
    { href: `${base}/roster`, label: 'Rosa', icon: CalendarDays, exact: false },
    { href: `${base}/teams`, label: 'Scuderie', icon: Car, exact: false },
    { href: `${base}/gp`, label: 'GP', icon: CalendarDays, exact: false },
    { href: `${base}/standings`, label: 'Classifica', icon: Trophy, exact: false },
    { href: `${base}/trades`, label: 'Scambi', icon: ArrowLeftRight, exact: false },
    { href: `${base}/rules`, label: 'Regole', icon: BookOpen, exact: false },
    ...(isAdmin ? [{ href: `${base}/admin`, label: 'Admin', icon: Settings, exact: false }] : []),
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-0 min-w-max border-b border-f1-gray-dark/50">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 border-b-2.5 whitespace-nowrap relative',
                active
                  ? 'border-f1-red text-white shadow-[0_-8px_16px_-4px_rgba(232,0,45,0.3)]'
                  : 'border-transparent text-f1-gray hover:text-f1-gray-light hover:border-f1-red/30'
              )}
            >
              <Icon className={cn('transition-all duration-300', active ? 'w-4 h-4' : 'w-3.5 h-3.5')} />
              {label}
              {active && (
                <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-gradient-to-r from-f1-red/0 via-f1-red to-f1-red/0" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
