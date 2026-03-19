'use client'

import { signUp } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState<string>()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(undefined)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signUp(fd)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      } else if (result?.success) {
        setSuccess(result.success)
        toast.success('Registrazione completata!')
      }
    })
  }

  if (success) {
    return (
      <div className="bg-f1-black-light border border-f1-gray-dark rounded-2xl p-6 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="text-lg font-bold mb-2">Registrazione completata!</h2>
        <p className="text-f1-gray-light text-sm">{success}</p>
        <Link href="/login" className="block mt-4 bg-gradient-to-br from-f1-red to-f1-red-dark text-white font-bold py-2.5 px-6 rounded-xl hover:shadow-f1-glow transition-all">
          Accedi ora
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-f1-black-light border border-f1-gray-dark rounded-2xl p-6">
      <h2 className="text-lg font-bold mb-6">Crea account</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="display_name"
          name="display_name"
          type="text"
          label="Nome visualizzato"
          placeholder="Il tuo nome nella lega"
          required
          minLength={2}
          maxLength={30}
        />
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
          placeholder="Min. 6 caratteri"
          required
          minLength={6}
          autoComplete="new-password"
        />
        {error && (
          <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={pending} className="mt-2">
          Registrati
        </Button>
      </form>
      <p className="text-center text-f1-gray text-sm mt-4">
        Hai già un account?{' '}
        <Link href="/login" className="text-f1-red font-semibold hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  )
}
