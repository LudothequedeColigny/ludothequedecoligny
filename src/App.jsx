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
import HowToBorrow from './pages/HowToBorrow.jsx'
import InscriptionPermanence from './pages/InscriptionPermanence'

// Pages Admin
import Dashboard from './pages/admin/Dashboard'
import Adherents from './pages/admin/Adherents'
import Jeux from './pages/admin/Jeux'
import Prets from './pages/admin/Prets'
import EvenementsAdmin from './pages/admin/Evenements'
import GestionPermanences from './pages/admin/GestionPermanences'
import InstallationApp from './pages/admin/InstallationApp'
import Parametres from './pages/admin/Parametres' // <-- AJOUTÉ

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
  
  // --- SYSTÈME DE SYNCHRONISATION HORS-LIGNE ---
  useEffect(() => {
    const syncOfflineData = async () => {
      const queue = JSON.parse(localStorage.getItem('offline_sync_queue') || '[]');
      if (queue.length === 0) return;

      console.log(`Connexion rétablie. Tentative de synchronisation de ${queue.length} élément(s)...`);
      const remainingQueue = [...queue];

      for (const item of queue) {
        try {
          const { error } = await supabase.from(item.table).insert([item.data]);
          
          if (!error) {
            if (item.table === 'loans') {
              await supabase.from('games')
                .update({ is_available: false })
                .eq('id', item.data.game_id);
            }

            const index = remainingQueue.findIndex(q => q.timestamp === item.timestamp);
            if (index !== -1) remainingQueue.splice(index, 1);
            console.log(`Synchronisation réussie pour : ${item.table}`);
          } else {
            console.error(`Erreur de synchro pour ${item.table}:`, error.message);
          }
        } catch (err) {
          console.error("Erreur critique lors de la synchro:", err);
        }
      }

      localStorage.setItem('offline_sync_queue', JSON.stringify(remainingQueue));
    };

    window.addEventListener('online', syncOfflineData);
    if (navigator.onLine) { syncOfflineData(); }

    return () => window.removeEventListener('online', syncOfflineData);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Routes>
        {/* --- ROUTES PUBLIQUES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/catalogue" element={<Catalogue />} />
        <Route path="/evenements" element={<Evenements />} />
        <Route path="/comment-emprunter" element={<HowToBorrow />} />
        <Route path="/login" element={<Login />} />
        <Route path="/inscription-permanence" element={<InscriptionPermanence />} /> 
        
        {/* --- ROUTES PRIVÉES (ADMIN) --- */}
        <Route path="/admin" element={<ProtectedRoute><AdminLayout><Dashboard /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/jeux" element={<ProtectedRoute><AdminLayout><Jeux /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/adherents" element={<ProtectedRoute><AdminLayout><Adherents /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/prets" element={<ProtectedRoute><AdminLayout><Prets /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/evenements" element={<ProtectedRoute><AdminLayout><EvenementsAdmin /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/permanences" element={<ProtectedRoute><AdminLayout><GestionPermanences /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/installation" element={<ProtectedRoute><AdminLayout><InstallationApp /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/parametres" element={<ProtectedRoute><AdminLayout><Parametres /></AdminLayout></ProtectedRoute>} /> {/* <-- AJOUTÉ */}
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App;