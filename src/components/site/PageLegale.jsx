import PublicLayout from './PublicLayout'
import { EYEBROW } from './styles'

/**
 * Mise en page commune des pages Mentions légales et Confidentialité :
 * titre en deux tons, puis une suite de blocs (titre + texte) sur une colonne
 * de lecture. `sections` : [{ titre, contenu }] où contenu est du JSX.
 */
export default function PageLegale({ eyebrow, titre, accent, intro, majLe, sections }) {
  return (
    <PublicLayout>
      <main className="px-4 pb-16 pt-8 md:px-10 md:pb-24 md:pt-12">
        <div className="mx-auto max-w-[760px]">
          <div className="mb-8 md:mb-10">
            <div className={EYEBROW}>{eyebrow}</div>
            <h1 className="mt-3 font-display text-[30px] font-extrabold leading-[1.02] tracking-[-0.045em] md:text-[48px]">
              {titre} <span className="text-[#e38154]">{accent}</span>
            </h1>
            {intro && <p className="mt-4 text-[15px] font-medium leading-[1.68] text-slate-600">{intro}</p>}
            <p className="mt-3 text-[12px] text-slate-400">Mis à jour le {majLe}</p>
          </div>

          <div className="flex flex-col gap-4">
            {sections.map(s => (
              <section key={s.titre} className="rounded-[28px] border-2 border-[#0f172a] bg-white p-6 md:p-8">
                <h2 className="mb-3 font-display text-[20px] font-extrabold tracking-[-0.03em] text-[#1a5f7a] md:text-[23px]">
                  {s.titre}
                </h2>
                <div className="flex flex-col gap-3 text-[14.5px] leading-[1.7] text-slate-600 [&_a]:font-semibold [&_a]:text-[#1a5f7a] [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-[#0f172a]">
                  {s.contenu}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
