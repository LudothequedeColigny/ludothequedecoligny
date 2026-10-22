import { Link } from 'react-router-dom'
import PageLegale from '../components/site/PageLegale'
import { usePageMeta } from '../services/seo'

const CONTACT_ASSO = 'ludothequedecoligny@outlook.fr'

export default function MentionsLegales() {
  usePageMeta({
    title: 'Mentions légales',
    description: "Mentions légales du site de la ludothèque de Coligny : éditeur, directeur de la publication et hébergement.",
    path: '/mentions-legales',
  })

  const sections = [
    {
      titre: 'Éditeur du site',
      contenu: (
        <>
          <p>
            <strong>PACTES — Pour une Action Citoyenne, une Transition Écologique et Solidaire</strong>,
            association loi 1901.
          </p>
          <p>Siège : 419 Grande Rue, 01270 Coligny</p>
          <p>Contact : <a href={`mailto:${CONTACT_ASSO}`}>{CONTACT_ASSO}</a></p>
        </>
      ),
    },
    {
      titre: 'Directeur de la publication',
      contenu: <p>Victor Guyon</p>,
    },
    {
      titre: 'Hébergement',
      contenu: (
        <>
          <p>
            <strong>Le site</strong> est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723,
            États-Unis (vercel.com).
          </p>
          <p>
            <strong>Les données</strong> (catalogue, adhérents, prêts, événements) sont hébergées par Supabase,
            sur des serveurs situés à Francfort, en Allemagne (supabase.com).
          </p>
          <p>
            <strong>Le nom de domaine</strong> ludothequedecoligny.fr est enregistré chez OVH SAS,
            2 rue Kellermann, 59100 Roubaix (ovhcloud.com).
          </p>
        </>
      ),
    },
    {
      titre: 'Contenus',
      contenu: (
        <>
          <p>
            Les textes, photos, logos et icônes dessinées du site appartiennent à l'association PACTES.
            Les visuels des boîtes de jeux restent la propriété de leurs éditeurs et ne servent qu'à présenter
            les jeux disponibles au prêt.
          </p>
          <p>
            Une photo vous concerne et vous souhaitez la voir retirée ? Écrivez-nous, nous la retirons rapidement.
          </p>
        </>
      ),
    },
    {
      titre: 'Données personnelles',
      contenu: (
        <p>
          Ce que nous enregistrons, pourquoi, combien de temps et comment exercer vos droits :
          voir notre page <Link to="/confidentialite">Confidentialité</Link>.
        </p>
      ),
    },
  ]

  return (
    <PageLegale
      eyebrow="Informations légales"
      titre="Mentions"
      accent="légales"
      majLe="22 octobre 2026"
      sections={sections}
    />
  )
}
