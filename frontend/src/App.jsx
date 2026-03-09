import { Box, Text } from '@chakra-ui/react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import ProductDetail from './pages/ProductDetail'
import Admin from './pages/Admin'
import Profile from './pages/Profile'
import Settings from './pages/Settings'
import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error: error.message } }
  render() {
    if (this.state.error) return (
      <Box bg="red.100" p={6} m={4} borderRadius="md">
        <Text fontWeight="bold" color="red.600">Error in {this.props.name}:</Text>
        <Text color="red.500" fontSize="sm" mt={2}>{this.state.error}</Text>
      </Box>
    )
    return this.props.children
  }
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return <Box p={8}><Text>Loading...</Text></Box>
  if (!user) return <Navigate to="/login" />
  if (adminOnly && !user.is_admin) return <Navigate to="/" />
  return children
}

function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" />
  if (!user.is_super_admin) return <Navigate to="/" />
  return children
}

export default function App() {
  const { user } = useAuth()
  return (
    <>
      {user && <ErrorBoundary name="Navbar"><Navbar /></ErrorBoundary>}
      <Routes>
        <Route path="/login" element={<ErrorBoundary name="Login"><Login /></ErrorBoundary>} />
        <Route path="/register" element={<ErrorBoundary name="Register"><Register /></ErrorBoundary>} />
        <Route path="/" element={<ProtectedRoute><ErrorBoundary name="Dashboard"><Dashboard /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><ErrorBoundary name="ProductDetail"><ProductDetail /></ErrorBoundary></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><ErrorBoundary name="Admin"><Admin /></ErrorBoundary></ProtectedRoute>} />
	<Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
	<Route path="/settings" element={<SuperAdminRoute><Settings /></SuperAdminRoute>} />
      </Routes>
    </>
  )
}
