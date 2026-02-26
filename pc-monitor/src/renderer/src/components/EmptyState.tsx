// src/renderer/src/components/EmptyState.tsx
import { ReactNode } from 'react'

interface Props {
  icon: ReactNode
  message: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-4">
      <div className="text-slate-600">{icon}</div>
      <p className="text-slate-400 text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}