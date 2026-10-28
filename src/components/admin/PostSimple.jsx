import { useEffect, useRef, useState } from 'react'
import { Loader2, Share2, ImagePlus } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { DataCard } from './DataCard'
import ConfirmModal from './ConfirmModal'
import SuccessModal from '../site/SuccessModal'
import MaskIcon from '../site/MaskIcon'
import SocialPostPreview from './SocialPostPreview'
import EditeurFloutagePhoto from './EditeurFloutagePhoto'
import { MODELES, LIMITES, BOUTONS, champsVides, avecPhoto, postPret, planPost } from '../../services/diapos/post-regles'
import { dessinerPost } from '../../services/diapos/post'
import { versBlob, liberer, oublierImage } from '../../services/diapos/dessin'
import { uploadSocialBlob, publierSurReseaux } from '../../services/reseauxSociaux'

/**
 * Onglet « Posts » de l'écran Communication : une image 4:5 aux couleurs de la ludothèque,
 * choisie parmi trois modèles (photo + carte, photo encadrée, message), publiée sur
 * Facebook et Instagram. Règles : services/diapos/post-regles.js, dessin : post.js.
 * Conception : docs/superpowers/specs/2026-10-28-posts-modeles-design.md
 */

const VERT = '#10b981'
const SECTION = 'mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#1a5f7a]'
const CHAMP = 'w-full rounded-[16px] border-2 border-[#0f172a] bg-[#fdfaf6] px-[18px] py-[13px] text-[13px] font-bold text-[#0f172a] outline-none placeholder:font-semibold placeholder:text-slate-300 focus:bg-white'
const ZONE = 'w-full resize-y rounded-[20px] border-2 border-[#0f172a] bg-[#fdfaf6] p-4 text-[13px] font-medium leading-relaxed text-[#0f172a] outline-none placeholder:text-slate-300 focus:bg-white'

function Champ({ label, limite, valeur, onChange, zone = false, rows = 3, placeholder = '' }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
        <span>{label}</span>
        <span className="font-semibold text-slate-400">{valeur.length}/{limite}</span>
      </span>
      {zone
        ? <textarea rows={rows} maxLength={limite} value={valeur} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={ZONE} />
        : <input type="text" maxLength={limite} value={valeur} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={CHAMP} />}
    </label>
  )
}

