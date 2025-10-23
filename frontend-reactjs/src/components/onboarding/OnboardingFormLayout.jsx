import PropTypes from 'prop-types';

export default function OnboardingFormLayout({ title, description, highlights, children, aside }) {
  const highlightItems = Array.isArray(highlights) && highlights.length ? highlights : null;
  return (
    <section className="rounded-4xl border border-slate-200 bg-white/90 shadow-2xl">
      <div className="grid gap-10 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <header className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Guided onboarding
            </span>
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            {description ? <p className="text-sm text-slate-600">{description}</p> : null}
          </header>
          {highlightItems ? (
            <ul className="grid gap-2 text-sm text-slate-600">
              {highlightItems.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-6">{children}</div>
        </div>
        {aside ? (
          <aside className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
            {aside}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

OnboardingFormLayout.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  highlights: PropTypes.arrayOf(PropTypes.string),
  children: PropTypes.node.isRequired,
  aside: PropTypes.node
};

OnboardingFormLayout.defaultProps = {
  description: undefined,
  highlights: undefined,
  aside: null
};
