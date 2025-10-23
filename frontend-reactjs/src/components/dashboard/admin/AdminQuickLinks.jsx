import clsx from 'clsx';

function toneToClasses(tone = 'neutral') {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'info':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

export default function AdminQuickLinks({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">Quick links</h2>
      </div>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={item.href ?? '#'}
              className={clsx(
                'group block rounded-2xl border p-4 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                toneToClasses(item.tone)
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-current">{item.label}</p>
                  {item.description ? (
                    <p className="mt-1 text-xs text-current/80">{item.description}</p>
                  ) : null}
                </div>
                {item.badge ? (
                  <span className="rounded-full border border-current/20 bg-white/70 px-3 py-1 text-xs font-semibold text-current/80">
                    {item.badge}
                  </span>
                ) : null}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

