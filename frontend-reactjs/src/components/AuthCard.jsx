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
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl items-center justify-center px-6 py-16">
      <div className="grid w-full gap-12 rounded-4xl border border-slate-200 bg-white/85 p-10 shadow-2xl backdrop-blur md:grid-cols-2 md:p-12">
        <div className="space-y-6">
          <div>
            {badge && (
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                {badge}
              </span>
            )}
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-3 text-sm text-slate-600">{subtitle}</p>
          </div>
          <ul className="space-y-3 text-sm text-slate-600">
            {highlightItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-8">
          {children}
          <div className="space-y-3 text-xs text-slate-500">
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
