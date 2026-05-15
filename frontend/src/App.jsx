import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Reports from './pages/Reports'
import PatientPortal from './pages/PatientPortal'
import Settings from './pages/Settings'
import Navbar from './components/Navbar'

const DoctorLayout = ({ children }) => (
  <div className="min-h-screen bg-slate-950">
    <Navbar />
    <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
  </div>
)

const PatientLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">D</div>
            <span className="font-bold text-white">DigiRepo</span>
            <span className="badge-success ml-2 text-xs">Patient Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{user?.uniqueId}</span>
            <span className="text-slate-400 text-sm">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/login') }} className="btn-secondary text-sm py-1.5 px-3">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>
  if (!user) return <Navigate to="/login" />
  if (role && user.role !== role) return <Navigate to={user.role === 'patient' ? '/portal' : '/'} />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Doctor */}
          <Route path="/" element={<PrivateRoute role="doctor"><DoctorLayout><Dashboard /></DoctorLayout></PrivateRoute>} />
          <Route path="/patients" element={<PrivateRoute role="doctor"><DoctorLayout><Patients /></DoctorLayout></PrivateRoute>} />
          <Route path="/patients/:id" element={<PrivateRoute role="doctor"><DoctorLayout><PatientDetail /></DoctorLayout></PrivateRoute>} />
          <Route path="/reports" element={<PrivateRoute role="doctor"><DoctorLayout><Reports /></DoctorLayout></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute role="doctor"><DoctorLayout><Settings /></DoctorLayout></PrivateRoute>} />

          {/* Patient */}
          <Route path="/portal" element={<PrivateRoute role="patient"><PatientLayout><PatientPortal /></PatientLayout></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}