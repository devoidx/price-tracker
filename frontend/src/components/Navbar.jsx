import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogOut, LayoutDashboard, Shield } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">📈 PriceTracker</Link>
      <div className="navbar-links">
        <Link to="/" className="btn btn-ghost btn-sm">
          <LayoutDashboard size={15} /> Dashboard
        </Link>
        {user?.is_admin && (
          <Link to="/admin" className="btn btn-ghost btn-sm">
            <Shield size={15} /> Admin
          </Link>
        )}
        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
          <LogOut size={15} /> Logout
        </button>
      </div>
    </nav>
  )
}
