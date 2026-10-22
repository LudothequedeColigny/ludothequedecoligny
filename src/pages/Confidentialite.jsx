import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageLegale from '../components/site/PageLegale'
import { usePageMeta } from '../services/seo'
import { refusComptage, choisirComptage } from '../services/visites'

const CONTACT_ASSO = 'ludothequedecoligny@outlook.fr'

/**
 * Politique de confidentialité. Elle décrit ce que le site enregistre vraiment :
 * à tenir à jour à chaque nouveau formulaire ou nouveau service extérieur.
 * Le bouton « ne pas être compté » est la condition de la dispense CNIL
 * pour la mesure d'audience (src/services/visites.js).
 */
export default function Confidentialite() {
  usePageMeta({
    title: 'Confidentialité',
    description: "Données personnelles et ludothèque de Coligny : ce que nous enregistrons, pourquoi, combien de temps, et comment exercer vos droits.",
    path: '/confidentialite',
  })

  const [refuse, setRefuse] = useState(refusComptage())
  const basculer = () => { choisirComptage(refuse); setRefuse(!refuse) }

  const sections = [
    {
      titre: 'Qui est responsable ?',
      contenu: (
        <p>
          L'association <strong>PACTES — Pour une Action Citoyenne, une Transition Écologique et Solidaire</strong>,
          419 Grande Rue, 01270 Coligny, qui porte la ludothèque.
          Pour toute question : <a href={`mailto:${CONTACT_ASSO}`}>{CONTACT_ASSO}</a>.
        </p>
      ),
    },
    {
      titre: 'Ce que nous enregistrons, et pourquoi',
      contenu: (
        <ul className="flex flex-col gap-2.5">
          <li>
            <strong>Adhérents</strong> : nom, prénom, coordonnées, membres du foyer, cotisation, jeux empruntés
            et la façon dont vous nous avez connus. Pour gérer votre adhésion et vos prêts, et vous annoncer
            nos événements. Gardé pendant votre adhésion, puis 3 ans après la dernière.
          </li>
          <li>
            <strong>Pré-inscription en ligne</strong> : les mêmes informations, en attendant votre passage à une
            permanence. Effacée au bout de 3 mois si l'adhésion n'a pas été finalisée.
          </li>
          <li>
            <strong>« Recevoir les prochaines dates »</strong> : votre adresse e-mail seulement, pour vous annoncer
            nos soirées et après-midi jeux. Gardée jusqu'à votre désinscription, possible à tout moment par le
            lien présent dans chaque e-mail.
          </li>
          <li>
            <strong>Formulaire de contact</strong> : votre nom, votre adresse et votre message nous sont envoyés
            par e-mail. Rien n'est conservé sur le site.
          </li>
          <li>
            <strong>Inscription des bénévoles aux permanences</strong> : le nom saisi apparaît sur la page
            d'inscription, visible de tous, pour que les bénévoles s'organisent.
          </li>
          <li>
            <strong>Photos d'événements</strong> : prises et publiées avec l'accord des personnes ; les visages
            des enfants sont floutés. Retrait sur simple demande.
          </li>
        </ul>
      ),
    },
    {
      titre: 'Qui y a accès ?',
      contenu: (
        <>
          <p>
            Seuls les bénévoles de la ludothèque, avec un compte personnel. Vos données ne sont jamais vendues
            ni transmises à d'autres organismes.
          </p>
          <p>
            Des prestataires techniques les hébergent ou les acheminent pour nous, sans pouvoir s'en servir :
            Supabase (base de données, serveurs à Francfort), Vercel (hébergement du site) et Resend (envoi des
            e-mails). Vercel et Resend sont des sociétés américaines : ces transferts sont encadrés par le
            cadre européen de protection des données (Data Privacy Framework).
          </p>
        </>
      ),
    },
    {
      titre: 'Mesure des visites, sans cookie',
      contenu: (
        <>
          <p>
            Pour savoir combien de personnes visitent le site, votre navigateur garde un numéro tiré au hasard,
            sans nom ni adresse IP, pendant 13 mois au plus. Il ne sert qu'à nos statistiques. Aucun outil de
            mesure extérieur, aucune publicité, aucun cookie de suivi.
          </p>
          <div className="mt-1 flex flex-col items-start gap-3 rounded-[20px] border-2 border-dashed border-slate-300 bg-[#fdfaf6] p-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[13.5px] font-semibold text-[#0f172a]">
              {refuse ? 'Vos visites ne sont pas comptées.' : 'Vos visites sont comptées.'}
            </span>
            <button
              type="button"
              onClick={basculer}
              className="shrink-0 rounded-[14px] border-2 border-[#0f172a] bg-white px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1a5f7a] transition-colors hover:bg-[#1a5f7a] hover:text-white"
            >
              {refuse ? 'Accepter d’être compté' : 'Ne pas être compté'}
            </button>
          </div>
          <p>
            Votre navigateur garde aussi, pour les bénévoles connectés, leur session de connexion à l'espace de
            gestion : c'est indispensable à son fonctionnement.
          </p>
        </>
      ),
    },
    {
      titre: 'Vos droits',
      contenu: (
        <>
          <p>
            Vous pouvez consulter, corriger ou faire effacer vos données, ou vous opposer à leur utilisation.
            Écrivez-nous à <a href={`mailto:${CONTACT_ASSO}`}>{CONTACT_ASSO}</a> ou parlez-en à un bénévole lors
            d'une permanence : nous répondons sous un mois.
          </p>
          <p>
            En cas de désaccord, vous pouvez saisir la CNIL (cnil.fr). Voir aussi nos{' '}
            <Link to="/mentions-legales">mentions légales</Link>.
          </p>
        </>
      ),
    },
  ]

  return (
    <PageLegale
      eyebrow="Données personnelles"
      titre="Confidentialité"
      accent="et vos données"
      intro="La ludothèque enregistre le strict nécessaire pour prêter des jeux et annoncer ses événements. Voici ce que nous gardons, pourquoi, et comment le faire effacer."
      majLe="22 octobre 2026"
      sections={sections}
    />
  )
}
