'use client'

import { joinLeague } from '@/app/actions/league'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function JoinLeaguePage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await joinLeague(fd)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="max-w-sm mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-f1-gray hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </Link>
      <h1 className="text-2xl font-black mb-6">Entra in una lega</h1>
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="code"
            name="code"
            label="Codice lega"
            placeholder="XXXXXX"
            required
            maxLength={6}
            className="text-center text-2xl font-black tracking-[0.5em] uppercase"
          />
          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={pending}>
            Entra nella lega
          </Button>
        </form>
      </div>
    </div>
  )
}
