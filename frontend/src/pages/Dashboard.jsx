import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPatients, getReports } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { Users, FileText, AlertTriangle, CheckCircle, Clock, ArrowRight, Brain } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [patients, setPatients] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getPatients(), getReports()])
      .then(([p, r]) => { 
  setPatients([...(p.data.ownPatients || []), ...(p.data.grantedPatients || [])])
  setReports(r.data) 
})
      .finally(() => setLoading(false))
  }, [])

  const criticalCount = reports.filter(r =>
    r.criticalFlags?.some(f => f.type === 'critical')
  ).length

  const pendingCount = reports.filter(r => r.agentStatus === 'processing' || r.agentStatus === 'pending').length
  const doneCount = reports.filter(r => r.agentStatus === 'done').length

  const recentReports = reports.slice(0, 5)
  const recentPatients = patients.slice(0, 5)

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <Brain size={20} className="animate-pulse mr-2" /> Loading...
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Good morning, Dr. {user?.name} 👋</h1>
        <p className="text-slate-400 mt-1">Here's your medical records overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Patients', value: patients.length, icon: Users, color: 'text-brand-400', bg: 'bg-brand-500/10' },
          { label: 'Total Reports', value: reports.length, icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Critical Alerts', value: criticalCount, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'AI Processed', value: doneCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={22} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-slate-400 text-sm">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* AI Processing status */}
      {pendingCount > 0 && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4 flex items-center gap-3">
          <Brain size={20} className="text-brand-400 animate-pulse" />
          <span className="text-brand-300 font-medium">{pendingCount} report(s) being analyzed by AI...</span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Reports */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <FileText size={18} className="text-brand-400" /> Recent Reports
            </h2>
            <Link to="/reports" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentReports.length === 0 && <p className="text-slate-500 text-sm">No reports yet</p>}
            {recentReports.map(r => (
              <div key={r._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.patient?.name} · {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {r.criticalFlags?.some(f => f.type === 'critical') && (
                    <span className="badge-critical">Critical</span>
                  )}
                  {r.agentStatus === 'done' && <span className="badge-success">Done</span>}
                  {r.agentStatus === 'processing' && (
                    <span className="badge-info flex items-center gap-1"><Clock size={10} className="animate-spin" />Processing</span>
                  )}
                  {r.agentStatus === 'failed' && <span className="badge-critical">Failed</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users size={18} className="text-brand-400" /> Recent Patients
            </h2>
            <Link to="/patients" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {recentPatients.length === 0 && <p className="text-slate-500 text-sm">No patients yet</p>}
            {recentPatients.map(p => (
              <Link key={p._id} to={`/patients/${p._id}`}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 font-bold text-sm">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.age} yrs · {p.gender}</p>
                  </div>
                </div>
                {p.activeAlerts?.length > 0 && (
                  <span className="badge-critical">{p.activeAlerts.length} alert{p.activeAlerts.length > 1 ? 's' : ''}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
