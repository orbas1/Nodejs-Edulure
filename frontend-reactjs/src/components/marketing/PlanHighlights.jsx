import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

import HomeSection from '../home/HomeSection.jsx';

export default function PlanHighlights({
  eyebrow,
  title,
  subtitle,
  plans,
  cta,
  disclaimer
}) {
  return (
    <section className="marketing-hero marketing-shell">
      <div className="absolute left-1/4 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
      <div className="absolute bottom-10 right-10 h-72 w-72 translate-x-1/2 rounded-full bg-fuchsia-500/20 blur-[140px]" aria-hidden="true" />
      <HomeSection className="relative flex flex-col gap-16">
        <div className="mx-auto max-w-2xl text-center">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">{eyebrow}</p>
          ) : null}
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mt-4 text-base text-white/70">{subtitle}</p> : null}
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={clsx(
                'marketing-card relative flex h-full flex-col justify-between p-8',
                'bg-gradient-to-br',
                plan.accent ?? 'from-primary/20 via-transparent to-white/10',
                plan.border ?? 'border-white/15',
                plan.shadow ?? 'shadow-[0_32px_84px_-42px_rgba(15,23,42,0.65)]'
              )}
            >
              {plan.icon ? (
                <div className="absolute inset-x-6 -top-6 flex justify-center">
                  <span className="inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/20 bg-white/10 text-3xl">
                    {plan.icon}
                  </span>
                </div>
              ) : null}
              <div className="mt-10 flex flex-col gap-5">
                <div>
                  <h3 className="text-xl font-semibold text-white">{plan.heading}</h3>
                  {plan.tagline ? <p className="mt-2 text-sm text-white/70">{plan.tagline}</p> : null}
                </div>
                {plan.price ? (
                  <p className="text-sm font-medium uppercase tracking-[0.35em] text-white/60">{plan.price}</p>
                ) : null}
                {plan.features?.length ? (
                  <ul className="mt-4 space-y-3 text-sm text-white/80">
                    {plan.features.map((feature, index) => (
                      <li key={`${plan.id}-feature-${index}`} className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-2.5 w-2.5 flex-none rounded-full bg-white/70" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {plan.note ? (
                <div className="mt-8 text-xs text-white/60">{plan.note}</div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 text-sm text-white/80">
          {cta ? (
            <Link
              to={cta.to}
              className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2.5 font-semibold transition hover:border-white/60 hover:bg-white/20"
            >
              {cta.icon ? <span aria-hidden="true">{cta.icon}</span> : null}
              {cta.label}
            </Link>
          ) : null}
          {disclaimer ? <span className="text-xs text-white/50">{disclaimer}</span> : null}
        </div>
      </HomeSection>
    </section>
  );
}

const planShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  icon: PropTypes.node,
  accent: PropTypes.string,
  border: PropTypes.string,
  shadow: PropTypes.string,
  heading: PropTypes.string.isRequired,
  tagline: PropTypes.string,
  price: PropTypes.string,
  features: PropTypes.arrayOf(PropTypes.string),
  note: PropTypes.string
});

PlanHighlights.propTypes = {
  eyebrow: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  plans: PropTypes.arrayOf(planShape).isRequired,
  cta: PropTypes.shape({
    to: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    icon: PropTypes.node
  }),
  disclaimer: PropTypes.string
};

PlanHighlights.defaultProps = {
  eyebrow: undefined,
  subtitle: undefined,
  cta: null,
  disclaimer: undefined
};
