'use client'

import { acceptTrade, rejectTrade } from '@/app/actions/trades'
import { Button } from '@/components/ui/Button'
import { useTransition } from 'react'
import toast from 'react-hot-toast'

interface Props {
  tradeId: string
  isProposer?: boolean
}

export function TradeActions({ tradeId, isProposer }: Props) {
  const [pending, startTransition] = useTransition()

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptTrade(tradeId)
      if (result?.error) toast.error(result.error)
      else toast.success('Scambio accettato!')
    })
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectTrade(tradeId)
      if (result?.error) toast.error(result.error)
      else toast.success(isProposer ? 'Proposta ritirata' : 'Scambio rifiutato')
    })
  }

  if (isProposer) {
    return (
      <div className="mt-3 pt-3 border-t border-f1-gray-dark/50">
        <Button onClick={handleReject} loading={pending} variant="ghost" size="sm" className="w-full text-f1-gray hover:text-red-400">
          Ritira proposta
        </Button>
      </div>
    )
  }

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-yellow-500/30">
      <Button onClick={handleAccept} loading={pending} size="sm" className="flex-1">
        Accetta
      </Button>
      <Button onClick={handleReject} loading={pending} variant="secondary" size="sm" className="flex-1">
        Rifiuta
      </Button>
    </div>
  )
}
