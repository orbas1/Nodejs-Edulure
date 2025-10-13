import PropTypes from 'prop-types';

const PROVIDERS = [
  {
    id: 'google',
    label: 'Continue with Google',
    description: 'Use your Google Workspace or Gmail identity',
    accent: 'from-[#f6f9fe] to-[#e3eeff]',
    textClass: 'text-slate-700'
  },
  {
    id: 'apple',
    label: 'Sign in with Apple',
    description: 'Secure with Face ID and device-level approval',
    accent: 'from-[#f5f5f7] to-[#eaeaec]',
    textClass: 'text-slate-900'
  },
  {
    id: 'facebook',
    label: 'Continue with Facebook',
    description: 'Tap into your creator or community profile',
    accent: 'from-[#f4f8ff] to-[#e6efff]',
    textClass: 'text-slate-700'
  },
  {
    id: 'linkedin',
    label: 'Continue with LinkedIn',
    description: 'Bring your professional reputation and endorsements',
    accent: 'from-[#f2f9ff] to-[#e2f2ff]',
    textClass: 'text-slate-700'
  }
];

export default function SocialSignOn({ onSelect }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Single sign-on</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => onSelect(provider.id)}
            className={`group flex flex-col items-start rounded-3xl border border-slate-200 bg-gradient-to-br px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg ${provider.accent}`}
          >
            <span className={`text-sm font-semibold ${provider.textClass}`}>{provider.label}</span>
            <span className="mt-1 text-xs text-slate-500">{provider.description}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Launch
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 transition group-hover:translate-x-1"
                aria-hidden="true"
              >
                <path d="M5.75 4a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 .75.75v8.5a.75.75 0 0 1-1.5 0V6.56l-9.22 9.22a.75.75 0 1 1-1.06-1.06l9.22-9.22H5.75A.75.75 0 0 1 5 4.75.75.75 0 0 1 5.75 4Z" />
              </svg>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

SocialSignOn.propTypes = {
  onSelect: PropTypes.func
};

SocialSignOn.defaultProps = {
  onSelect: () => {}
};
