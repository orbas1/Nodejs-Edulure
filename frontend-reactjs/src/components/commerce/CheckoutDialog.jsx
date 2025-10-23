import {
  CheckCircleIcon,
  CreditCardIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function CheckoutDialog({
  open,
  onClose,
  product,
  status,
  pending,
  onSubmit,
  children,
  priceSummary
}) {
  if (!open) {
    return null;
  }

  const title = product?.title ?? 'Secure checkout';
  const subtitle = product?.subtitle ?? product?.description ?? null;
  const Icon = product?.icon ?? CreditCardIcon;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/40 px-4 py-6">
      <div className="relative flex w-full max-w-xl flex-col gap-6 rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:text-rose-500"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Close checkout</span>
        </button>

        <header className="flex items-start gap-3">
          <span className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Checkout</p>
            <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </header>

        {priceSummary ? <div className="-mt-2">{priceSummary}</div> : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          {typeof children === 'function' ? children({ pending }) : children}
        </form>

        {status ? (
          <div
            className={clsx('flex items-start gap-2 rounded-3xl px-4 py-3 text-sm font-medium', {
              'border border-emerald-200 bg-emerald-50 text-emerald-700': status.type === 'success',
              'border border-rose-200 bg-rose-50 text-rose-700': status.type === 'error',
              'border border-primary/30 bg-primary/10 text-primary': status.type === 'pending'
            })}
          >
            {status.type === 'success' ? <CheckCircleIcon className="mt-0.5 h-4 w-4" aria-hidden="true" /> : null}
            <span>{status.message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
