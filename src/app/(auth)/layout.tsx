export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-f1-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight">
            FANTASY<span className="text-f1-red">F1</span>
          </h1>
          <p className="text-f1-gray text-sm mt-1">Stagione 2026</p>
        </div>
        {children}
      </div>
    </div>
  )
}
