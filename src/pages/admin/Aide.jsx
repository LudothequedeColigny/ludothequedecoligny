import React from 'react';
import { LifeBuoy, PlayCircle, ChevronRight, Video } from 'lucide-react';

export default function Aide() {
  const tutorials = [
    {
      title: "Gestion des Prêts",
      description: "Comment enregistrer une sortie de jeu et valider un retour d'adhérent.",
      videoUrl: "#" 
    },
    {
      title: "Catalogue des Jeux",
      description: "Ajouter un nouveau jeu, utiliser le scanner et uploader une photo.",
      videoUrl: "#"
    },
    {
      title: "Gestion des Adhérents",
      description: "Créer une fiche membre, gérer les cotisations et les coordonnées.",
      videoUrl: "#"
    },
    {
      title: "Événements & Permanences",
      description: "Organiser le calendrier et gérer les inscriptions aux permanences.",
      videoUrl: "#"
    }
  ];

  return (
    <div className="p-4 md:p-10 bg-[#fdfaf6] min-h-screen font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-10">
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-[#1a5f7a] rounded-[1.2rem] shadow-lg text-white">
              <LifeBuoy size={28} />
            </div>
            <span>Aide & <span className="text-[#1a5f7a]">Tutoriels</span></span>
          </h1>
          <p className="mt-4 text-slate-500 font-medium italic">
            Retrouvez ici toutes les vidéos pour apprendre à utiliser l'interface d'administration.
          </p>
        </div>

        {/* GRILLE DES TUTORIELS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {tutorials.map((tuto, index) => (
            <div key={index} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl transition-all duration-300">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 bg-slate-50 text-[#1a5f7a] rounded-2xl group-hover:bg-[#1a5f7a] group-hover:text-white transition-colors">
                  <Video size={24} />
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest pt-2">Tuto #{index + 1}</span>
              </div>
              
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 mb-2">{tuto.title}</h3>
              <p className="text-slate-500 text-xs font-bold leading-relaxed mb-8">
                {tuto.description}
              </p>

              <div className="mt-auto">
                {/* ZONE VIDÉO (EN CONSTRUCTION) */}
                <div className="aspect-video bg-slate-100 rounded-[1.5rem] mb-6 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 group-hover:border-[#1a5f7a]/20 transition-colors">
                  <PlayCircle size={40} className="text-slate-300 mb-2" />
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Vidéo en cours de réalisation</span>
                </div>

                <button className="w-full py-4 bg-slate-50 text-slate-400 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 group-hover:bg-[#e38154] group-hover:text-white transition-all">
                  Visionner le tutoriel <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}