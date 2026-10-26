import Reveal from '../Reveal'
import CountUp from '../CountUp'

/**
 * Les chiffres clés de l'en-tête, en cartes penchées papier découpé.
 * `chiffres` : résultat de chiffresCles() ; le nombre de jeux empruntés est masqué
 * quand il est inconnu (fonction des emprunts absente de la base).
 */
const pluriel = (n, un, plusieurs) => (n > 1 ? plusieurs : un)

export default function ChiffresCles({ chiffres }) {
  const { organises, participants, jeuxJoues, jeuxEmpruntes } = chiffres
  const cartes = [
    {
      n: organises,
      libelle: pluriel(organises, 'soirée ou après-midi organisé', 'soirées et après-midi organisés'),
      fond: 'bg-[#1a5f7a] text-white',
      chiffre: '',
      texte: 'text-[#bae6fd]',
    },
    {
      n: participants,
      libelle: pluriel(participants, 'participant au total', 'participants au total'),
      fond: 'bg-[#e38154] text-white',
      chiffre: '',
      texte: 'text-[#ffe8dc]',
    },
    {
      n: jeuxJoues,
      libelle: pluriel(jeuxJoues, 'jeu différent joué', 'jeux différents joués'),
      fond: 'bg-white',
      chiffre: 'text-[#e38154]',
      texte: 'text-[#1a5f7a]',
    },
    jeuxEmpruntes != null && {
      n: jeuxEmpruntes,
      libelle: pluriel(jeuxEmpruntes, 'jeu emprunté en permanence', 'jeux empruntés en permanence'),
      fond: 'bg-[#0f172a] text-white',
      chiffre: 'text-[#fdba98]',
      texte: 'text-[#cbd5e1]',
    },
  ].filter(Boolean)

  return (
    <div
      className={`mx-auto mt-9 grid max-w-[980px] grid-cols-2 gap-x-3.5 gap-y-4 min-[900px]:gap-[22px] ${cartes.length === 4 ? 'min-[900px]:grid-cols-4' : 'min-[900px]:grid-cols-3'}`}
    >
      {cartes.map((c, i) => (
        // L'apparition (Reveal) est posée autour : sa transformation effacerait l'inclinaison
        <Reveal key={c.libelle} variant="scale" delay={i * 90}>
          <div
            className={`h-full rounded-[28px] border-2 border-[#0f172a] px-3.5 pb-[18px] pt-5 text-center shadow-[6px_6px_0_#0f172a] ${c.fond} ${i % 2 === 0 ? '-rotate-[1.5deg]' : 'rotate-[1.5deg]'}`}
          >
            <CountUp
              value={c.n}
              className={`block font-display text-[42px] font-extrabold leading-none tracking-[-0.05em] md:text-[54px] ${c.chiffre}`}
            />
            <div className={`mt-2 text-[9.5px] font-extrabold uppercase leading-[1.5] tracking-[0.16em] md:text-[10px] ${c.texte}`}>
              {c.libelle}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  )
}
