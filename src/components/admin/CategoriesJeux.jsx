import { useEffect, useRef, useState } from 'react'
import { Plus, Trash2, X, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { useToast } from '../ToastContext'
import ConfirmModal from './ConfirmModal'
import MaskIcon from '../site/MaskIcon'
import { creerEnregistrementDiffere } from './enregistrementDiffere'

/**
 * Paramètres → « Catégories des jeux » : catégories de rangement de la ludothèque
 * et leur couleur (bandeau des étiquettes code-barres). Valeurs de départ : tableau
 * Google « Liste des jeux catégories » (octobre 2026).
 */
export default function CategoriesJeux({ onClose }) {
  const { addToast } = useToast()
  const [categories, setCategories] = useState([])
  const [nombres, setNombres] = useState({})
  const [chargement, setChargement] = useState(true)
  const [aSupprimer, setASupprimer] = useState(null)
  const montee = useRef(true)   // faux après démontage : plus aucun setState
  const baseCouleurs = useRef({}) // couleur connue en base, par catégorie

  async function charger() {
    const [{ data: cats }, { data: jeux }] = await Promise.all([
      supabase.from('categories_jeux').select('*').order('ordre'),
      supabase.from('games').select('categorie_id'),
    ])
    if (!montee.current) return
    baseCouleurs.current = Object.fromEntries((cats || []).map(c => [c.id, c.couleur.toUpperCase()]))
    setCategories(cats || [])
    const n = {}
    for (const j of jeux || []) if (j.categorie_id) n[j.categorie_id] = (n[j.categorie_id] || 0) + 1
    setNombres(n)
    setChargement(false)
  }
  useEffect(() => { charger() }, [])

  async function enregistrer(id, champs) {
    if (champs.couleur) baseCouleurs.current[id] = champs.couleur.toUpperCase()
    if (montee.current) setCategories(cs => cs.map(c => (c.id === id ? { ...c, ...champs } : c)))
    const { error } = await supabase.from('categories_jeux').update(champs).eq('id', id)
    if (error) {
      addToast(error.code === '23505' ? 'Ce nom existe déjà.' : "Enregistrement impossible : " + error.message, 'error')
      charger()
    }
  }

  // Couleur : l'état local suit le sélecteur en direct ; la base n'est écrite qu'une fois, la couleur finale
  // choisie (400 ms après le dernier changement, ou tout de suite au blur / change, à la fermeture, au démontage)
  const differe = useRef(null)
  if (!differe.current) {
    differe.current = creerEnregistrementDiffere({
      delai: 400,
      ecrire: (id, v) => { if (baseCouleurs.current[id] !== v) enregistrer(id, { couleur: v }) },
    })
  }
  useEffect(() => {
    montee.current = true
    return () => { montee.current = false; differe.current.viderTout() }
  }, [])
  function fermer() { differe.current.viderTout(); onClose() }
  useEffect(() => {
    const surTouche = e => { if (e.key === 'Escape' && !aSupprimer) fermer() }
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  })
  function choisirCouleur(id, valeur) {
    const v = valeur.toUpperCase()
    setCategories(cs => cs.map(c => (c.id === id ? { ...c, couleur: v } : c)))
    differe.current.planifier(id, v)
  }
  function validerCouleur(id) { differe.current.vider(id) }
  function validerCode(c, e) {
    const v = e.target.value.trim()
    differe.current.annuler(c.id) // le code tapé gagne sur une couleur de pipette en attente
    if (/^#[0-9A-Fa-f]{6}$/.test(v)) { if (v.toUpperCase() !== (baseCouleurs.current[c.id] || c.couleur.toUpperCase())) enregistrer(c.id, { couleur: v.toUpperCase() }) }
    else { e.target.value = c.couleur; addToast('Code couleur invalide (ex. #548DD4).', 'error') }
  }

  async function ajouter() {
    const ordre = Math.max(0, ...categories.map(c => c.ordre)) + 1
    const { error } = await supabase.from('categories_jeux').insert({ nom: `Nouvelle catégorie ${ordre}`, couleur: '#1a5f7a', ordre })
    if (error) addToast("Ajout impossible : " + error.message, 'error')
    charger()
  }

  async function deplacer(i, sens) {
    if (!categories[i + sens]) return
    const nouvelles = [...categories]
    ;[nouvelles[i], nouvelles[i + sens]] = [nouvelles[i + sens], nouvelles[i]]
    // Ordre réécrit pour toutes les lignes (répare aussi les ordres en double)
    const resultats = await Promise.all(
      nouvelles.map((c, k) => c.ordre === k + 1 ? null : supabase.from('categories_jeux').update({ ordre: k + 1 }).eq('id', c.id))
    )
    const echec = resultats.find(r => r && r.error)
    if (echec) addToast('Ordre non enregistré : ' + echec.error.message, 'error')
    charger()
  }

  async function supprimer() {
    const { error } = await supabase.from('categories_jeux').delete().eq('id', aSupprimer.id)
    if (error) addToast("Suppression impossible : " + error.message, 'error')
    else addToast('Catégorie supprimée.', 'success')
    setASupprimer(null)
    charger()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-[22px]">
      <div className="anim-fade-in absolute inset-0 backdrop-blur-[6px]" style={{ background: 'rgba(15,23,42,.7)' }} onClick={fermer} />
      <div className="anim-modal-in relative flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[36px] border-2 border-[#0f172a] bg-white shadow-[12px_12px_0_#1a5f7a]">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b-2 border-[#0f172a] px-7 py-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#1a5f7a]">
              <MaskIcon file="ludo-etiquettes.svg" size={30} color="#ffffff" />
            </div>
            <div>
              <h3 className="font-display text-[21px] font-extrabold uppercase tracking-[-0.04em]">Catégories des <span className="text-[#1a5f7a]">jeux</span></h3>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">Couleur du bandeau des étiquettes</p>
            </div>
          </div>
          <button onClick={fermer} aria-label="Fermer" className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] border-2 border-[#0f172a] bg-[#fdfaf6] text-[#1a5f7a] transition-colors hover:bg-[#e38154] hover:text-white"><X size={22} /></button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-6">
          {chargement && <Loader2 className="mx-auto animate-spin text-[#1a5f7a]" />}
          {categories.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 rounded-[18px] border-2 border-[#0f172a] bg-[#fdfaf6] p-3">
              <label className="relative h-10 w-10 shrink-0 cursor-pointer rounded-[12px] border-2 border-[#0f172a]" style={{ background: c.couleur }} title="Changer la couleur">
                <input type="color" value={c.couleur} onChange={e => choisirCouleur(c.id, e.target.value)} onBlur={() => validerCouleur(c.id)} ref={el => { if (el) el.onchange = () => validerCouleur(c.id) }} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </label>
              <input key={c.id + c.couleur} defaultValue={c.couleur.toUpperCase()} maxLength={7} aria-label="Code couleur" spellCheck={false}
                onBlur={e => validerCode(c, e)} onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-[84px] shrink-0 rounded-[12px] border-2 border-transparent bg-transparent px-2 py-1.5 font-mono text-[11px] font-bold uppercase text-slate-500 outline-none focus:border-[#0f172a] focus:bg-white" />
              <input key={c.id + c.nom} defaultValue={c.nom} onBlur={e => e.target.value.trim() && e.target.value.trim() !== c.nom && enregistrer(c.id, { nom: e.target.value.trim() })}
                className="min-w-0 flex-1 rounded-[12px] border-2 border-transparent bg-transparent px-2 py-1.5 text-[13.5px] font-bold outline-none focus:border-[#0f172a] focus:bg-white" />
              <span className="shrink-0 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{nombres[c.id] || 0} jeu{(nombres[c.id] || 0) > 1 ? 'x' : ''}</span>
              <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} aria-label="Monter" className="text-slate-400 hover:text-[#1a5f7a] disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" onClick={() => deplacer(i, 1)} disabled={i === categories.length - 1} aria-label="Descendre" className="text-slate-400 hover:text-[#1a5f7a] disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" onClick={() => setASupprimer(c)} aria-label="Supprimer" className="text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t-2 border-[#0f172a] p-6">
          <button onClick={ajouter} className="flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#0f172a] bg-[#1a5f7a] py-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[4px_4px_0_#0f172a] transition-[transform,box-shadow] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0f172a]">
            <Plus size={16} strokeWidth={3} /> Ajouter une catégorie
          </button>
        </div>
      </div>

      <ConfirmModal
        open={!!aSupprimer}
        onClose={() => setASupprimer(null)}
        onConfirm={supprimer}
        tone="danger"
        title="Supprimer la catégorie ?"
        message={aSupprimer ? `« ${aSupprimer.nom} » sera supprimée. ${nombres[aSupprimer.id] || 0} jeu(x) redeviendront « sans catégorie » et n'auront plus d'étiquette tant qu'on ne leur en donne pas une autre.` : ''}
        confirmLabel="Supprimer"
      />
    </div>
  )
}
