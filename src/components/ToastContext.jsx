import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Conteneur toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl font-bold text-sm text-white animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto
              ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-amber-500'}`}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : '⚠️'}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
