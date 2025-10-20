import { BookOpenIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/outline';
import builderNotebookCover from '../../assets/home/ebooks/builder-notebook.svg';
import communityCookbookCover from '../../assets/home/ebooks/community-cookbook.svg';
import remixAtlasCover from '../../assets/home/ebooks/remix-atlas.svg';
import { useTranslate } from '../../context/LanguageContext.jsx';
import HomeSection from './HomeSection.jsx';

const cards = [
  {
    id: 'builderNotebook',
    cover: builderNotebookCover,
    accent: 'from-orange-400 via-pink-500 to-indigo-500',
    stickerKey: 'new'
  },
  {
    id: 'communityCookbook',
    cover: communityCookbookCover,
    accent: 'from-cyan-400 via-emerald-400 to-amber-200',
    stickerKey: 'trending'
  },
  {
    id: 'remixAtlas',
    cover: remixAtlasCover,
    accent: 'from-indigo-500 via-pink-500 to-amber-500',
    stickerKey: 'remixable'
  }
];

const readerBullets = ['discovery', 'sync', 'community'];
const creatorBullets = ['publish', 'analytics', 'revenue'];

export default function EbookShowcase() {
  const t = useTranslate();

  return (
    <section className="relative overflow-hidden bg-white" aria-labelledby="ebooks-heading">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-pink-200/30 blur-3xl" aria-hidden="true" />
      <HomeSection>
        <div className="md:flex md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              {t('home.ebooks.tagline')}
            </p>
            <h2 id="ebooks-heading" className="mt-4 text-3xl font-semibold text-slate-900 md:text-4xl">
              {t('home.ebooks.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">{t('home.ebooks.subtitle')}</p>
          </div>
          <div className="mt-6 flex items-center gap-3 md:mt-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UsersIcon aria-hidden="true" className="h-5 w-5" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t('home.ebooks.meta')}
            </span>
          </div>
        </div>

        <div className="relative mt-12">
          <div
            className="-mx-6 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label={t('home.ebooks.carouselLabel')}
          >
            <div className="flex snap-x snap-mandatory gap-8 pb-6">
              {cards.map((card) => (
                <article
                  key={card.id}
                  className="group relative w-72 shrink-0 snap-center rounded-[32px] border border-white/40 bg-gradient-to-br p-[2px] shadow-[0_30px_70px_-30px_rgba(15,23,42,0.45)]"
                >
                  <div className={`rounded-[30px] bg-gradient-to-br ${card.accent} p-3`}> 
                    <div className="relative overflow-hidden rounded-[26px] bg-white/10 shadow-lg">
                      <img
                        src={card.cover}
                        alt={t(`home.ebooks.cards.${card.id}.alt`)}
                        className="h-80 w-full object-cover"
                      />
                      <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-800 shadow">
                        <SparklesIcon aria-hidden="true" className="h-4 w-4 text-primary" />
                        {t(`home.ebooks.stickers.${card.stickerKey}`)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 space-y-2 px-4 pb-6">
                    <span className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t(`home.ebooks.cards.${card.id}.tag`)}
                    </span>
                    <h3 className="text-xl font-semibold text-slate-900">
                      {t(`home.ebooks.cards.${card.id}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {t(`home.ebooks.cards.${card.id}.description`)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
            <div className="space-y-6 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
                  <BookOpenIcon aria-hidden="true" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                    {t('home.ebooks.panels.readers.label')}
                  </p>
                  <h3 className="text-2xl font-semibold">{t('home.ebooks.panels.readers.title')}</h3>
                </div>
              </div>
              <ul className="space-y-4 text-sm leading-relaxed">
                {readerBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{t(`home.ebooks.panels.readers.bullets.${bullet}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
            <div className="space-y-6 p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <SparklesIcon aria-hidden="true" className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {t('home.ebooks.panels.creators.label')}
                  </p>
                  <h3 className="text-2xl font-semibold text-slate-900">{t('home.ebooks.panels.creators.title')}</h3>
                </div>
              </div>
              <ul className="space-y-4 text-sm leading-relaxed text-slate-600">
                {creatorBullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{t(`home.ebooks.panels.creators.bullets.${bullet}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </HomeSection>
    </section>
  );
}
