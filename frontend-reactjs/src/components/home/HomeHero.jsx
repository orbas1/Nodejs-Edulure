import { useLanguage } from '../../context/LanguageContext.jsx';
import PrimaryHero from '../marketing/PrimaryHero.jsx';
import LanguageSelector from '../navigation/LanguageSelector.jsx';
import HomeHeroMedia from './HomeHeroMedia.jsx';

const CHIP_KEYS = [
  { key: 'home.hero.chips.communities', fallback: 'Communities' },
  { key: 'home.hero.chips.courses', fallback: 'Courses' },
  { key: 'home.hero.chips.ebooks', fallback: 'E-books' },
  { key: 'home.hero.chips.tutors', fallback: '1:1 Tutors' }
];

export default function HomeHero() {
  const { t } = useLanguage();

  const headline = t('home.hero.headline', 'Learn, teach, and build together.');
  const subhead = t('home.hero.subhead', 'Swap playbooks, host live jams, and grow with peers on Edulure.');
  const primaryCta = t('home.hero.ctaPrimary', 'Get started');
  const secondaryCta = t('home.hero.ctaSecondary', 'Preview the community');
  const instructorLabel = t('home.hero.instructorPill', "I'm an instructor");

  const chips = CHIP_KEYS.map(({ key, fallback }) => t(key, fallback)).filter(Boolean);

  return (
    <div className="bg-slate-950">
      <PrimaryHero
        surface="home-hero"
        variant="dark"
        title={headline}
        subtitle={subhead}
        badge={t('home.hero.status', 'Built for cohort-based learning')}
        chips={chips}
        primaryCta={{
          label: primaryCta,
          to: '/register',
          analytics: { label: 'hero_register', action: 'click', plan: 'home-starter' }
        }}
        secondaryCta={{
          label: secondaryCta,
          to: '/feed',
          analytics: { label: 'hero_preview', action: 'click', plan: 'home-preview' }
        }}
        tertiaryCta={{
          label: instructorLabel,
          href: '#instructor',
          analytics: { label: 'hero_instructor', action: 'click', plan: 'instructor' }
        }}
        meta={<LanguageSelector size="compact" variant="dark" align="end" />}
        metaClassName="hidden sm:inline-flex"
        media={<HomeHeroMedia t={t} />}
        footer={
          <div className="flex flex-col gap-3 sm:hidden">
            <LanguageSelector size="compact" variant="dark" align="start" fullWidth />
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {t('home.hero.mobileFooter', 'Operate your learnspace in any supported language.')}
            </p>
          </div>
        }
        analytics={{ hero: 'home-primary', locale: t('language.code', 'en') }}
      />
    </div>
  );
}
