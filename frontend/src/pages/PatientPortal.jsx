import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { getPortalProfile, updatePortalProfile, grantAccess, revokeAccess, portalChat, deletePatientAccount, uploadReport, deleteReport } from '../services/api'
import ReactMarkdown from 'react-markdown'
import {
  HeartPulse, Upload, FileText, Brain, MessageSquare, Send, Settings,
  CheckCircle, Clock, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  User, UserPlus, UserMinus, Trash2, Shield, Copy, Check, Eye
} from 'lucide-react'

export default function PatientPortal() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [patient, setPatient] = useState(null)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')
  const [uploading, setUploading] = useState(false)
  const [uploadTitle, setUploadTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [expandedReport, setExpandedReport] = useState(null)
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [doctorId, setDoctorId] = useState('')
  const [grantMsg, setGrantMsg] = useState('')
  const [grantError, setGrantError] = useState('')
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const pollRef = useRef(null)

  const fetchData = async () => {
    try {
      const res = await getPortalProfile()
      setPatient(res.data.patient)
      setReports(res.data.reports)
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
    pollRef.current = setInterval(fetchData, 8000)
    return () => clearInterval(pollRef.current)
  }, [])

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMessages])

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) return
    setUploading(true)
    const fd = new FormData()
    fd.append('report', selectedFile)
    fd.append('title', uploadTitle || selectedFile.name)
    try {
      await uploadReport(fd)
      setSelectedFile(null); setUploadTitle('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      fetchData()
    } catch (err) { alert(err.response?.data?.message || 'Upload failed') }
    finally { setUploading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this report?')) return
    await deleteReport(id); fetchData()
  }

  const handleGrantAccess = async (e) => {
    e.preventDefault(); setGrantMsg(''); setGrantError('')
    try {
      const res = await grantAccess(doctorId.trim())
      setGrantMsg(`✅ Access granted to Dr. ${res.data.doctor.name}`)
      setDoctorId(''); fetchData()
    } catch (err) { setGrantError(err.response?.data?.message || 'Failed') }
  }

  const handleRevoke = async (dId) => {
    if (!confirm('Revoke this doctor\'s access?')) return
    await revokeAccess(dId); fetchData()
  }

  const handleChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return
    const msg = chatInput.trim(); setChatInput('')
    setChatMessages(p => [...p, { role: 'user', content: msg }])
    setChatLoading(true)
    try {
      const res = await portalChat(msg)
      setChatMessages(p => [...p, { role: 'assistant', content: res.data.reply }])
    } catch (err) {
      setChatMessages(p => [...p, { role: 'assistant', content: '⚠️ ' + (err.response?.data?.message || err.message) }])
    } finally { setChatLoading(false) }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Permanently delete your account and ALL data? This cannot be undone.')) return
    if (!confirm('Are you absolutely sure?')) return
    await deletePatientAccount(); logout(); navigate('/login')
  }

  const copyId = () => {
    navigator.clipboard.writeText(user?.uniqueId || '')
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const statusBadge = (s) => {
    if (s === 'done') return <span className="badge-success flex items-center gap-1"><CheckCircle size={10} />Analyzed</span>
    if (s === 'failed') return <span className="badge-critical flex items-center gap-1"><XCircle size={10} />Failed</span>
    return <span className="badge-info flex items-center gap-1"><Clock size={10} className="animate-spin" />Analyzing...</span>
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400">
      <HeartPulse size={20} className="animate-pulse mr-2" /> Loading...
    </div>
  )

  const tabs = [
    { id: 'reports', label: 'My Reports', icon: FileText, count: reports.length },
    { id: 'chat', label: 'Ask AI', icon: MessageSquare },
    { id: 'access', label: 'Doctor Access', icon: Shield, count: patient?.grantedDoctors?.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Patient ID */}
      <div className="card bg-gradient-to-r from-emerald-500/10 to-brand-500/10 border-emerald-500/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 font-bold text-2xl">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{user?.name}</h1>
              <p className="text-slate-400 text-sm">
                {patient?.age ? `${patient.age} yrs · ` : ''}{patient?.gender || ''}{patient?.bloodGroup ? ` · ${patient.bloodGroup}` : ''}
              </p>
            </div>
          </div>
          {/* Patient ID Badge */}
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
            <span className="text-slate-500 text-xs">Your Patient ID</span>
            <span className="font-mono font-bold text-emerald-400">{user?.uniqueId}</span>
            <button onClick={copyId} className="text-slate-400 hover:text-white ml-1">
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
        {patient?.medicalHistory && (
          <p className="text-slate-500 text-xs mt-3">Known conditions: {patient.medicalHistory}</p>
        )}
      </div>

      {/* Upload Section */}
      <div className="card">
        <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
          <Upload size={16} className="text-emerald-400" /> Upload Medical Report
        </h3>
        <p className="text-slate-500 text-xs mb-3">Upload prescriptions, lab results, or any medical PDF. AI will create a summary for you and your doctors.</p>
        <form onSubmit={handleUpload} className="flex flex-wrap gap-3">
          <input ref={fileInputRef} type="file" accept=".pdf" onChange={e => setSelectedFile(e.target.files[0])} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary flex-shrink-0">
            <FileText size={16} />
            {selectedFile ? selectedFile.name.substring(0, 20) + '...' : 'Choose PDF'}
          </button>
          <input className="input flex-1 min-w-[160px]" placeholder="Report title (e.g. Blood Test)"
            value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
          <button type="submit" disabled={!selectedFile || uploading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50">
            {uploading ? 'Uploading...' : <><Upload size={16} />Upload</>}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-1 flex-wrap">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              <Icon size={15} /> {label}
              {count > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {reports.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <FileText size={40} className="mx-auto mb-3 opacity-30" />
              <p>No reports yet — upload your first one above!</p>
            </div>
          )}
          {reports.map(r => (
            <div key={r._id} className="card">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-white">{r.title}</p>
                    {statusBadge(r.agentStatus)}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">{new Date(r.reportDate).toLocaleDateString()} · {r.fileName}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                    <Eye size={14} /> View
                  </a>
                  {r.agentStatus === 'done' && (
                    <button onClick={() => setExpandedReport(expandedReport === r._id ? null : r._id)} className="btn-secondary p-2">
                      {expandedReport === r._id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  )}
                  <button onClick={() => handleDelete(r._id)} className="btn-danger p-2"><Trash2 size={14} /></button>
                </div>
              </div>

              {expandedReport === r._id && r.agentStatus === 'done' && r.aiSummary && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2"><Brain size={14} />AI Summary</h4>
                  <div className="prose prose-invert prose-sm max-w-none bg-slate-800/50 rounded-xl p-4">
                    <ReactMarkdown>{r.aiSummary}</ReactMarkdown>
                  </div>
                  {r.criticalFlags?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {r.criticalFlags.map((f, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                          f.type === 'critical' ? 'bg-red-500/10 text-red-300' :
                          f.type === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-blue-500/10 text-blue-300'
                        }`}>
                          <AlertTriangle size={13} />{f.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tab: AI Chat */}
      {activeTab === 'chat' && (
        <div className="card flex flex-col h-[500px]">
          <p className="text-slate-500 text-sm mb-4">Ask questions about your health in plain language.</p>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-10 text-slate-600">
                <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Try: "What did my last blood test show?" or "Do I have any warnings?"</p>
              </div>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.role === 'user' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-violet-500/20 text-violet-400'
                }`}>{m.role === 'user' ? <User size={14} /> : <Brain size={14} />}</div>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user' ? 'bg-emerald-500/15 text-slate-200' : 'bg-slate-800 text-slate-200'
                }`}>
                  {m.role === 'assistant'
                    ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    : m.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Brain size={14} className="text-violet-400 animate-pulse" />
                </div>
                <div className="bg-slate-800 rounded-2xl px-4 py-3 text-slate-400 text-sm">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChat} className="flex gap-2">
            <input className="input flex-1" placeholder="Ask about your health..."
              value={chatInput} onChange={e => setChatInput(e.target.value)} disabled={chatLoading} />
            <button type="submit" disabled={chatLoading || !chatInput.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 rounded-xl disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Tab: Doctor Access */}
      {activeTab === 'access' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold text-white mb-1 flex items-center gap-2"><UserPlus size={16} className="text-emerald-400" />Grant Doctor Access</h3>
            <p className="text-slate-500 text-sm mb-4">Enter your doctor's unique ID (e.g. DOC-0001) to share your reports with them.</p>
            {grantMsg && <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-3">{grantMsg}</div>}
            {grantError && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-3">{grantError}</div>}
            <form onSubmit={handleGrantAccess} className="flex gap-3">
              <input className="input flex-1 font-mono" placeholder="DOC-0001"
                value={doctorId} onChange={e => setDoctorId(e.target.value)} required />
              <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 rounded-xl">
                Grant Access
              </button>
            </form>
          </div>

          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Shield size={16} className="text-brand-400" />Doctors with Access</h3>
            {(!patient?.grantedDoctors || patient.grantedDoctors.length === 0) ? (
              <p className="text-slate-500 text-sm">No doctors have access to your records yet.</p>
            ) : (
              <div className="space-y-3">
                {patient.grantedDoctors.map(doc => (
                  <div key={doc._id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-brand-500/20 rounded-xl flex items-center justify-center text-brand-400 font-bold">
                        {doc.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{doc.name}</p>
                        <p className="text-slate-500 text-xs font-mono">{doc.uniqueId}</p>
                      </div>
                    </div>
                    <button onClick={() => handleRevoke(doc._id)} className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1">
                      <UserMinus size={13} /> Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><User size={16} className="text-brand-400" />Your Account Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Patient ID</span>
                <span className="font-mono text-emerald-400 font-bold">{user?.uniqueId}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Name</span>
                <span className="text-white">{user?.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Email</span>
                <span className="text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Blood Group</span>
                <span className="text-white">{patient?.bloodGroup || '—'}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Total Reports</span>
                <span className="text-white">{reports.length}</span>
              </div>
            </div>
          </div>

          <div className="card border-red-500/20">
            <h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2"><Trash2 size={16} />Danger Zone</h3>
            <p className="text-slate-500 text-sm mb-4">Permanently delete your account and all uploaded reports. This cannot be undone.</p>
            <button onClick={handleDeleteAccount} className="btn-danger flex items-center gap-2">
              <Trash2 size={16} /> Delete My Account
            </button>
          </div>
        </div>
      )}
    </div>
  )
}