export default function PostSimple({ onPublie }) {
  const [champs, setChamps] = useState(champsVides)
  const [message, setMessage] = useState('')
  const [fichier, setFichier] = useState(null)        // photo choisie, en cours de floutage
  const [photoUrl, setPhotoUrl] = useState(null)      // photo floutée (adresse locale)
  const [apercu, setApercu] = useState(null)
  const [dessin, setDessin] = useState(false)
  const [confirmation, setConfirmation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState(false)
  const [erreur, setErreur] = useState('')
  const numeroApercu = useRef(0)
  const photoUrlRef = useRef(null)
  const entreeFichier = useRef(null)

  const maj = (cle, valeur) => setChamps(c => ({ ...c, [cle]: valeur }))
  const avecImage = avecPhoto(champs.modele)
  const manque = postPret(champs, !!photoUrl)
  const indice = manque || (message.trim() ? '' : 'Écrivez le texte de publication.')

  const changerPhoto = url => {
    if (photoUrlRef.current) { oublierImage(photoUrlRef.current); URL.revokeObjectURL(photoUrlRef.current) }
    photoUrlRef.current = url
    setPhotoUrl(url)
  }

  // À la fermeture de l'onglet : on rend la mémoire (téléphones)
  useEffect(() => () => {
    numeroApercu.current += 1
    if (photoUrlRef.current) { oublierImage(photoUrlRef.current); URL.revokeObjectURL(photoUrlRef.current) }
  }, [])

  // Aperçu : l'image exacte qui sera publiée, redessinée 350 ms après la dernière frappe
  useEffect(() => {
    const numero = ++numeroApercu.current
    if (avecImage && !photoUrl) { setApercu(null); setDessin(false); return undefined }
    setDessin(true)
    const minuteur = setTimeout(async () => {
      let c = null
      try {
        c = await dessinerPost(planPost(champs), { photo: avecImage ? photoUrl : null })
        if (numero !== numeroApercu.current) return
        setApercu(c.toDataURL('image/jpeg', 0.9))
      } catch (err) {
        console.error('Aperçu du post :', err)
      } finally {
        if (c) liberer(c)
        if (numero === numeroApercu.current) setDessin(false)
      }
    }, 350)
    return () => clearTimeout(minuteur)
  }, [champs, photoUrl, avecImage])

  const peutPublier = !manque && !!message.trim() && !dessin && !envoi

  const publier = async () => {
    if (!peutPublier) return
    setEnvoi(true)
    setErreur('')
    let c = null
    try {
      c = await dessinerPost(planPost(champs), { photo: avecImage ? photoUrl : null })
      const blob = await versBlob(c)
      const url = await uploadSocialBlob(blob, `posts/post-${Date.now()}.jpg`)
      if (!url) {
        setConfirmation(false)
        setErreur("L'image n'a pas pu être enregistrée. Réessayez.")
        return
      }
      await publierSurReseaux({ message, imageUrls: [url] })
      const { error } = await supabase.from('posts').insert({ message, image_url: url, has_image: true })
      if (error) console.warn('Publication non enregistrée dans `posts` :', error.message)
      else onPublie?.()
      setConfirmation(false)
      setSucces(true)
      setChamps(champsVides())
      setMessage('')
      changerPhoto(null)
      setApercu(null)
    } catch (err) {
      console.error('Publication du post :', err)
      setConfirmation(false)
      setErreur('La publication a échoué. Vérifiez la connexion puis réessayez.')
    } finally {
      if (c) liberer(c)
      setEnvoi(false)
    }
  }

  const choixBouton = rang => (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Bouton {rang + 1}</span>
      <select
        value={champs.boutons[rang] || ''}
        onChange={e => {
          const b = [...champs.boutons]
          b[rang] = e.target.value
          maj('boutons', b.filter(Boolean))
        }}
        className={CHAMP}
      >
        <option value="">Aucun</option>
        {BOUTONS.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
    </label>
  )

  return (
    <DataCard shadow={VERT}>
      <div className="flex items-center gap-3.5 border-b-2 border-[#0f172a] px-6 py-5">
        <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[16px] border-2 border-[#0f172a] bg-[#ecfdf5] text-[#10b981]">
          <MaskIcon file="ludo-post.svg" size={30} color={VERT} />
        </div>
        <div>
          <h2 className="font-display text-[19px] font-extrabold uppercase tracking-[-0.03em]">Nouveau post</h2>
          <p className="mt-1 text-[11px] font-semibold text-slate-400">Une image aux couleurs de la ludothèque, publiée sur Facebook &amp; Instagram</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 md:p-8 lg:grid-cols-2">
        <div>
          <div className={SECTION}>Modèle</div>
          <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {MODELES.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => maj('modele', m.id)}
                aria-pressed={champs.modele === m.id}
                className={`rounded-[16px] border-2 p-3 text-left transition-colors ${
                  champs.modele === m.id ? 'border-[#10b981] bg-[#ecfdf5]' : 'border-[#0f172a] bg-white hover:bg-slate-50'
                }`}
              >
                <span className="block text-[12px] font-extrabold text-[#0f172a]">{m.nom}</span>
                <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">{m.description}</span>
              </button>
            ))}
          </div>

          {avecImage && (
            <div className="mb-5">
              <div className={SECTION}>Photo</div>
              <div className="flex items-center gap-3.5 rounded-[20px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-3.5">
                {photoUrl && <img src={photoUrl} alt="Photo choisie" className="h-16 w-16 shrink-0 rounded-[12px] border-2 border-[#0f172a] object-cover" />}
                <button
                  type="button"
                  onClick={() => entreeFichier.current?.click()}
                  className="flex items-center gap-2 rounded-[14px] border-2 border-[#0f172a] bg-white px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#1a5f7a] shadow-[3px_3px_0_#0f172a] transition-[transform,box-shadow] duration-200 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0_#0f172a]"
                >
                  <ImagePlus size={14} /> {photoUrl ? 'Changer de photo' : 'Ajouter une photo'}
                </button>
                <input
                  ref={entreeFichier}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { setFichier(e.target.files?.[0] || null); e.target.value = '' }}
                />
              </div>
            </div>
          )}

          {champs.modele === 'photo-carte' && (<>
            <Champ label="Petit titre au-dessus" limite={LIMITES.surTitre} valeur={champs.surTitre} onChange={v => maj('surTitre', v)} />
            <Champ label="Titre" limite={LIMITES.titre} valeur={champs.titre} onChange={v => maj('titre', v)} />
            <Champ label="Texte" limite={LIMITES.texte} valeur={champs.texte} onChange={v => maj('texte', v)} zone />
          </>)}
          {champs.modele === 'photo-encadree' && (<>
            <Champ label="Petite phrase d'introduction" limite={LIMITES.intro} valeur={champs.intro} onChange={v => maj('intro', v)} />
            <Champ label="Titre (en blanc)" limite={LIMITES.titreBlanc} valeur={champs.titreBlanc} onChange={v => maj('titreBlanc', v)} />
            <Champ label="Fin du titre (en orange)" limite={LIMITES.titreOrange} valeur={champs.titreOrange} onChange={v => maj('titreOrange', v)} />
            <Champ label="Légende sous la photo" limite={LIMITES.legende} valeur={champs.legende} onChange={v => maj('legende', v)} />
          </>)}
          {champs.modele === 'message' && (<>
            <Champ label="Titre" limite={LIMITES.titreMessage} valeur={champs.titreMessage} onChange={v => maj('titreMessage', v)} />
            <Champ label="Une ou deux phrases" limite={LIMITES.phrases} valeur={champs.phrases} onChange={v => maj('phrases', v)} zone />
            <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
              {choixBouton(0)}
              {choixBouton(1)}
            </div>
          </>)}

          <div className={SECTION}>Texte de publication</div>
          <textarea
            rows={5}
            placeholder="Le texte qui accompagne l'image sur Facebook et Instagram"
            className={ZONE}
            value={message}
            readOnly={envoi}
            onChange={e => setMessage(e.target.value)}
          />
        </div>

        <div>
          <SocialPostPreview text={message} imageUrls={apercu ? [apercu] : []} portrait />
          {dessin && (
            <p className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-slate-400">
              <Loader2 size={13} className="animate-spin" /> Mise à jour de l'aperçu…
            </p>
          )}
          {indice && (
            <p className="mt-3 rounded-[14px] border-2 border-[#f59e0b] bg-[#fffbeb] px-4 py-3 text-[11px] font-semibold text-[#b45309]">{indice}</p>
          )}
          {erreur && (
            <p className="mt-3 rounded-[14px] border-2 border-rose-400 bg-rose-50 px-4 py-3 text-[11px] font-semibold text-rose-600">{erreur}</p>
          )}
          <button
            type="button"
            onClick={() => { setErreur(''); setConfirmation(true) }}
            disabled={!peutPublier}
            className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-[18px] border-2 border-[#0f172a] py-5 text-[11px] font-extrabold uppercase tracking-[0.16em] transition-[transform,box-shadow] duration-200 ${
              peutPublier
                ? 'bg-[#e38154] text-white shadow-[5px_5px_0_#0f172a] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_#0f172a]'
                : 'cursor-not-allowed bg-slate-100 text-slate-300'
            }`}
          >
            <Share2 size={16} /> Publier sur Facebook &amp; Instagram
          </button>
        </div>
      </div>

      <EditeurFloutagePhoto
        fichier={fichier}
        onTermine={blob => { changerPhoto(URL.createObjectURL(blob)); setFichier(null) }}
        onAnnuler={() => setFichier(null)}
        onErreur={setErreur}
      />
      <ConfirmModal
        open={confirmation}
        onClose={() => { if (!envoi) setConfirmation(false) }}
        onConfirm={publier}
        busy={envoi}
        icon={envoi ? <Loader2 className="animate-spin" size={30} /> : <Share2 size={30} />}
        title="Publier ce post ?"
        message="L'image et son texte vont être publiés sur la page Facebook et le compte Instagram de la ludothèque."
        confirmLabel={envoi ? 'Envoi en cours…' : 'Publier'}
      />
      <SuccessModal
        open={succes}
        onClose={() => setSucces(false)}
        title="Post envoyé !"
        message="Il apparaîtra sur la page Facebook et le compte Instagram d'ici quelques instants."
      />
    </DataCard>
  )
}
