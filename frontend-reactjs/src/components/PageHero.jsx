import PropTypes from 'prop-types';

export default function PageHero({ title, description, subtitle, cta }) {
  const heroDescription = description ?? subtitle;
  const bodyCopy = heroDescription;
  const roleBadges = ['Operators', 'Instructors', 'Creators'];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 translate-x-1/4 rounded-full bg-fuchsia-500/20 blur-[140px]" />
        <div className="absolute -bottom-28 left-0 h-72 w-72 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-6 py-24 lg:flex-row lg:items-center">
        <div className="w-full lg:w-1/2">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            Enterprise learning OS
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {bodyCopy ? <p className="mt-6 text-lg leading-8 text-slate-200">{bodyCopy}</p> : null}
          {cta ? <div className="mt-10 flex flex-wrap items-center gap-4">{cta}</div> : null}
          <div className="mt-8 flex items-center gap-4 text-sm text-white/80">
            {["Strategists", "Designers", "Founders", "Mentors"].map((label) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {heroDescription && (
            <p className="mt-6 max-w-xl text-base leading-7 text-white/80 md:text-lg md:leading-8">
              {heroDescription}
            </p>
          )}
          {cta ? <div className="mt-8 flex flex-wrap items-center gap-4">{cta}</div> : null}
          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-white/80">
            {roleBadges.map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-1/2">
          <div className="relative mx-auto max-w-xl">
            <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-primary/40 blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-emerald-500/30 blur-3xl" />
            <div className="relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 shadow-[0_45px_90px_-40px_rgba(56,189,248,0.7)] backdrop-blur-xl">
              <img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80"
                alt="Creators collaborating in an online session"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 to-transparent p-6 text-sm text-white/80">
                <p className="font-semibold text-white">Sessions that feel like a shared studio</p>
                <p className="mt-1 text-xs text-white/70">Live workshops, async circles, and mentor huddles—captured from the community feed.</p>
              </div>
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
