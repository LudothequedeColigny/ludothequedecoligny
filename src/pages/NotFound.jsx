import { useNavigate } from 'react-router-dom'
import PublicLayout from '../components/site/PublicLayout'
import FloatingIcons from '../components/site/FloatingIcons'
import { BTN_TEAL, BTN_PRIMARY } from '../components/site/styles'

const DIGITS = [
  { char: '4', color: '#1a5f7a', delay: '0.2s' },
  { char: '0', color: '#e38154', delay: '0.45s' },
  { char: '4', color: '#1a5f7a', delay: '0.7s' },
]

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <PublicLayout>
      <main className="relative overflow-hidden px-4 py-14 text-center md:px-10 md:py-24">
        <FloatingIcons />

        <div className="relative z-10 mx-auto max-w-[640px]">
          <img src="/logo-feuille.svg" alt="" className="anim-soft-in mx-auto mb-7 h-[76px]" />

          <div className="mb-5 font-display text-[68px] font-extrabold leading-none tracking-[-0.06em] sm:text-[80px] md:text-[140px]">
            {DIGITS.map((digit, i) => (
              <span
                key={i}
                className="anim-die-drop inline-block"
                style={{ color: digit.color, animationDelay: digit.delay }}
              >
                {digit.char}
              </span>
            ))}
          </div>

          <h1
            className="anim-soft-in mb-4 font-display text-[21px] font-extrabold leading-[1.15] tracking-[-0.035em] sm:text-[24px] md:text-[34px]"
            style={{ animationDelay: '0.9s' }}
          >
            Oups, cette page s'est perdue dans la ludothèque !
          </h1>
          <p
            className="anim-soft-in mx-auto mb-8 max-w-[30em] text-base font-medium leading-[1.65] text-slate-500"
            style={{ animationDelay: '1s' }}
          >
            On a cherché dans toutes les boîtes de jeux, mais cette page est introuvable.
            Peut-être qu'elle est rangée au mauvais endroit ?
          </p>

          <div className="anim-soft-in flex flex-wrap justify-center gap-3.5" style={{ animationDelay: '1.1s' }}>
            <button onClick={() => navigate('/')} className={BTN_TEAL}>
              Retour à l'accueil
            </button>
            <button onClick={() => navigate('/catalogue')} className={BTN_PRIMARY}>
              Voir notre catalogue
            </button>
          </div>
        </div>
      </main>
    </PublicLayout>
  )
}
