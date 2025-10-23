import PropTypes from 'prop-types';

const DEFAULT_HIGHLIGHTS = [
  'Enterprise-grade security with SSO and audit trails',
  'Role-based access controls tuned for learning operators',
  'Human support that responds within the hour'
];

export default function AuthCard({
  title,
  subtitle,
  highlights,
  badge,
  supportEmail,
  footnote,
  children
}) {
  const highlightItems = highlights?.length ? highlights : DEFAULT_HIGHLIGHTS;
  const safeFootnote =
    footnote ??
    (supportEmail
      ? `Need help? Email ${supportEmail} and our team will respond within the hour.`
      : 'Need a hand? Our support team is available 24/7.');

  return (
    <section className="form-shell">
      <div className="mx-auto max-w-6xl px-responsive-edge">
        <div className="form-shell-inner" data-layout="two-column">
          <div className="space-y-6 text-slate-900">
            <div className="space-y-4">
              {badge ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-primary">
                  {badge}
                </span>
              ) : null}
              <h1 className="text-3xl font-semibold leading-tight">{title}</h1>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              {highlightItems.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/40 bg-white/30 px-4 py-3 shadow-[0_12px_32px_-24px_rgba(45,98,255,0.4)]">
                  <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    •
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-8">
            {children}
            <div className="space-y-3 form-footnote">
              <p>
                By continuing you agree to Edulure&apos;s{' '}
                <a href="/terms" className="font-semibold text-primary">
                  Terms
                </a>{' '}
                and{' '}
                <a href="/privacy" className="font-semibold text-primary">
                  Privacy Policy
                </a>
                .
              </p>
              <p>{safeFootnote}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

AuthCard.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  highlights: PropTypes.arrayOf(PropTypes.string),
  badge: PropTypes.string,
  supportEmail: PropTypes.string,
  footnote: PropTypes.string,
  children: PropTypes.node.isRequired
};

AuthCard.defaultProps = {
  highlights: undefined,
  badge: undefined,
  supportEmail: undefined,
  footnote: undefined
};
