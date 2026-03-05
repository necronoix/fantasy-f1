'use client'

import { acceptTrade, rejectTrade } from '@/app/actions/trades'
import { Button } from '@/components/ui/Button'
import { useTransition } from 'react'
import toast from 'react-hot-toast'

export function TradeActions({ tradeId }: { tradeId: string }) {
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
      else toast.success('Scambio rifiutato')
    })
  }

  return (
    <div className="flex gap-2 mt-3 pt-3 border-t border-f1-gray-dark">
      <Button onClick={handleAccept} loading={pending} size="sm" className="flex-1">
        Accetta
      </Button>
      <Button onClick={handleReject} loading={pending} variant="secondary" size="sm" className="flex-1">
        Rifiuta
      </Button>
    </div>
  )
}
