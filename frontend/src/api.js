import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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
export const changePassword = (data) => api.put('/users/me/password', data)
export const updateProfile = (data) => api.put('/users/me/profile', data)

// Products
export const getProducts = () => api.get('/products')
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.patch(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)
export const getNextRunTimes = () => api.get('/products/next-run-times')

// Sources
export const getSources = (productId) => api.get(`/products/${productId}/sources`)
export const addSource = (productId, data) => api.post(`/products/${productId}/sources`, data)
export const updateSource = (productId, sourceId, data) => api.patch(`/products/${productId}/sources/${sourceId}`, data)
export const deleteSource = (productId, sourceId) => api.delete(`/products/${productId}/sources/${sourceId}`)
export const triggerSourceScrape = (sourceId) => api.post(`/prices/source/${sourceId}/scrape`)

// Prices
export const getPriceHistory = (productId) => api.get(`/prices/${productId}`)
export const triggerScrape = (productId) => api.post(`/prices/${productId}/scrape`)

// Alerts
export const getAlerts = (productId) => api.get(`/alerts/${productId}`)
export const createAlert = (productId, data) => api.post(`/alerts/${productId}`, data)
export const deleteAlert = (alertId) => api.delete(`/alerts/${alertId}`)
export const toggleAlert = (alertId) => api.patch(`/alerts/${alertId}/toggle`)

// Admin
export const getAdminUsers = () => api.get('/admin/users')
export const getAdminProducts = () => api.get('/admin/products')
export const deactivateUser = (id) => api.post(`/admin/users/${id}/deactivate`)
export const adminUpdateUser = (id, data) => api.patch(`/admin/users/${id}`, data)
