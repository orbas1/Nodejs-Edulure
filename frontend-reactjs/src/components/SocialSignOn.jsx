import PropTypes from 'prop-types';

const PROVIDERS = [
  {
    id: 'google',
    label: 'Sign in with Google',
    buttonClass:
      'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 focus-visible:ring-[#4285F4] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.4-5.26C33.66 3.42 29.28 1.5 24 1.5 14.88 1.5 7.2 6.98 3.8 14.44l6.56 5.09C12.12 13.64 17.52 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.64-.15-3.2-.43-4.7H24v9.02h12.7c-.55 2.82-2.17 5.2-4.61 6.8l7.18 5.57C43.95 37.06 46.5 31.3 46.5 24.5z" />
        <path fill="#FBBC05" d="M10.36 28.53a14.5 14.5 0 0 1-.78-4.53c0-1.58.28-3.11.77-4.53L3.8 14.44A23.94 23.94 0 0 0 .5 24c0 3.8.91 7.37 3.3 10.56z" />
        <path fill="#34A853" d="M24 46.5c6.48 0 11.92-2.14 15.88-5.87l-7.18-5.57c-2 1.35-4.58 2.17-8.7 2.17-6.48 0-11.9-4.14-13.6-9.87l-6.56 5.09C7.2 41.02 14.88 46.5 24 46.5z" />
      </svg>
    )
  },
  {
    id: 'apple',
    label: 'Sign in with Apple',
    buttonClass:
      'bg-black text-white border-transparent hover:bg-[#111111] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M12.906 8.534c-.014-1.49.674-2.613 2.056-3.438-.773-1.14-1.935-1.766-3.467-1.883-1.454-.116-3.052.846-3.63.846-.605 0-2.005-.806-3.08-.806C2.607 3.267.02 4.977.02 8.57c0 1.124.206 2.283.618 3.476.552 1.49 2.546 5.142 4.62 5.082 1.09-.026 1.862-.77 3.286-.77 1.39 0 2.107.77 3.08.77 2.09-.03 3.874-3.29 4.403-4.785-2.82-1.325-3.12-3.898-3.12-3.808z" />
        <path d="M10.714 2.3c.946-1.114.861-2.124.834-2.3-.816.048-1.76.56-2.312 1.236-.554.68-.88 1.52-.812 2.394.87.068 1.676-.372 2.29-1.33z" />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Sign in with Facebook',
    buttonClass:
      'bg-[#1877F2] text-white border-[#1877F2] hover:bg-[#0f5bd8] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1877F2]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.35C0 23.407.593 24 1.325 24h11.495v-9.294H9.69v-3.622h3.13V8.413c0-3.1 1.894-4.788 4.659-4.788 1.325 0 2.464.099 2.795.143v3.24h-1.918c-1.504 0-1.795.715-1.795 1.764v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.407 24 24 23.407 24 22.675V1.325C24 .593 23.407 0 22.675 0"
        />
      </svg>
    )
  },
  {
    id: 'linkedin',
    label: 'Sign in with LinkedIn',
    buttonClass:
      'bg-[#0A66C2] text-white border-[#0A66C2] hover:bg-[#084c91] focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A66C2]',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.451 20.451h-3.554v-5.569c0-1.328-.024-3.037-1.851-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.357V9h3.414v1.561h.049c.476-.9 1.637-1.851 3.369-1.851 3.602 0 4.268 2.371 4.268 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zm1.777 13.018H3.56V9h3.554v11.451zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
        />
      </svg>
    )
  }
];

export default function SocialSignOn({ onSelect, providers }) {
  const availableProviders = providers?.length ? providers : PROVIDERS;

  return (
    <div className="space-y-3">
      {availableProviders.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => !provider.disabled && onSelect(provider.id)}
          disabled={provider.disabled}
          className={`flex h-12 w-full items-center justify-center gap-3 rounded-full border px-4 text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring ${provider.buttonClass} ${
            provider.disabled ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
            {provider.icon}
          </span>
          <span>{provider.label}</span>
        </button>
      ))}
    </div>
  );
}

SocialSignOn.propTypes = {
  onSelect: PropTypes.func,
  providers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      buttonClass: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
      disabled: PropTypes.bool
    })
  )
};

SocialSignOn.defaultProps = {
  onSelect: () => {},
  providers: undefined
};
