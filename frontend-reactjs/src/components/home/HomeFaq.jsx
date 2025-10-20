import { useState } from 'react';
import clsx from 'clsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import mascotIllustration from '../../assets/home/faq/mascot.svg';

const FAQ_KEYS = [
  'orbit',
  'cohorts',
  'pricing',
  'support'
];

export default function HomeFaq() {
  const { t } = useLanguage();
  const [openKey, setOpenKey] = useState(FAQ_KEYS[0]);

  const toggle = (key) => {
    setOpenKey((current) => (current === key ? null : key));
  };

  return (
    <section className="relative overflow-hidden bg-slate-100 py-24">
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-slate-200/70 to-transparent" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 lg:grid-cols-[1fr_minmax(0,360px)] lg:items-center">
        <div className="flex flex-col gap-6 text-slate-900">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
            {t('home.faq.pretitle', 'FAQ')}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('home.faq.title', 'Wondering how Edulure fits your flow?')}
          </h2>
          <p className="text-base text-slate-600">
            {t(
              'home.faq.subtitle',
              'Tap on a bubble to see how other creators stitch Edulure into their day-to-day magic.'
            )}
          </p>
          <div className="mt-6 space-y-5">
            {FAQ_KEYS.map((key) => {
              const question = t(`home.faq.items.${key}.question`, 'What is the question?');
              const answer = t(
                `home.faq.items.${key}.answer`,
                'Here lives a thoughtful answer that helps learners feel confident.'
              );
              const isOpen = openKey === key;
              const buttonId = `home-faq-trigger-${key}`;
              const panelId = `home-faq-panel-${key}`;

              return (
                <div
                  key={key}
                  className={clsx(
                    'group relative rounded-3xl border border-slate-200 bg-white transition',
                    'before:absolute before:-bottom-3 before:left-10 before:h-6 before:w-6 before:rotate-45 before:rounded-md before:bg-white before:opacity-0 before:transition-opacity',
                    'after:absolute after:-bottom-[1.35rem] after:left-10 after:h-8 after:w-8 after:rotate-45 after:rounded-md after:border after:border-slate-200 after:bg-white after:opacity-0 after:transition-opacity',
                    isOpen &&
                      'border-primary/60 shadow-[0_18px_40px_-24px_rgba(30,64,175,0.45)] before:opacity-100 after:opacity-100 after:border-primary/60'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className="flex w-full items-start justify-between gap-4 rounded-3xl px-6 py-5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    id={buttonId}
                  >
                    <span className="text-sm font-semibold text-slate-900">{question}</span>
                    <span
                      className={clsx(
                        'inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-slate-200 text-lg transition',
                        isOpen ? 'rotate-45 border-primary/60 text-primary' : 'group-hover:border-slate-300'
                      )}
                      aria-hidden="true"
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className={clsx(
                      'px-6 pb-6 text-sm text-slate-600 transition-all duration-300 ease-in-out',
                      isOpen ? 'max-h-40 opacity-100' : 'max-h-0 overflow-hidden opacity-0'
                    )}
                    aria-hidden={!isOpen}
                  >
                    <p>{answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative flex items-center justify-center">
          <div className="absolute -top-20 right-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -bottom-14 left-6 h-32 w-32 rounded-full bg-fuchsia-300/30 blur-3xl" aria-hidden="true" />
          <div className="relative z-10 flex flex-col items-center gap-6 rounded-[3rem] border border-slate-200 bg-white px-10 py-12 text-center shadow-[0_35px_80px_-40px_rgba(30,64,175,0.45)]">
            <img
              src={mascotIllustration}
              alt={t('home.faq.mascotAlt', 'Playful mascot waving hello')}
              className="h-48 w-auto"
            />
            <p className="max-w-xs text-sm text-slate-600">
              {t(
                'home.faq.mascotCaption',
                'Our cosmic courier keeps track of your questions and beams answers back at light speed.'
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
