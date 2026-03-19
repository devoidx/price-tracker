import { createContext, useContext, useState, useEffect } from 'react'
import { useColorMode } from '@chakra-ui/react'
import { getMe } from '../api'

const AuthContext = createContext(null)

function ColorModeSync({ user }) {
  const { setColorMode } = useColorMode()
  useEffect(() => {
    if (user?.color_mode) {
      setColorMode(user.color_mode)
    }
  }, [user?.color_mode])
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      getMe()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      <ColorModeSync user={user} />
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
