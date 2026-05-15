import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { register as registerApi } from '../services/api'
import { Activity, User, Mail, Lock, AlertCircle, Stethoscope, HeartPulse } from 'lucide-react'

export default function Register() {
  const [role, setRole] = useState('doctor')
  const [form, setForm] = useState({ name: '', email: '', password: '', age: '', gender: 'Male', phone: '', bloodGroup: '', medicalHistory: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const f = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await registerApi({ ...form, role, age: form.age ? Number(form.age) : undefined })
      login(res.data.token, res.data.user)
      navigate(role === 'patient' ? '/portal' : '/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4">
            <Activity size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-slate-400 mt-1">Join DigiRepo</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { r: 'doctor', Icon: Stethoscope, label: "I'm a Doctor", sub: 'Manage patients & reports', color: 'brand' },
            { r: 'patient', Icon: HeartPulse, label: "I'm a Patient", sub: 'Upload & track my health', color: 'emerald' },
          ].map(({ r, Icon, label, sub, color }) => (
            <button key={r} type="button" onClick={() => setRole(r)}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                role === r
                  ? `border-${color}-500 bg-${color}-500/10 text-${color}-400`
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600'
              }`}>
              <Icon size={26} />
              <span className="font-semibold text-sm">{label}</span>
              <span className="text-xs opacity-60">{sub}</span>
            </button>
          ))}
        </div>

        <div className="card">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Full Name *</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-slate-500" />
                <input className="input pl-10" placeholder={role === 'doctor' ? 'Dr. John Smith' : 'John Smith'}
                  value={form.name} onChange={e => f('name', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-slate-500" />
                <input className="input pl-10" type="email" placeholder="you@example.com"
                  value={form.email} onChange={e => f('email', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-slate-500" />
                <input className="input pl-10" type="password" placeholder="Min 6 characters"
                  value={form.password} onChange={e => f('password', e.target.value)} required minLength={6} />
              </div>
            </div>

            {role === 'patient' && (
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <p className="text-xs text-slate-500">Health profile — helps AI give better insights</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Age</label>
                    <input className="input" type="number" placeholder="25"
                      value={form.age} onChange={e => f('age', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Gender</label>
                    <select className="input" value={form.gender} onChange={e => f('gender', e.target.value)}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Phone</label>
                    <input className="input" placeholder="+91 99999 99999"
                      value={form.phone} onChange={e => f('phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">Blood Group</label>
                    <input className="input" placeholder="A+"
                      value={form.bloodGroup} onChange={e => f('bloodGroup', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-slate-400 mb-1.5 block">Known Medical Conditions</label>
                    <textarea className="input resize-none h-20" placeholder="Diabetes, Hypertension..."
                      value={form.medicalHistory} onChange={e => f('medicalHistory', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className={`w-full justify-center py-2.5 font-medium px-4 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 ${
                role === 'patient' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'btn-primary'
              }`}>
              {loading ? 'Creating...' : `Register as ${role === 'doctor' ? 'Doctor' : 'Patient'}`}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-4">
            Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}