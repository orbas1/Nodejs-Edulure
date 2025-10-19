import { useEffect, useMemo, useState } from 'react';
import {
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const STORAGE_KEY = 'edulure.subscription-planner';

const DEFAULT_TIERS = [
  {
    id: 'free',
    name: 'Free tier',
    price: 0,
    billingCycle: 'Monthly',
    seats: 1,
    description: 'Perfect for trial classrooms, personal learning and experimenting with the Explorer.',
    features: ['Explorer saved searches (3)', 'Live classroom read-only access', 'Community participation in 1 hub']
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 49,
    billingCycle: 'Monthly',
    seats: 5,
    description: 'Adds unlimited saved searches, classroom hosting and tutor scheduling automation.',
    features: ['Unlimited explorer saves', 'Host 10 live classrooms monthly', 'Tutor CRM automations', 'Advanced analytics']
  }
];

function persistTiers(tiers) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tiers));
  } catch (error) {
    console.warn('Unable to persist subscription tiers', error);
  }
}

function loadStoredTiers() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    console.warn('Unable to parse stored tiers', error);
    return null;
  }
}

export default function SubscriptionPlanner() {
  const [tiers, setTiers] = useState(() => (typeof window !== 'undefined' ? loadStoredTiers() ?? DEFAULT_TIERS : DEFAULT_TIERS));
  const [isCreating, setIsCreating] = useState(false);
  const [draftTier, setDraftTier] = useState({ name: '', price: 0, billingCycle: 'Monthly', seats: 1, description: '', features: [] });
  const [editingId, setEditingId] = useState(null);
  const [featureDraft, setFeatureDraft] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    persistTiers(tiers);
  }, [tiers]);

  const freeTier = useMemo(() => tiers.find((tier) => tier.id === 'free') ?? tiers[0], [tiers]);

  const averagePrice = useMemo(() => {
    const paidTiers = tiers.filter((tier) => tier.price > 0);
    if (!paidTiers.length) return 0;
    const total = paidTiers.reduce((sum, tier) => sum + Number(tier.price ?? 0), 0);
    return total / paidTiers.length;
  }, [tiers]);

  const totalSeats = useMemo(() => tiers.reduce((sum, tier) => sum + Number(tier.seats ?? 0), 0), [tiers]);

  const handleCreateTier = (event) => {
    event.preventDefault();
    if (!draftTier.name.trim()) {
      setStatusMessage('Name your tier before saving.');
      return;
    }
    const newTier = {
      ...draftTier,
      id: `${draftTier.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      price: Number(draftTier.price ?? 0),
      seats: Number(draftTier.seats ?? 0),
      features: (draftTier.features ?? []).filter(Boolean)
    };
    setTiers((prev) => [...prev, newTier]);
    setDraftTier({ name: '', price: 0, billingCycle: 'Monthly', seats: 1, description: '', features: [] });
    setIsCreating(false);
    setStatusMessage('Tier created.');
  };

  const handleUpdateTier = (tierId, field, value) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              [field]: field === 'price' || field === 'seats' ? Number(value ?? 0) : value
            }
          : tier
      )
    );
    setStatusMessage('Tier updated.');
  };

  const handleDeleteTier = (tierId) => {
    setTiers((prev) => prev.filter((tier) => tier.id !== tierId));
    setStatusMessage('Tier removed.');
  };

  const handleAddFeature = (tierId) => {
    if (!featureDraft.trim()) return;
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              features: [...(tier.features ?? []), featureDraft.trim()]
            }
          : tier
      )
    );
    setFeatureDraft('');
    setStatusMessage('Feature added to free tier.');
  };

  const handleRemoveFeature = (tierId, index) => {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === tierId
          ? {
              ...tier,
              features: tier.features.filter((_, featureIndex) => featureIndex !== index)
            }
          : tier
      )
    );
    setStatusMessage('Feature removed.');
  };

  return (
    <section className="rounded-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 text-white shadow-2xl">
      <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-light">Subscription architecture</p>
          <h2 className="mt-3 text-3xl font-semibold">Free tier & premium plans</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-200">
            Package Explorer, live classrooms and tutoring in production-ready bundles. Launch with a defensible free tier and align premium tiers to buyer personas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm font-semibold">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-7 w-7 text-primary-light" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Average paid tier</p>
              <p className="text-lg">${averagePrice.toFixed(0)}/mo</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ArrowTrendingUpIcon className="h-7 w-7 text-emerald-300" />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-300">Seats provisioned</p>
              <p className="text-lg">{totalSeats}</p>
            </div>
          </div>
        </div>
      </header>

      {statusMessage ? (
        <div className="mt-6 rounded-3xl border border-emerald-300/60 bg-emerald-400/10 px-5 py-3 text-sm text-emerald-200">
          {statusMessage}
        </div>
      ) : null}

      <div className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Free tier guardrails</h3>
              <ShieldCheckIcon className="h-6 w-6 text-primary-light" />
            </div>
            <p className="mt-2 text-sm text-slate-200">
              Define the exact experience for operators exploring the platform before they swipe a card. Add or remove benefits instantly.
            </p>
            <ul className="mt-4 space-y-3">
              {(freeTier?.features ?? []).map((feature, index) => (
                <li key={`${feature}-${index}`} className="flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold">
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(freeTier.id, index)}
                    className="rounded-full border border-red-300/50 px-3 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={featureDraft}
                onChange={(event) => setFeatureDraft(event.target.value)}
                placeholder="Add capability e.g. 2 live classrooms"
                className="flex-1 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-400 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
              />
              <button
                type="button"
                onClick={() => handleAddFeature(freeTier.id)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-primary-light"
              >
                <PlusCircleIcon className="h-5 w-5" /> Add feature
              </button>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {tiers.map((tier) => (
              <article key={tier.id} className="relative flex h-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-6 shadow-lg">
                <header className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{tier.name}</h3>
                    <p className="mt-1 text-sm text-slate-200">{tier.description || 'Describe the promise of the tier.'}</p>
                  </div>
                  {tier.id !== 'free' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteTier(tier.id)}
                      className="rounded-full border border-red-300/40 p-2 text-red-200 transition hover:bg-red-500/20"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  ) : null}
                </header>
                <div className="flex items-baseline gap-2 text-3xl font-semibold text-primary-light">
                  ${tier.price}
                  <span className="text-sm text-slate-300">/ {tier.billingCycle.toLowerCase()}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                  <span>{tier.seats} seats</span>
                  <span>•</span>
                  <span>{tier.features.length} features</span>
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-100">
                  {tier.features.map((feature) => (
                    <li key={`${tier.id}-${feature}`} className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-primary-light" /> {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto space-y-3">
                  {editingId === tier.id ? (
                    <div className="space-y-3">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Price (USD)
                        <input
                          type="number"
                          value={tier.price}
                          onChange={(event) => handleUpdateTier(tier.id, 'price', event.target.value)}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Seats
                        <input
                          type="number"
                          value={tier.seats}
                          onChange={(event) => handleUpdateTier(tier.id, 'seats', event.target.value)}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                        />
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Billing cycle
                        <select
                          value={tier.billingCycle}
                          onChange={(event) => handleUpdateTier(tier.id, 'billingCycle', event.target.value)}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                        >
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Annual">Annual</option>
                        </select>
                      </label>
                      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Description
                        <textarea
                          value={tier.description}
                          onChange={(event) => handleUpdateTier(tier.id, 'description', event.target.value)}
                          rows={3}
                          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-primary-light"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingId(tier.id)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary-light"
                    >
                      <PencilSquareIcon className="h-4 w-4" /> Configure tier
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-6">
            <h3 className="text-lg font-semibold text-white">Add premium tier</h3>
            <p className="mt-2 text-sm text-slate-200">Capture a new segment in seconds. We will persist this for your next session.</p>
            {isCreating ? (
              <form className="mt-4 space-y-4" onSubmit={handleCreateTier}>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Tier name
                  <input
                    type="text"
                    value={draftTier.name}
                    onChange={(event) => setDraftTier((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                    required
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Price (USD)
                  <input
                    type="number"
                    min="0"
                    value={draftTier.price}
                    onChange={(event) => setDraftTier((prev) => ({ ...prev, price: Number(event.target.value ?? 0) }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Seats included
                  <input
                    type="number"
                    min="1"
                    value={draftTier.seats}
                    onChange={(event) => setDraftTier((prev) => ({ ...prev, seats: Number(event.target.value ?? 1) }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Billing cadence
                  <select
                    value={draftTier.billingCycle}
                    onChange={(event) => setDraftTier((prev) => ({ ...prev, billingCycle: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Annual">Annual</option>
                  </select>
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Hero statement
                  <textarea
                    value={draftTier.description}
                    onChange={(event) => setDraftTier((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light/40"
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-primary-light"
                >
                  <PlusCircleIcon className="h-4 w-4" /> Create tier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setDraftTier({ name: '', price: 0, billingCycle: 'Monthly', seats: 1, description: '', features: [] });
                  }}
                  className="w-full rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:border-primary-light"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-primary-light"
              >
                <PlusCircleIcon className="h-4 w-4" /> Start new tier
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/10 p-6 text-sm text-slate-200">
            <h3 className="text-lg font-semibold text-white">Launch checklist</h3>
            <ul className="mt-4 space-y-3">
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-primary-light" /> Free tier includes high-intent CTA to upgrade.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-primary-light" /> Premium tiers mapped to buyer personas.
              </li>
              <li className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 text-primary-light" /> Rollout ready for payment provider integration.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
