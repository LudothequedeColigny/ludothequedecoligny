// ============================================
// PAGE ÉVÉNEMENTS PUBLICS
// Liste des événements à venir
// ============================================

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Blocks } from 'lucide-react'

export default function Evenements() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Blocks className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-lg text-gray-900">Événements</h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Nos Événements
          </h2>
          <p className="text-gray-600">
            Page en cours de développement...
          </p>
        </div>
      </div>
    </div>
  )
}
