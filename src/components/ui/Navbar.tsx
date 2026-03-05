'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { Flag, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

interface NavbarProps {
  displayName?: string
}

export function Navbar({ displayName }: NavbarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <nav className="bg-f1-black border-b border-f1-gray-dark sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 font-black tracking-tight">
          <Flag className="w-5 h-5 text-f1-red" />
          <span className="text-white">FANTASY<span className="text-f1-red">F1</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/dashboard"
            className={cn(
              'text-sm font-semibold transition-colors flex items-center gap-1.5',
              pathname === '/dashboard' ? 'text-f1-red' : 'text-f1-gray-light hover:text-white'
            )}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          {displayName && (
            <span className="text-f1-gray text-xs border border-f1-gray-dark rounded-full px-3 py-1">
              {displayName}
            </span>
          )}
          <form action={signOut}>
            <button type="submit" className="text-f1-gray hover:text-f1-red transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-f1-gray-light"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-f1-gray-dark bg-f1-black-light px-4 py-4 flex flex-col gap-4">
          <Link href="/dashboard" className="text-sm font-semibold text-white" onClick={() => setOpen(false)}>
            Dashboard
          </Link>
          {displayName && <span className="text-f1-gray text-xs">{displayName}</span>}
          <form action={signOut}>
            <button type="submit" className="text-f1-red text-sm font-semibold">
              Esci
            </button>
          </form>
        </div>
      )}
    </nav>
  )
}
