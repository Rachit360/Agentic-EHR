import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getReports, deleteReport } from '../services/api'
import { FileText, Search, Trash2, AlertTriangle, CheckCircle, Clock, XCircle, Brain } from 'lucide-react'

export default function Reports() {
  const [reports, setReports] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    setLoading(true)
    const res = await getReports({ search })
    setReports(res.data)
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [search])

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    await deleteReport(id)
    fetchReports()
  }

  const statusIcon = (status) => {
    if (status === 'done') return <CheckCircle size={15} className="text-emerald-400" />
    if (status === 'failed') return <XCircle size={15} className="text-red-400" />
    return <Clock size={15} className="text-brand-400 animate-spin" />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="text-slate-400 mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''} total</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
        <input className="input pl-10" placeholder="Search reports by title..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-16">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <FileText size={48} className="mx-auto mb-3 opacity-30" />
          <p>No reports found</p>
          <p className="text-xs mt-1">Upload reports from a patient's profile page</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map(r => (
            <div key={r._id} className="card flex items-center justify-between gap-4 hover:border-slate-700 transition-colors">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                  {statusIcon(r.agentStatus)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white truncate">{r.title}</p>
                    {r.criticalFlags?.some(f => f.type === 'critical') && (
                      <span className="badge-critical flex items-center gap-1 text-xs">
                        <AlertTriangle size={10} /> Critical
                      </span>
                    )}
                    {r.criticalFlags?.some(f => f.type === 'warning') && !r.criticalFlags?.some(f => f.type === 'critical') && (
                      <span className="badge-warning text-xs">Warning</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {r.patient && (
                      <Link to={`/patients/${r.patient._id}`} className="text-brand-400 hover:text-brand-300 text-xs">
                        {r.patient.name}
                      </Link>
                    )}
                    <span className="text-slate-600 text-xs">·</span>
                    <span className="text-slate-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.agentStatus === 'processing' && (
                      <span className="text-brand-400 text-xs flex items-center gap-1">
                        <Brain size={10} className="animate-pulse" /> Analyzing...
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm py-1.5 px-3">PDF</a>
                {r.patient && (
                  <Link to={`/patients/${r.patient._id}`} className="btn-secondary text-sm py-1.5 px-3">View</Link>
                )}
                <button onClick={() => handleDelete(r._id)} className="btn-danger p-2"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
