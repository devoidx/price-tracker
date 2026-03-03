import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach token to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auth
export const login = (username, password) => {
  const form = new FormData()
  form.append('username', username)
  form.append('password', password)
  return api.post('/users/login', form)
}
export const register = (data) => api.post('/users/register', data)
export const getMe = () => api.get('/users/me')

// Products
export const getProducts = () => api.get('/products/')
export const addProduct = (data) => api.post('/products/', data)
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const triggerScrape = (id) => api.post(`/prices/${id}/scrape`)

// Prices
export const getPriceHistory = (id) => api.get(`/prices/${id}`)

// Alerts
export const getAlerts = (productId) => api.get(`/alerts/${productId}`)
export const createAlert = (productId, data) => api.post(`/alerts/${productId}`, data)
export const deleteAlert = (alertId) => api.delete(`/alerts/${alertId}`)
export const toggleAlert = (alertId) => api.patch(`/alerts/${alertId}/toggle`)

// Admin
export const getAdminUsers = () => api.get('/admin/users')
export const deactivateUser = (id) => api.patch(`/admin/users/${id}/deactivate`)
export const getAdminProducts = () => api.get('/admin/products')

// User
export const changePassword = (data) => api.put('/users/me/password', data)
export const updateProfile = (data) => api.put('/users/me/profile', data)

export default api

