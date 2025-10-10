export default function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-180px)] max-w-6xl items-center justify-center px-6 py-16">
      <div className="grid w-full gap-12 rounded-4xl border border-slate-200 bg-white/80 p-10 shadow-2xl backdrop-blur md:grid-cols-2">
        <div className="space-y-8">
          <img
            src="https://i.ibb.co/twQyCm1N/Edulure-Logo.png"
            alt="Edulure logo"
            className="h-10"
          />
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-3 text-sm text-slate-600">{subtitle}</p>
          </div>
          <ul className="space-y-4 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              Secure SSO, MFA, and contextual access for every workspace.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              Unified profiles, payment history, and engagement insights ready to sync with your CRM.
            </li>
          </ul>
        </div>
        <div className="space-y-8">
          {children}
          <p className="text-xs text-slate-500">
            By continuing you agree to Edulure's{' '}
            <a href="/terms" className="font-semibold text-primary">
              Terms
            </a>{' '}
            and{' '}
            <a href="/privacy" className="font-semibold text-primary">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
