import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { deleteDoctorAccount } from '../services/api'
import { User, Copy, Check, Trash2, LogOut, Shield } from 'lucide-react'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const copyId = () => {
    navigator.clipboard.writeText(user?.uniqueId || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account, all your patients, and all reports? This cannot be undone.')) return
    if (!confirm('Final confirmation — are you absolutely sure?')) return
    setDeleting(true)
    try {
      await deleteDoctorAccount()
      logout(); navigate('/login')
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete account')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Account Info */}
      <div className="card">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><User size={16} className="text-brand-400" />Account Info</h2>
        <div className="space-y-3 text-sm">
          {[
            { label: 'Doctor ID', value: user?.uniqueId, mono: true, color: 'text-brand-400', copy: true },
            { label: 'Name', value: user?.name },
            { label: 'Email', value: user?.email },
            { label: 'Role', value: 'Doctor' },
          ].map(({ label, value, mono, color, copy }) => (
            <div key={label} className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
              <span className="text-slate-400">{label}</span>
              <div className="flex items-center gap-2">
                <span className={`${mono ? 'font-mono font-bold' : ''} ${color || 'text-white'}`}>{value}</span>
                {copy && (
                  <button onClick={copyId} className="text-slate-400 hover:text-white">
                    {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
          <p className="text-brand-300 text-sm flex items-center gap-2">
            <Shield size={14} />
            Share your Doctor ID <span className="font-mono font-bold">{user?.uniqueId}</span> with patients so they can grant you access to their records.
          </p>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-500/20">
        <h2 className="font-semibold text-red-400 mb-2 flex items-center gap-2"><Trash2 size={16} />Danger Zone</h2>
        <p className="text-slate-500 text-sm mb-4">Permanently delete your account. All your added patients and their reports will be deleted. Shared-access patients will remain but lose your access.</p>
        <button onClick={handleDeleteAccount} disabled={deleting} className="btn-danger flex items-center gap-2">
          <Trash2 size={16} /> {deleting ? 'Deleting...' : 'Delete My Account'}
        </button>
      </div>
    </div>
  )
}