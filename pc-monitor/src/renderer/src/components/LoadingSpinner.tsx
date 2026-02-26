// src/renderer/src/components/LoadingSpinner.tsx
import { Loader } from 'lucide-react'

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3">
      <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      <span className="text-sm text-slate-400">Loading…</span>
    </div>
  )
}