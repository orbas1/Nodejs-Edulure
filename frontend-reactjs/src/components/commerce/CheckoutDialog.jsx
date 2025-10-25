import { useEffect, useMemo, useRef } from 'react';

import { CheckCircleIcon, CreditCardIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function CheckoutDialog({
  open,
  onClose,
  product,
  status,
  pending,
  onSubmit,
  children,
  priceSummary,
  blockingIssues = [],
  onPrefetch
}) {
  const title = product?.title ?? 'Secure checkout';
  const subtitle = product?.subtitle ?? product?.description ?? null;
  const Icon = product?.icon ?? CreditCardIcon;
  const blockingList = useMemo(
    () => (Array.isArray(blockingIssues) ? blockingIssues.filter(Boolean) : []),
    [blockingIssues]
  );
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open || typeof onPrefetch !== 'function') {
      return;
    }
    onPrefetch();
  }, [onPrefetch, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key === 'Tab' && focusable?.length) {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-end bg-slate-900/40 px-4 py-6"
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-dialog-title"
        aria-describedby="checkout-dialog-description"
        className="relative flex w-full max-w-xl flex-col gap-6 rounded-4xl border border-slate-200 bg-white/95 p-6 shadow-2xl"
      >
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
            <p id="checkout-dialog-description" className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Checkout
            </p>
            <h3 id="checkout-dialog-title" className="text-xl font-semibold text-slate-900">
              {title}
            </h3>
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
        </header>

        {priceSummary ? <div className="-mt-2">{priceSummary}</div> : null}

        {blockingList.length ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Resolve the following before completing checkout:</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {blockingList.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={onSubmit}>
          {typeof children === 'function' ? children({ pending, blocking: blockingList }) : children}
        </form>

        {status ? (
          <div
            className={clsx('flex items-start gap-2 rounded-3xl px-4 py-3 text-sm font-medium', {
              'border border-emerald-200 bg-emerald-50 text-emerald-700': status.type === 'success',
              'border border-rose-200 bg-rose-50 text-rose-700': status.type === 'error',
              'border border-primary/30 bg-primary/10 text-primary': status.type === 'pending'
            })}
            role="status"
            aria-live="polite"
          >
            {status.type === 'success' ? <CheckCircleIcon className="mt-0.5 h-4 w-4" aria-hidden="true" /> : null}
            <span>{status.message}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
