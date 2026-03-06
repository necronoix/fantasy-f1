'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Gavel, Trophy, Users, ArrowLeftRight, CalendarDays, Settings } from 'lucide-react'

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
    { href: `${base}/gp`, label: 'GP', icon: CalendarDays, exact: false },
    { href: `${base}/standings`, label: 'Classifica', icon: Trophy, exact: false },
    { href: `${base}/trades`, label: 'Scambi', icon: ArrowLeftRight, exact: false },
    ...(isAdmin ? [{ href: `${base}/admin`, label: 'Admin', icon: Settings, exact: false }] : []),
  ]

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <div className="flex gap-0 min-w-max border-b border-f1-gray-dark">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : (pathname === href || pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 whitespace-nowrap',
                active
                  ? 'border-f1-red text-white'
                  : 'border-transparent text-f1-gray hover:text-f1-gray-light'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
