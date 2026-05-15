import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getPatients, createPatient, deletePatient } from '../services/api'
import { Users, Plus, Search, Trash2, ChevronRight, AlertTriangle, X, Shield, Copy, Check } from 'lucide-react'

const EMPTY = { name: '', age: '', gender: 'Male', phone: '', email: '', bloodGroup: '', address: '', medicalHistory: '' }

export default function Patients() {
  const { user } = useAuth()
  const [ownPatients, setOwnPatients] = useState([])
  const [grantedPatients, setGrantedPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const fetchPatients = async () => {
    setLoading(true)
    const res = await getPatients(search)
    setOwnPatients(res.data.ownPatients || [])
    setGrantedPatients(res.data.grantedPatients || [])
    setLoading(false)
  }

  useEffect(() => { fetchPatients() }, [search])

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      await createPatient({ ...form, age: Number(form.age) })
      setShowModal(false); setForm(EMPTY); fetchPatients()
    } catch (err) { setError(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete patient "${name}" and all reports?`)) return
    await deletePatient(id); fetchPatients()
  }

  const copyId = () => {
    navigator.clipboard.writeText(user?.uniqueId || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const PatientCard = ({ p, isShared }) => (
    <div className="card flex items-center justify-between hover:border-slate-700 transition-colors">
      <Link to={`/patients/${p._id}`} className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 bg-brand-500/15 rounded-xl flex items-center justify-center text-brand-400 font-bold text-lg flex-shrink-0">
          {p.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white">{p.name}</p>
            {isShared && <span className="badge-info flex items-center gap-1 text-xs"><Shield size={10} />Shared</span>}
            {p.activeAlerts?.length > 0 && (
              <span className="badge-critical flex items-center gap-1 text-xs">
                <AlertTriangle size={10} />{p.activeAlerts.length} alert{p.activeAlerts.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm">{p.age} yrs · {p.gender}{p.bloodGroup ? ` · ${p.bloodGroup}` : ''}</p>
        </div>
      </Link>
      <div className="flex items-center gap-2 ml-4">
        <Link to={`/patients/${p._id}`} className="btn-secondary text-sm py-1.5 px-3">
          View <ChevronRight size={14} />
        </Link>
        {!isShared && (
          <button onClick={() => handleDelete(p._id, p.name)} className="btn-danger p-2"><Trash2 size={15} /></button>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Patients</h1>
          <p className="text-slate-400 mt-1">{ownPatients.length + grantedPatients.length} total</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Doctor ID badge */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2">
            <span className="text-slate-500 text-xs">Your Doctor ID</span>
            <span className="font-mono font-bold text-brand-400">{user?.uniqueId}</span>
            <button onClick={copyId} className="text-slate-400 hover:text-white">
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            </button>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={18} /> Add Patient
          </button>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-3 text-slate-500" />
        <input className="input pl-10" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-slate-400 text-center py-16">Loading...</div>
      ) : (
        <>
          {/* Own patients */}
          {ownPatients.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">My Patients ({ownPatients.length})</h2>
              <div className="space-y-3">{ownPatients.map(p => <PatientCard key={p._id} p={p} isShared={false} />)}</div>
            </div>
          )}

          {/* Shared patients */}
          {grantedPatients.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={14} /> Shared With Me ({grantedPatients.length})
              </h2>
              <div className="space-y-3">{grantedPatients.map(p => <PatientCard key={p._id} p={p} isShared={true} />)}</div>
            </div>
          )}

          {ownPatients.length === 0 && grantedPatients.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p>No patients yet</p>
              <p className="text-xs mt-1">Add a patient or share your Doctor ID with patients so they can grant you access</p>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">New Patient</h2>
              <button onClick={() => setShowModal(false)}><X size={20} className="text-slate-400 hover:text-white" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 mb-1.5 block">Full Name *</label>
                  <input className="input" placeholder="John Smith" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Age *</label>
                  <input className="input" type="number" placeholder="35" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Gender *</label>
                  <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Phone</label>
                  <input className="input" placeholder="+91 9999999999" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">Blood Group</label>
                  <input className="input" placeholder="A+" value={form.bloodGroup} onChange={e => setForm({ ...form, bloodGroup: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 mb-1.5 block">Email</label>
                  <input className="input" type="email" placeholder="patient@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-slate-400 mb-1.5 block">Known Medical History</label>
                  <textarea className="input resize-none h-20" placeholder="Diabetes, Hypertension..." value={form.medicalHistory} onChange={e => setForm({ ...form, medicalHistory: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Creating...' : 'Create Patient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}