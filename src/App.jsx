import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './services/supabaseClient'

// Layouts
import AdminLayout from './components/AdminLayout'

// Pages Publiques
import Home from './pages/Home'
import Catalogue from './pages/Catalogue'
import Evenements from './pages/Evenements'
import Login from './pages/Login'
import HowToBorrow from './pages/HowToBorrow.jsx' // <-- Nouvel import

// Pages Admin
import Dashboard from './pages/admin/Dashboard'
import Adherents from './pages/admin/Adherents'
import Jeux from './pages/admin/Jeux'
import Prets from './pages/admin/Prets'
import EvenementsAdmin from './pages/admin/Evenements'

/**
 * COMPOSANT DE PROTECTION
 */
const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-500 italic">
        Vérification des accès...
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/comment-emprunter" element={<HowToBorrow />} /> {/* <-- Nouvelle route */}
        <Route path="/login" element={<Login />} />
        
        {/* --- ROUTES PRIVÉES (ADMIN) --- */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout>
              <Dashboard />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/jeux" element={
          <ProtectedRoute>
            <AdminLayout>
              <Jeux />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/adherents" element={
          <ProtectedRoute>
            <AdminLayout>
              <Adherents />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        <Route path="/admin/prets" element={
          <ProtectedRoute>
            <AdminLayout>
              <Prets />
            </AdminLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin/evenements" element={
          <ProtectedRoute>
            <AdminLayout>
              <EvenementsAdmin />
            </AdminLayout>
          </ProtectedRoute>
        } />
        
        {/* REDIRECTION SI PAGE INCONNUE */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App