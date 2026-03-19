'use client'

import { DriverHelmet } from './DriverHelmet'

interface DriverCardProps {
  driverId: string
  driverName: string
  driverShortName: string
  driverNumber: string | number
  teamName: string
  teamColor: string
  /** Optional price to show */
  price?: string | number
  /** Optional label for price area */
  priceLabel?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Whether selected/active */
  selected?: boolean
  /** Selection border color override */
  selectedColor?: string
  /** Optional badge text (top-right) */
  badge?: string
  /** Optional badge color */
  badgeColor?: string
  /** Click handler */
  onClick?: () => void
  /** Additional className */
  className?: string
  /** Children rendered at the bottom */
  children?: React.ReactNode
}

export function DriverCard({
  driverId,
  driverName,
  driverShortName,
  driverNumber,
  teamName,
  teamColor,
  price,
  priceLabel,
  size = 'md',
  selected = false,
  selectedColor,
  badge,
  badgeColor,
  onClick,
  className = '',
  children,
}: DriverCardProps) {
  // Split name into first + last
  const nameParts = driverName.split(' ')
  const firstName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : ''
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : driverName

  const helmetSize = size === 'lg' ? 80 : size === 'md' ? 56 : 36
  const isButton = !!onClick
  const Tag = isButton ? 'button' : 'div'

  const borderColor = selected ? (selectedColor ?? teamColor) : `${teamColor}50`
  const glowColor = selected ? teamColor : `${teamColor}30`

  return (
    <Tag
      type={isButton ? 'button' : undefined}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl transition-all duration-300 group text-left
        ${isButton ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${selected ? 'ring-2' : 'hover:ring-1'}
        ${className}
      `}
      style={{
        background: `linear-gradient(135deg, ${teamColor}18 0%, ${teamColor}08 40%, rgba(15,15,20,0.95) 100%)`,
        border: `2px solid ${borderColor}`,
        boxShadow: `0 0 ${selected ? '25px' : '12px'} ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`,
        ringColor: teamColor,
      }}
    >
      {/* Team color top stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${teamColor}, ${teamColor}80)` }}
      />

      {/* Content */}
      <div className={`relative ${size === 'lg' ? 'p-5' : size === 'md' ? 'p-4' : 'p-3'}`}>
        <div className="flex items-center gap-3">
          {/* Left side: Name + Team */}
          <div className="flex-1 min-w-0">
            {firstName && (
              <p className={`text-white/70 font-semibold uppercase tracking-wider leading-tight ${size === 'lg' ? 'text-sm' : size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
                {firstName}
              </p>
            )}
            <p className={`text-white font-black uppercase tracking-wide leading-tight ${size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-lg' : 'text-sm'}`}>
              {lastName}
            </p>
            <p
              className={`font-bold uppercase tracking-widest mt-0.5 ${size === 'lg' ? 'text-xs' : 'text-[10px]'}`}
              style={{ color: `${teamColor}cc` }}
            >
              {teamName}
            </p>

            {/* Driver number */}
            <p
              className={`font-black leading-none mt-1 ${size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-xl'}`}
              style={{ color: teamColor }}
            >
              {driverNumber}
            </p>
          </div>

          {/* Right side: Helmet */}
          <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
            <div
              className="rounded-lg p-1"
              style={{ background: `radial-gradient(circle, ${teamColor}20 0%, transparent 70%)` }}
            >
              <DriverHelmet driverId={driverId} size={helmetSize} />
            </div>
          </div>
        </div>

        {/* Price row */}
        {price !== undefined && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: `${teamColor}25` }}>
            <span className="text-f1-gray text-[10px] uppercase tracking-widest font-bold">
              {priceLabel ?? 'Prezzo'}
            </span>
            <span
              className="font-black text-sm px-3 py-1 rounded-lg"
              style={{
                color: teamColor,
                backgroundColor: `${teamColor}15`,
                border: `1px solid ${teamColor}30`,
              }}
            >
              {price} cr
            </span>
          </div>
        )}

        {/* Children (buttons, badges, etc) */}
        {children}
      </div>

      {/* Badge (top-right) */}
      {badge && (
        <div
          className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            backgroundColor: `${badgeColor ?? teamColor}30`,
            color: badgeColor ?? teamColor,
            border: `1px solid ${badgeColor ?? teamColor}50`,
          }}
        >
          {badge}
        </div>
      )}
    </Tag>
  )
}
