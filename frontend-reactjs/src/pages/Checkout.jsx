import { useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement } from '@stripe/react-stripe-js';

import { createOrder, captureOrder } from '../api/commerce.js';
import { useAuth } from '../context/AuthContext.jsx';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const catalogue = [
  {
    id: 'course-pro-launch',
    itemType: 'course',
    name: 'Course Launch Intensive',
    description: 'Six-week cohort covering curriculum design, launch analytics, and monetisation blueprints.',
    unitAmount: 499,
    mandatory: true
  },
  {
    id: 'ebook-growth-ops',
    itemType: 'ebook',
    name: 'Growth Operating Playbook',
    description: '200-page workbook with funnel templates, retention experiments, and analytics scorecards.',
    unitAmount: 79,
    mandatory: true
  },
  {
    id: 'live-coaching',
    itemType: 'addon',
    name: '1:1 Strategy Coaching Session',
    description: 'A 60-minute strategy workshop with an Edulure launch specialist. Optional but highly recommended.',
    unitAmount: 189,
    mandatory: false
  }
];

const providerOptions = [
  { id: 'stripe', name: 'Stripe (card, Apple Pay, Google Pay)' },
  { id: 'paypal', name: 'PayPal (wallet + installments)' }
];

const currencyOptions = [
  { id: 'USD', label: 'USD — $' },
  { id: 'EUR', label: 'EUR — €' },
  { id: 'GBP', label: 'GBP — £' }
];

function formatCurrency(value, currency) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(value);
}

