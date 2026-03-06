'use client'

interface DriverCardProps {
  name: string
  shortName: string
  number: number
  teamName: string
  teamColor: string
  photoUrl?: string | null
  helmetUrl?: string | null
  price?: number
  acquired_via?: string
  compact?: boolean
  className?: string
}

export function DriverCard({
  name,
  shortName,
  number,
  teamName,
  teamColor,
  photoUrl,
  helmetUrl,
  price,
  compact = false,
  className = '',
}: DriverCardProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 bg-f1-gray-dark rounded-lg relative overflow-hidden ${className}`}>
        {/* Team color stripe */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg" style={{ backgroundColor: teamColor }} />
        <div className="ml-2 w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-f1-black-light relative">
          {helmetUrl ? (
            <img
              src={helmetUrl}
              alt={`${name} helmet`}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-black text-f1-gray">
              {shortName}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-bold truncate leading-tight">{name}</p>
          <p className="text-f1-gray text-[10px] leading-tight">{shortName} · #{number}</p>
        </div>
        {price !== undefined && (
          <span className="text-f1-red text-xs font-black flex-shrink-0">{price}cr</span>
        )}
      </div>
    )
  }

  return (
    <div className={`relative flex items-center gap-4 p-4 rounded-xl border border-f1-gray-dark hover:border-opacity-60 transition-all overflow-hidden bg-f1-black-light ${className}`}
      style={{ borderColor: `${teamColor}40` }}
    >
      {/* Gradient background from team color */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${teamColor} 0%, transparent 60%)` }}
      />

      {/* Driver photo */}
      <div className="relative w-20 h-20 flex-shrink-0">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-contain object-bottom"
            onError={(e) => {
              const el = e.target as HTMLImageElement
              el.style.display = 'none'
              if (el.nextElementSibling) (el.nextElementSibling as HTMLElement).style.display = 'flex'
            }}
          />
        ) : null}
        {/* Fallback avatar */}
        <div
          className={`${photoUrl ? 'hidden' : 'flex'} w-full h-full rounded-full items-center justify-center text-2xl font-black`}
          style={{ backgroundColor: `${teamColor}30`, color: teamColor }}
        >
          {shortName}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-4xl font-black opacity-20 absolute right-3 top-3 select-none"
            style={{ color: teamColor }}>
            {number}
          </span>
          {helmetUrl && (
            <img
              src={helmetUrl}
              alt="helmet"
              className="w-6 h-6 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <span className="text-xs font-bold tracking-widest text-f1-gray uppercase">{shortName}</span>
        </div>
        <p className="text-white font-black text-lg leading-tight">{name}</p>
        <p className="text-f1-gray text-xs mt-0.5">{teamName}</p>
      </div>

      {/* Team color bar */}
      <div className="absolute right-0 top-0 bottom-0 w-1 rounded-r-xl" style={{ backgroundColor: teamColor }} />

      {/* Price badge */}
      {price !== undefined && (
        <div className="absolute top-3 right-4 text-right">
          <span className="text-f1-red font-black text-lg">{price}</span>
          <span className="text-f1-gray text-xs"> cr</span>
        </div>
      )}
    </div>
  )
}
