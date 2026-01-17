'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api'

interface User {
  id: number
  councilId: string
  role: 'admin' | 'committee_member' | 'committee_head' | 'gs'
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (councilId: string, password: string) => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // Only run on client side
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')
      
      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        apiClient.setToken(storedToken)
      }
    } catch (error) {
      console.error('Failed to load auth from storage:', error)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = async (councilId: string, password: string) => {
    try {
      const data = await apiClient.login(councilId, password)

      setToken(data.token)
      setUser(data.user)
      
      // Only use localStorage on client
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      apiClient.setToken(data.token)

      // Redirect based on role
      switch (data.user.role) {
        case 'admin':
          router.push('/admin/dashboard')
          break
        case 'committee_head':
          router.push('/head/dashboard')
          break
        case 'gs':
          router.push('/gs/dashboard')
          break
        default:
          router.push('/member/dashboard')
      }

      toast.success('Login successful!')
    } catch (error: any) {
      const msg = error?.message || 'Login failed'
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        toast.error(
          `Unable to reach backend. Check server and API_URL (${
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
          })`
        )
      } else {
        toast.error(msg)
      }
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    
    // Only use localStorage on client
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    
    try {
      apiClient.clearToken()
    } catch {}
    
    router.push('/login')
    toast.info('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}