export default function Checkout() {
  const { session, isAuthenticated } = useAuth();
  const [items, setItems] = useState(() =>
    catalogue.map((item) => ({
      ...item,
      quantity: 1,
      selected: item.mandatory
    }))
  );
  const [currency, setCurrency] = useState('USD');
  const [provider, setProvider] = useState('stripe');
  const [couponCode, setCouponCode] = useState('');
  const [billingCountry, setBillingCountry] = useState('US');
  const [billingRegion, setBillingRegion] = useState('CA');
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);

  const activeItems = useMemo(
    () => items.filter((item) => item.selected).map((item) => ({ ...item, quantity: Math.max(1, item.quantity) })),
    [items]
  );

  const previewTotals = useMemo(() => {
    const subtotal = activeItems.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    return {
      subtotal,
      currency
    };
  }, [activeItems, currency]);

  const handleToggleItem = (id) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id && !item.mandatory ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleQuantityChange = (id, value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return;
    }
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, quantity: parsed } : item)));
  };

  const submitOrder = async () => {
    setStatus(null);
    if (!activeItems.length) {
      setStatus({ type: 'error', message: 'Select at least one product to continue.' });
      return;
    }

    const payload = {
      currency,
      paymentProvider: provider,
      couponCode: couponCode.trim() || undefined,
      billing: {
        email: session?.user?.email ?? undefined,
        country: billingCountry || undefined,
        region: billingRegion || undefined
      },
      items: activeItems.map((item) => ({
        itemType: item.itemType,
        itemId: item.id,
        name: item.name,
        unitAmount: item.unitAmount,
        quantity: item.quantity,
        metadata: {
          description: item.description
        }
      }))
    };

    setIsSubmitting(true);
    try {
      const token = session?.tokens?.accessToken;
      const data = await createOrder(payload, { token });
      setOrder(data.order);
      setPayment(data.payment);
      setStatus({
        type: 'success',
        message:
          data.payment.provider === 'stripe'
            ? 'Order created. Complete the secure card form below to finish payment.'
            : 'Order created. Continue with PayPal to finalise payment.'
      });
    } catch (error) {
      setStatus({ type: 'error', message: error.message ?? 'Failed to create order.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const capture = async () => {
    if (!order?.orderNumber) return;
    setIsSubmitting(true);
    try {
      const token = session?.tokens?.accessToken;
      const result = await captureOrder(order.orderNumber, { token });
      setOrder(result);
      setStatus({ type: 'success', message: 'Payment captured successfully.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message ?? 'Failed to capture payment.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-50/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold text-slate-900">Commerce Checkout Orchestrator</h1>
            <p className="text-base text-slate-600">
              Configure a multi-product order, generate secure intents for Stripe or PayPal, and preview the
              tax, discount, and capture lifecycle that mirrors the production Edulure commerce stack.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Products</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mandatory items are pre-selected. Toggle add-ons or adjust quantities to simulate bundles and
              upsells.
            </p>
            <div className="mt-6 space-y-6">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => handleToggleItem(item.id)}
                        disabled={item.mandatory}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.name}</h3>
                        <p className="text-sm text-slate-500">{item.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-slate-500" htmlFor={`quantity-${item.id}`}>
                      Qty
                    </label>
                    <input
                      id={`quantity-${item.id}`}
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(event) => handleQuantityChange(item.id, event.target.value)}
                      disabled={!item.selected}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm font-semibold text-slate-700 focus:border-primary focus:ring-primary"
                    />
                    <span className="text-base font-semibold text-slate-900">
                      {formatCurrency(item.unitAmount, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Checkout Preferences</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-600">
                Currency
                <select
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-primary"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-600">
                Payment provider
                <select
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-primary"
                >
                  {providerOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-600">
                Coupon code
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-primary"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  Country
                  <input
                    value={billingCountry}
                    onChange={(event) => setBillingCountry(event.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase text-slate-700 focus:border-primary focus:ring-primary"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-600">
                  Region/State
                  <input
                    value={billingRegion}
                    onChange={(event) => setBillingRegion(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:ring-primary"
                  />
                </label>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={submitOrder}
                disabled={isSubmitting || !isAuthenticated}
                className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isAuthenticated ? 'Generate secure intent' : 'Log in to place order'}
              </button>
              <p className="text-xs text-slate-500">
                Subtotal: <span className="font-semibold text-slate-700">{formatCurrency(previewTotals.subtotal, currency)}</span>
              </p>
            </div>
            {!isAuthenticated && (
              <p className="mt-3 text-xs text-rose-500">
                You must be signed in to request checkout intents. Use the demo credentials from the admin console to
                explore the flow end-to-end.
              </p>
            )}
            {status && (
              <p
                className={`mt-4 text-sm font-medium ${
                  status.type === 'error' ? 'text-rose-500' : 'text-emerald-600'
                }`}
              >
                {status.message}
              </p>
            )}
          </div>

          {order && (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
              <h2 className="text-xl font-semibold text-slate-900">Order outcome</h2>
              <dl className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Order number</dt>
                  <dd className="text-slate-900">{order.orderNumber}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Status</dt>
                  <dd className="capitalize text-slate-900">{order.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Subtotal</dt>
                  <dd>{formatCurrency(order.subtotalAmount, order.currency)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Tax</dt>
                  <dd>{formatCurrency(order.taxAmount, order.currency)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Discount</dt>
                  <dd>{formatCurrency(order.discountAmount, order.currency)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Total</dt>
                  <dd className="text-lg font-semibold text-slate-900">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </dd>
                </div>
              </dl>
              {payment?.provider === 'paypal' && payment.approvalUrl && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  <p className="font-semibold">Continue on PayPal</p>
                  <p className="mt-1">
                    A secure PayPal approval link has been generated. Open the link below to authorise the payment with
                    your sandbox wallet.
                  </p>
                  <a
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-card hover:bg-amber-700"
                    href={payment.approvalUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open PayPal checkout ↗
                  </a>
                </div>
              )}
              {payment?.provider === 'stripe' && payment.clientSecret && stripePromise && (
                <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-700">Secure card capture</p>
                  <p className="text-xs text-slate-500">
                    Use Stripe test cards such as <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">4242 4242 4242 4242</code>{' '}
                    with any future expiry date and CVC to simulate a payment. Capturing the payment updates the order
                    and coupon analytics instantly.
                  </p>
                  <Elements
                    key={payment.clientSecret}
                    stripe={stripePromise}
                    options={{
                      clientSecret: payment.clientSecret,
                      appearance: { theme: 'stripe' }
                    }}
                  >
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <PaymentElement />
                    </div>
                  </Elements>
                  <button
                    type="button"
                    onClick={capture}
                    disabled={isSubmitting}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-card hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Capture payment
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Order preview</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {activeItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">
                    {item.name} × {item.quantity}
                  </span>
                  <span>{formatCurrency(item.unitAmount * item.quantity, currency)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span>Estimated subtotal</span>
                <span className="font-semibold text-slate-700">
                  {formatCurrency(previewTotals.subtotal, previewTotals.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Coupons &amp; taxes</span>
                <span className="text-xs">Calculated on submission</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <h2 className="text-xl font-semibold text-slate-900">Operational guidance</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>
                <span className="font-semibold text-slate-700">Stripe best practice:</span> assign realistic
                metadata (course IDs, cohort IDs) so downstream fulfilment and analytics remain deterministic.
              </li>
              <li>
                <span className="font-semibold text-slate-700">PayPal wallet strategy:</span> use pay-in-3 or
                pay-later features to test refund windows, dispute resolution, and ledger reconciliation.
              </li>
              <li>
                <span className="font-semibold text-slate-700">Capture policies:</span> finance teams can stage
                delayed captures by waiting for mentor approval or inventory checks before executing the capture call.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
