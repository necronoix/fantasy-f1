'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="w-full flex items-center justify-between bg-f1-gray-dark hover:bg-f1-gray-mid rounded-lg px-4 py-3 transition-colors group"
    >
      <span className="text-2xl font-black tracking-[0.3em] text-white">{code}</span>
      {copied
        ? <Check className="w-5 h-5 text-green-400" />
        : <Copy className="w-5 h-5 text-f1-gray group-hover:text-white transition-colors" />
      }
    </button>
  )
}
