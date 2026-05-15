import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:5000/api' })

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)

export const getPatients = (search) => api.get('/patients', { params: { search } })
export const getPatient = (id) => api.get(`/patients/${id}`)
export const createPatient = (data) => api.post('/patients', data)
export const updatePatient = (id, data) => api.put(`/patients/${id}`, data)
export const deletePatient = (id) => api.delete(`/patients/${id}`)
export const chatWithPatient = (id, message) => api.post(`/patients/${id}/chat`, { message })
export const deleteDoctorAccount = () => api.delete('/patients/account/me')

export const getReports = (params) => api.get('/reports', { params })
export const uploadReport = (formData) => api.post('/reports/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const deleteReport = (id) => api.delete(`/reports/${id}`)

export const getPortalProfile = () => api.get('/portal/profile')
export const updatePortalProfile = (data) => api.put('/portal/profile', data)
export const grantAccess = (doctorUniqueId) => api.post('/portal/grant-access', { doctorUniqueId })
export const revokeAccess = (doctorId) => api.delete(`/portal/revoke-access/${doctorId}`)
export const portalChat = (message) => api.post('/portal/chat', { message })
export const deletePatientAccount = () => api.delete('/portal/account')

export default api
