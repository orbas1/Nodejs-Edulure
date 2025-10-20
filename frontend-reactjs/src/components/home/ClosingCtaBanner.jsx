import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext.jsx';
import HomeSection from './HomeSection.jsx';

export default function ClosingCtaBanner() {
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-rose-500 to-indigo-600 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_60%)]" aria-hidden="true" />
      <div className="absolute inset-x-0 top-0 flex justify-center" aria-hidden="true">
        <div className="mt-4 flex gap-4">
          {[...Array(8)].map((_, index) => (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: ['#FDE68A', '#FCA5A5', '#FBCFE8', '#A5B4FC'][index % 4],
                opacity: 0.7,
                transform: `translateY(${index % 2 === 0 ? '0' : '12px'})`
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-12 bottom-6 flex justify-between text-xs uppercase tracking-[0.5em] text-white/30">
        <span>✷</span>
        <span>✦</span>
        <span>✺</span>
      </div>
      <HomeSection className="relative text-center" size="narrow" pad="cozy">
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/70">
          {t('home.closingCta.pretitle', 'Ready when you are')}
        </p>
        <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
          {t('home.closingCta.title', 'Let the sunset spark your next learning orbit')}
        </h2>
        <p className="mt-4 text-base text-white/80">
          {t(
            'home.closingCta.subtitle',
            'Lean into the glow—whether you are building your first circle or guiding a galaxy of learners, Edulure is ready.'
          )}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-full bg-white/95 px-6 py-3 text-sm font-semibold text-slate-900 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.6)] transition hover:bg-white"
          >
            {t('home.closingCta.ctaLearners', 'Start as a learner')}
          </Link>
          <Link
            to="/register?role=instructor"
            className="inline-flex items-center justify-center rounded-full border border-white/70 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20"
          >
            {t('home.closingCta.ctaInstructors', 'Launch as an instructor')}
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/70">
          {t('home.closingCta.footer', 'Dual launchpads, one vibrant universe.')}
        </p>
      </HomeSection>
    </section>
  );
}
