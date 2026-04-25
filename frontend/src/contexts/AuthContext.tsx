import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import { AuthContextType, UserProfile } from '../types'

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [doctor, setDoctor] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchDoctorData = useCallback(async (userId: string, userObj: any) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      if (data) {
        setDoctor({ ...data, email: userObj.email })
      } else {
        setDoctor({ 
          id: userId, 
          name: userObj.user_metadata?.name || 'Doctor', 
          role: (userObj.user_metadata?.role as any) || 'doctor',
          email: userObj.email
        })
      }
    } catch (err) {
      console.error('Error fetching doctor profile:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchDoctorData(session.user.id, session.user)
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchDoctorData(session.user.id, session.user)
      } else {
        setDoctor(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchDoctorData])

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signup = async (email: string, password: string, name: string, metadata: any = {}) => {
    const role = metadata.role || 'doctor'
    
    let assignedDoctor: string | null = null
    let assignedWard: string | null = null
    
    if (role === 'nurse') {
      const doctors = ["Dr. Avery", "Dr. Sterling", "Dr. Vance", "Dr. Thorne"]
      const wards = ["ICU-A (Critical Care)", "ICU-B (Post-Op)", "ICU-C (Neonatal)", "ICU-D (Neuro)"]
      assignedDoctor = doctors[Math.floor(Math.random() * doctors.length)] as string
      assignedWard = wards[Math.floor(Math.random() * wards.length)] as string
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name,
          role: role,
          assigned_doctor_name: assignedDoctor,
          assigned_icu_ward: assignedWard
        }
      }
    })
    
    if (error) {
      if (error.message.includes('Email rate limit exceeded') || error.message.includes('rate limit')) {
         const guestUser = { id: 'usr-' + Math.random().toString(36).substr(2, 9), email, user_metadata: { name, role, assigned_doctor_name: assignedDoctor, assigned_icu_ward: assignedWard } }
         setSession({ user: guestUser as any } as Session)
         setDoctor({ ...guestUser.user_metadata, id: guestUser.id, email } as UserProfile)
         setLoading(false)
         return { user: guestUser, session: { user: guestUser }, isGuest: true }
      }
      throw error
    }
    
    if (data.user) {
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: name,
          role: role,
          assigned_doctor_name: assignedDoctor,
          assigned_icu_ward: assignedWard
        })
        
      if (insertError) {
         console.error('Error creating public profile:', insertError)
      }
    }
    
    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setDoctor(null)
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, doctor, loading, login, signup, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
