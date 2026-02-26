// src/renderer/src/components/Layout.tsx
import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  History,
  Activity,
  Bell,
  Settings,
  Monitor,
  Wifi,
  Cpu,
  Database,
  Zap,
  HardDrive,
  Thermometer,
  Battery
} from 'lucide-react'
import clsx from 'clsx'

type NavItem = { to: string; icon: React.ElementType; label: string }
type NavSection = { label?: string; items: NavItem[] }

// Temperature sensors are inaccessible on Windows without special kernel drivers,
// so hide that nav item on Windows to avoid confusion.
const isWindows = navigator.userAgent.includes('Windows')

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }]
  },
  {
    label: 'Hardware',
    items: [
      { to: '/cpu', icon: Cpu, label: 'CPU' },
      { to: '/ram', icon: Database, label: 'RAM' },
      { to: '/gpu', icon: Zap, label: 'GPU' },
      { to: '/storage', icon: HardDrive, label: 'Storage' },
      ...(!isWindows ? [{ to: '/temperature', icon: Thermometer, label: 'Temperature' } as NavItem] : []),
      { to: '/battery', icon: Battery, label: 'Battery' }
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/network', icon: Wifi, label: 'Network' },
      { to: '/processes', icon: Activity, label: 'Processes' }
    ]
  },
  {
    label: 'Monitoring',
    items: [
      { to: '/history', icon: History, label: 'History' },
      { to: '/alerts', icon: Bell, label: 'Alerts' }
    ]
  }
]

function NavItemLink({ to, icon: Icon, label }: NavItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
          isActive
            ? 'bg-blue-600/90 text-white shadow-sm'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
        )
      }
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </NavLink>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800/80 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-800/80 flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm text-slate-100">PC Monitor</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-slate-500">Monitoring active</span>
            </div>
          </div>
        </div>

        {/* Nav — scrollable */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          {NAV_SECTIONS.map((section, i) => (
            <div key={i}>
              {section.label && (
                <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavItemLink key={item.to} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Settings pinned at bottom */}
        <div className="flex-shrink-0 px-2 pb-3 border-t border-slate-800/80 pt-3">
          <NavItemLink to="/settings" icon={Settings} label="Settings" />
          <p className="text-[10px] text-slate-700 mt-2 px-3">PC Monitor v1.0</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}