import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // L'animation dure 2.5 secondes avant de disparaître
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1a5f7a] transition-opacity duration-700 ease-in-out">
      <div className="relative flex flex-col items-center animate-in zoom-in duration-1000">
        {/* Conteneur du logo avec une animation de pulsation douce */}
        <div className="w-32 h-32 md:w-48 md:h-48 mb-6 animate-pulse">
           <img 
             src="/icon-512.png" 
             alt="Logo Ludothèque" 
             className="w-full h-full object-contain shadow-2xl rounded-full"
           />
        </div>
        
        {/* Texte qui apparaît avec un léger retard */}
        <h1 className="text-white font-black uppercase tracking-[0.2em] text-sm md:text-xl animate-in slide-in-from-bottom-4 duration-1000 delay-300">
          Ludothèque de Coligny
        </h1>
        
        {/* Barre de chargement discrète */}
        <div className="mt-8 w-48 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-progress origin-left"></div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 2.2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}