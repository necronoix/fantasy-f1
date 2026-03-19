import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-f1-black flex items-center justify-center px-4 relative overflow-hidden">
      {/* Watermark background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/ff1-watermark.svg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 200px',
          opacity: 0.5,
        }}
      />
      {/* Red glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(232,0,45,0.08) 0%, transparent 70%)' }}
      />
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <Image
            src="/ff1-logo.svg"
            alt="Fantasy F1"
            width={320}
            height={160}
            priority
            className="mx-auto w-[260px] h-auto drop-shadow-[0_0_20px_rgba(232,0,45,0.2)]"
          />
        </div>
        {children}
      </div>
    </div>
  )
}
