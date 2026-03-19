'use client'

import React from 'react'
import { TEAM_COLORS, TEAM_SECONDARY_COLORS } from './f1-data'

interface TeamCarSilhouetteProps {
  teamId: string
  size?: number
  className?: string
}

export const TeamCarSilhouette: React.FC<TeamCarSilhouetteProps> = ({
  teamId,
  size = 120,
  className = '',
}) => {
  const primaryColor = TEAM_COLORS[teamId]
  const secondaryColor = TEAM_SECONDARY_COLORS[teamId]

  if (!primaryColor) {
    return <div className={className}>Unknown team: {teamId}</div>
  }

  const uniqueId = `car-${teamId}-${Math.random().toString(36).substr(2, 9)}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 120"
      className={className}
    >
      <defs>
        <linearGradient
          id={`${uniqueId}-body`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
          <stop offset="100%" stopColor={primaryColor} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient
          id={`${uniqueId}-wing`}
          x1="0%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor={secondaryColor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Rear wing upper element */}
      <ellipse
        cx="170"
        cy="25"
        rx="20"
        ry="12"
        fill={`url(#${uniqueId}-wing)`}
      />

      {/* Rear wing lower element */}
      <ellipse
        cx="170"
        cy="45"
        rx="22"
        ry="8"
        fill={`url(#${uniqueId}-wing)`}
      />

      {/* Main chassis body */}
      <ellipse
        cx="100"
        cy="55"
        rx="65"
        ry="30"
        fill={`url(#${uniqueId}-body)`}
      />

      {/* Cockpit opening */}
      <ellipse cx="90" cy="45" rx="28" ry="20" fill="#1a1a1a" opacity="0.7" />

      {/* Cockpit rim highlight */}
      <ellipse
        cx="90"
        cy="45"
        rx="28"
        ry="20"
        fill="none"
        stroke={secondaryColor}
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Left front wheel */}
      <circle cx="35" cy="70" r="15" fill="#333333" />
      <circle cx="35" cy="70" r="12" fill="#1a1a1a" />
      <circle cx="35" cy="70" r="8" fill="#999999" opacity="0.6" />

      {/* Right front wheel */}
      <circle cx="145" cy="70" r="15" fill="#333333" />
      <circle cx="145" cy="70" r="12" fill="#1a1a1a" />
      <circle cx="145" cy="70" r="8" fill="#999999" opacity="0.6" />

      {/* Left rear wheel (slightly forward) */}
      <circle cx="25" cy="75" r="16" fill="#333333" />
      <circle cx="25" cy="75" r="13" fill="#1a1a1a" />
      <circle cx="25" cy="75" r="9" fill="#999999" opacity="0.6" />

      {/* Right rear wheel */}
      <circle cx="175" cy="75" r="16" fill="#333333" />
      <circle cx="175" cy="75" r="13" fill="#1a1a1a" />
      <circle cx="175" cy="75" r="9" fill="#999999" opacity="0.6" />

      {/* Front wing - left element */}
      <ellipse cx="20" cy="55" rx="12" ry="16" fill={`url(#${uniqueId}-wing)`} />

      {/* Front wing - right element */}
      <ellipse cx="20" cy="40" rx="10" ry="12" fill={`url(#${uniqueId}-wing)`} />

      {/* Nose cone accent */}
      <ellipse cx="10" cy="52" rx="6" ry="12" fill={secondaryColor} opacity="0.8" />

      {/* Side pod accent */}
      <path
        d="M 80 50 L 120 50 L 125 65 L 75 65 Z"
        fill={secondaryColor}
        opacity="0.4"
      />

      {/* Halo protection bar */}
      <path
        d="M 70 35 Q 90 25 110 35 Q 95 40 90 42 Q 85 40 70 35 Z"
        fill={secondaryColor}
        opacity="0.6"
      />

      {/* Air intake detail */}
      <rect x="95" y="38" width="10" height="6" fill={secondaryColor} opacity="0.5" />

      {/* Engine cover detail */}
      <ellipse cx="125" cy="55" rx="8" ry="12" fill={secondaryColor} opacity="0.5" />
    </svg>
  )
}
