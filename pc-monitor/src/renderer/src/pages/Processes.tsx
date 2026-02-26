// src/renderer/src/pages/Processes.tsx
import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Activity, Search, ArrowUp, ArrowDown } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import { ProcessMetric } from '../types'

type SortKey = 'cpu' | 'mem' | 'pid' | 'name'
type SortDir = 'asc' | 'desc'

function usageColor(value: number, threshold1 = 25, threshold2 = 50): string {
  if (value >= threshold2) return 'text-red-400'
  if (value >= threshold1) return 'text-yellow-400'
  return 'text-slate-300'
}

export default function Processes() {
  const [processes, setProcesses] = useState<ProcessMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpu')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchProcesses = async () => {
    setLoading(true)
    try {
      const data = await window.electron.getProcesses()
      setProcesses(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProcesses()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchProcesses, 5000)
    return () => clearInterval(id)
  }, [autoRefresh])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const filtered = processes.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    )
    return [...filtered].sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number)
      return sortDir === 'desc' ? -cmp : cmp
    })
  }, [processes, search, sortKey, sortDir])

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return null
    return sortDir === 'desc' ? (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    )
  }

  return (
    <div className="space-y-5 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Processes</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="accent-blue-500"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={fetchProcesses}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-sm rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by name…"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Table */}
      {loading && processes.length === 0 ? (
        <LoadingSpinner />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-12 h-12" />}
          message="No processes found."
          action={{ label: 'Refresh', onClick: fetchProcesses }}
        />
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-700 z-10">
              <tr>
                {(
                  [
                    { key: 'name', label: 'Name' },
                    { key: 'cpu', label: 'CPU %' },
                    { key: 'mem', label: 'RAM %' },
                    { key: 'pid', label: 'PID' }
                  ] as { key: SortKey; label: string }[]
                ).map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-100 select-none"
                  >
                    {label}
                    <SortIcon col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sorted.map((p) => (
                <tr key={p.pid} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-200 max-w-[200px] truncate">
                    {p.name}
                  </td>
                  <td className={`px-4 py-2.5 font-mono ${usageColor(p.cpu)}`}>
                    {p.cpu.toFixed(1)}%
                  </td>
                  <td className={`px-4 py-2.5 font-mono ${usageColor(p.mem)}`}>
                    {p.mem.toFixed(1)}%
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 font-mono">{p.pid}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-slate-800 text-xs text-slate-500">
            {sorted.length} processes
          </div>
        </div>
      )}
    </div>
  )
}