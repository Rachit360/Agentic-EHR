import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, Users, FileText, LogOut, Activity, Settings } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const links = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/patients', icon: Users, label: 'Patients' },
    { to: '/reports', icon: FileText, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <Activity size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg">DigiRepo</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                location.pathname === to
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>
              <Icon size={16} />{label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm">Dr. {user?.name}</span>
          <span className="font-mono text-xs text-brand-400 bg-brand-500/10 px-2 py-1 rounded-lg">{user?.uniqueId}</span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </nav>
  )
}