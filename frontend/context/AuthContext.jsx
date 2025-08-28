import { createContext, useContext, useState, useEffect } from 'react'
import apiService from '../utils/api.js'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check backend connectivity
        await apiService.healthCheck()
        console.log('Backend connection established')
      } catch (error) {
        console.warn('Backend not available:', error.message)
      }
      
      const storedUser = localStorage.getItem('audioeddy_user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
      setLoading(false)
    }
    
    initializeAuth()
  }, [])

  const login = async (email, password) => {
    // Simulate API call
    const mockUser = {
      id: '1',
      email,
      name: email.split('@')[0],
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      joinDate: '2024-01-15',
      enhancementsCount: 47,
      totalProcessingTime: '2h 34m',
      favoriteEnhancement: 'Studio Master',
      theme: 'dark',
      notifications: true,
      autoSave: true
    }
    
    localStorage.setItem('audioeddy_user', JSON.stringify(mockUser))
    setUser(mockUser)
    return mockUser
  }

  const signup = async (name, email, password) => {
    const mockUser = {
      id: Date.now().toString(),
      email,
      name,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      joinDate: new Date().toISOString().split('T')[0],
      enhancementsCount: 0,
      totalProcessingTime: '0m',
      favoriteEnhancement: 'None',
      theme: 'dark',
      notifications: true,
      autoSave: true
    }
    
    localStorage.setItem('audioeddy_user', JSON.stringify(mockUser))
    setUser(mockUser)
    return mockUser
  }

  const logout = () => {
    localStorage.removeItem('audioeddy_user')
    setUser(null)
  }

  const updateProfile = (updates) => {
    const updatedUser = { ...user, ...updates }
    localStorage.setItem('audioeddy_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  const value = {
    user,
    login,
    signup,
    logout,
    updateProfile,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext