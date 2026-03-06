'use client'

import { signIn } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(fd)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="bg-f1-black-light border border-f1-gray-dark rounded-2xl p-6">
      <h2 className="text-lg font-bold mb-6">Accedi</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email"
          placeholder="la@tua.email"
          required
          autoComplete="email"
        />
        <Input
          id="password"
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
        {error && (
          <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending} className="mt-2">
          Accedi
        </Button>
      </form>
      <p className="text-center text-f1-gray text-sm mt-4">
        Non hai un account?{' '}
        <Link href="/signup" className="text-f1-red font-semibold hover:underline">
          Registrati
        </Link>
      </p>
    </div>
  )
}
