import PropTypes from 'prop-types';

export default function PageHero({ title, description, subtitle, cta }) {
  const heroDescription = description ?? subtitle;

  return (
    <section className="bg-gradient-to-br from-white via-white to-primary/5">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-24 lg:flex-row lg:items-center">
        <div className="w-full lg:w-1/2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
            Edulure Platform
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            {title}
          </h1>
          {heroDescription && <p className="mt-6 text-lg leading-8 text-slate-600">{heroDescription}</p>}
          {cta ? <div className="mt-10 flex flex-wrap items-center gap-4">{cta}</div> : null}
        </div>
        <div className="w-full lg:w-1/2">
          <div className="relative mx-auto max-w-lg">
            <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -right-10 bottom-0 h-24 w-24 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white/80 shadow-2xl backdrop-blur">
              <img
                src="https://images.unsplash.com/photo-1529074963764-98f45c47344b?auto=format&fit=crop&w=1200&q=80"
                alt="Edulure experience"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

PageHero.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  subtitle: PropTypes.string,
  cta: PropTypes.node
};

PageHero.defaultProps = {
  description: undefined,
  subtitle: undefined,
  cta: null
};
