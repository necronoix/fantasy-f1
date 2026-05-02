import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow, format, isPast, subHours, subMinutes } from 'date-fns'
import { it } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy', { locale: it })
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: it })
}

export function timeFromNow(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: it })
}

export function isLocked(dateStr: string | undefined): boolean {
  if (!dateStr) return false
  return isPast(new Date(dateStr))
}

/**
 * Check if predictions are locked.
 * Uses admin deadline (10 min before) if set, otherwise falls back to qualifying time (1h before).
 */
export function isPredictionLocked(
  qualifyingDatetime: string | undefined | null,
  adminDeadline?: string | null
): boolean {
  // If admin set a deadline, lock 10 minutes before it
  if (adminDeadline) {
    const lockTime = subMinutes(new Date(adminDeadline), 10)
    return isPast(lockTime)
  }
  // Fallback: lock 1 hour before qualifying (only if no admin deadline)
  if (!qualifyingDatetime) return false
  const lockTime = subHours(new Date(qualifyingDatetime), 1)
  return isPast(lockTime)
}

export function getPredictionLockTime(
  qualifyingDatetime: string | undefined | null,
  adminDeadline?: string | null
): Date | null {
  if (adminDeadline) {
    return subMinutes(new Date(adminDeadline), 10)
  }
  if (!qualifyingDatetime) return null
  return subHours(new Date(qualifyingDatetime), 1)
}

export function getTimerSeconds(endsAt: string): number {
  const diff = new Date(endsAt).getTime() - Date.now()
  return Math.max(0, Math.floor(diff / 1000))
}

export function formatCredits(amount: number): string {
  return `${amount}cr`
}

export function getPositionSuffix(pos: number): string {
  if (pos === 1) return '1°'
  if (pos === 2) return '2°'
  if (pos === 3) return '3°'
  return `${pos}°`
}

export function generateLeagueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getTradesMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const DEFAULT_SCORING_RULES = {
  qualifying: {
    '1': 10, '2': 9, '3': 8, '4': 7, '5': 6,
    '6': 5, '7': 4, '8': 3, '9': 2, '10': 1,
  },
  race: {
    '1': 25, '2': 18, '3': 15, '4': 12, '5': 10,
    '6': 8, '7': 6, '8': 4, '9': 2, '10': 1,
  },
  // Sprint rimosso dalla stagione 2026
  sprint: undefined,
  fastest_lap: 5,
  dnf: -10,
  dsq: -15,
  dnc: 0, // DNC: nessun malus — il pilota in panchina lo sostituisce
  penalty_per_position: -1,
  positions_gained_bonus: 1, // +1 pt per ogni posizione guadagnata (qualifica → gara)
  captain_multiplier: 2,
  predictions: {
    pole: 5,
    winner: 5,
    fastest_lap: 3,
    safety_car: 3,
    podium_each: 2,
  },
}

export function validateTrade(
  proposerCreditsLeft: number,
  accepterCreditsLeft: number,
  creditAdjustment: number
): { valid: boolean; error?: string } {
  if (creditAdjustment > 0 && proposerCreditsLeft < creditAdjustment) {
    return { valid: false, error: 'Crediti insufficienti per il conguaglio' }
  }
  if (creditAdjustment < 0 && accepterCreditsLeft < Math.abs(creditAdjustment)) {
    return { valid: false, error: 'Crediti insufficienti (controparte)' }
  }
  return { valid: true }
}
