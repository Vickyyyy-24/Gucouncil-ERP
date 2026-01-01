'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'

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

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')
    
    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (councilId: string, password: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ councilId, password }),
      })

      let data: any = null
      try {
        data = await response.json()
      } catch (jsonErr) {
        // If response isn't JSON or network failed after response
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed')
      }

      setToken(data.token)
      setUser(data.user)
      
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))

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
      // Network errors (e.g. failed to fetch) will surface here
      const msg = error?.message || 'Login failed'
      if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
        toast.error(`Unable to reach backend. Check server and API_URL (${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'})`)
      } else {
        toast.error(msg)
      }
      throw error
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
    toast.info('Logged out successfully')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}