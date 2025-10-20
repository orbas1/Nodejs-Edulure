import { useCallback, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import {
  createAffiliateChannel,
  updateAffiliateChannel,
  deleteAffiliateChannel,
  recordAffiliatePayout
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CHANNEL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'retired', label: 'Retired' }
];

const emptyChannelForm = {
  id: null,
  platform: '',
  handle: '',
  referralCode: '',
  trackingUrl: '',
  status: 'draft',
  commissionRateBps: 250,
  audienceFocus: '',
  contactEmail: '',
  utmParameters: '',
  notes: ''
};

const emptyPayoutForm = {
  channelId: null,
  amountCents: '',
  currency: 'USD',
  scheduledAt: '',
  status: 'scheduled'
};

function ChannelForm({ form, onChange, onSubmit, onCancel, submitting }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Platform
          <input
            required
            name="platform"
            value={form.platform}
            onChange={onChange}
            placeholder="Instagram"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Handle or profile
          <input
            name="handle"
            value={form.handle}
            onChange={onChange}
            placeholder="@edulurecreator"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Referral code
          <input
            required
            name="referralCode"
            value={form.referralCode}
            onChange={onChange}
            placeholder="LEARN2025"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Tracking URL
          <input
            name="trackingUrl"
            value={form.trackingUrl}
            onChange={onChange}
            placeholder="https://edulure.test/r/LEARN2025"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Status
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {CHANNEL_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Commission rate (bps)
          <input
            name="commissionRateBps"
            type="number"
            min="0"
            step="10"
            value={form.commissionRateBps}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Audience focus
          <input
            name="audienceFocus"
            value={form.audienceFocus}
            onChange={onChange}
            placeholder="e.g. Early-stage operators"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Point of contact email
          <input
            name="contactEmail"
            type="email"
            value={form.contactEmail}
            onChange={onChange}
            placeholder="partner@edulure.test"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500 md:col-span-2">
          Campaign notes
          <textarea
            name="notes"
            value={form.notes}
            onChange={onChange}
            placeholder="Use one line per observation, launch result, or content collaboration idea."
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={4}
          />
          <span className="mt-1 block text-[11px] uppercase tracking-wide text-slate-400">
            Each line becomes a timeline entry for this partner.
          </span>
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Default UTM parameters
          <input
            name="utmParameters"
            value={form.utmParameters}
            onChange={onChange}
            placeholder="utm_source=affiliate&utm_medium=organic"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save channel'}
        </button>
        <button type="button" onClick={onCancel} className="dashboard-pill px-5 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

ChannelForm.defaultProps = {
  submitting: false
};

function PayoutForm({ form, onChange, onSubmit, onCancel, submitting, channels }) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Channel
        <select
          required
          name="channelId"
          value={form.channelId ?? ''}
          onChange={onChange}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="" disabled>
            Select a channel
          </option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.platform} · {channel.referralCode}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Amount (cents)
          <input
            required
            name="amountCents"
            type="number"
            min="0"
            value={form.amountCents}
            onChange={onChange}
            placeholder="4500"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Currency
          <input
            name="currency"
            value={form.currency}
            onChange={onChange}
            placeholder="USD"
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Scheduled at
          <input
            name="scheduledAt"
            type="date"
            value={form.scheduledAt}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
          Status
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="scheduled">Scheduled</option>
            <option value="processing">Processing</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="dashboard-primary-pill px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Recording…' : 'Record payout'}
        </button>
        <button type="button" onClick={onCancel} className="dashboard-pill px-5 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

PayoutForm.defaultProps = {
  submitting: false
};

export default function DashboardAffiliate() {
  const { role, dashboard, refresh } = useOutletContext();
  const affiliate = dashboard?.affiliate ?? null;
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [statusMessage, setStatusMessage] = useState(null);
  const [channelFormVisible, setChannelFormVisible] = useState(false);
  const [channelForm, setChannelForm] = useState(emptyChannelForm);
  const [channelSubmitting, setChannelSubmitting] = useState(false);
  const [payoutFormVisible, setPayoutFormVisible] = useState(false);
  const [payoutForm, setPayoutForm] = useState(emptyPayoutForm);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  const channels = useMemo(() => (Array.isArray(affiliate?.channels) ? affiliate.channels : []), [affiliate?.channels]);
  const payouts = useMemo(() => (Array.isArray(affiliate?.payouts) ? affiliate.payouts : []), [affiliate?.payouts]);
  const summary = affiliate?.summary ?? {};

  const openChannelForm = useCallback((channel) => {
    if (channel) {
      setChannelForm({
        id: channel.id,
        platform: channel.platform ?? '',
        handle: channel.handle ?? '',
        referralCode: channel.referralCode ?? '',
        trackingUrl: channel.trackingUrl ?? '',
        status: channel.status ?? 'draft',
        commissionRateBps: channel.commissionRateBps ?? 250,
        audienceFocus: channel.metadata?.audienceFocus ?? '',
        contactEmail: channel.metadata?.contactEmail ?? '',
        utmParameters: channel.metadata?.utmParameters ?? '',
        notes: Array.isArray(channel.notes) ? channel.notes.join('\n') : ''
      });
    } else {
      setChannelForm(emptyChannelForm);
    }
    setChannelFormVisible(true);
  }, []);

  const resetChannelForm = useCallback(() => {
    setChannelForm(emptyChannelForm);
    setChannelFormVisible(false);
    setChannelSubmitting(false);
  }, []);

  const handleChannelFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setChannelForm((current) => ({ ...current, [name]: name === 'commissionRateBps' ? Number(value) : value }));
  }, []);

  const handleChannelSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage affiliate channels.' });
        return;
      }
      setChannelSubmitting(true);
      const payload = {
        platform: channelForm.platform.trim(),
        handle: channelForm.handle?.trim() || undefined,
        referralCode: channelForm.referralCode.trim(),
        trackingUrl: channelForm.trackingUrl?.trim() || undefined,
        status: channelForm.status,
        commissionRateBps: Number(channelForm.commissionRateBps ?? 0),
        notes: channelForm.notes
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        metadata: Object.fromEntries(
          Object.entries({
            audienceFocus: channelForm.audienceFocus?.trim() || undefined,
            contactEmail: channelForm.contactEmail?.trim() || undefined,
            utmParameters: channelForm.utmParameters?.trim() || undefined
          }).filter(([, value]) => Boolean(value))
        )
      };
      try {
        if (channelForm.id) {
          await updateAffiliateChannel({ token, channelId: channelForm.id, payload });
          setStatusMessage({ type: 'success', message: 'Affiliate channel updated.' });
        } else {
          await createAffiliateChannel({ token, payload });
          setStatusMessage({ type: 'success', message: 'Affiliate channel created.' });
        }
        resetChannelForm();
        await refresh?.();
      } catch (submitError) {
        setStatusMessage({
          type: 'error',
          message: submitError instanceof Error ? submitError.message : 'Unable to save the affiliate channel.'
        });
      } finally {
        setChannelSubmitting(false);
      }
    },
    [channelForm, refresh, resetChannelForm, token]
  );

  const handleChannelDelete = useCallback(
    async (channel) => {
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to manage affiliate channels.' });
        return;
      }
      setStatusMessage({ type: 'pending', message: `Archiving ${channel.platform}…` });
      try {
        await deleteAffiliateChannel({ token, channelId: channel.id });
        setStatusMessage({ type: 'success', message: `${channel.platform} archived.` });
        await refresh?.();
      } catch (deleteError) {
        setStatusMessage({
          type: 'error',
          message: deleteError instanceof Error ? deleteError.message : 'Unable to archive this channel right now.'
        });
      }
    },
    [refresh, token]
  );

  const openPayoutForm = useCallback((channel) => {
    setPayoutForm({
      ...emptyPayoutForm,
      channelId: channel?.id ?? null,
      scheduledAt: channel?.nextPayout?.scheduledAt ? channel.nextPayout.scheduledAt.slice(0, 10) : ''
    });
    setPayoutFormVisible(true);
  }, []);

  const resetPayoutForm = useCallback(() => {
    setPayoutForm(emptyPayoutForm);
    setPayoutFormVisible(false);
    setPayoutSubmitting(false);
  }, []);

  const handlePayoutFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setPayoutForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handlePayoutSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setStatusMessage({ type: 'error', message: 'Sign in again to record affiliate payouts.' });
        return;
      }
      if (!payoutForm.channelId) {
        setStatusMessage({ type: 'error', message: 'Select a channel before recording a payout.' });
        return;
      }
      setPayoutSubmitting(true);
      const payload = {
        amountCents: Number(payoutForm.amountCents),
        currency: payoutForm.currency || 'USD',
        scheduledAt: payoutForm.scheduledAt || undefined,
        status: payoutForm.status
      };
      try {
        await recordAffiliatePayout({ token, channelId: payoutForm.channelId, payload });
        setStatusMessage({ type: 'success', message: 'Payout recorded.' });
        resetPayoutForm();
        await refresh?.();
      } catch (submitError) {
        setStatusMessage({
          type: 'error',
          message: submitError instanceof Error ? submitError.message : 'Unable to record the payout right now.'
        });
      } finally {
        setPayoutSubmitting(false);
      }
    },
    [payoutForm, refresh, resetPayoutForm, token]
  );

  if (role && !['learner', 'instructor'].includes(role)) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Learner dashboard required"
        description="Switch to a learner Learnspace to manage your affiliate programs and payouts."
      />
    );
  }

  if (!affiliate) {
    return (
      <DashboardStateMessage
        title="Affiliate workspace not ready"
        description="Connect your preferred channels to start tracking performance and scheduling payouts."
        actionLabel="Refresh"
        onAction={() => refresh?.()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="dashboard-kicker text-primary">Affiliate workspace</p>
          <h1 className="dashboard-title">
            {role === 'instructor' ? 'Scale trusted partner revenue streams' : 'Grow your learner pipeline with trusted partners'}
          </h1>
          <p className="dashboard-subtitle">
            Capture channel performance, automate payouts, and keep referral partners motivated.
          </p>
        </div>
        <button type="button" onClick={() => openChannelForm(null)} className="dashboard-primary-pill">
          New channel
        </button>
      </header>

      {statusMessage ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm ${
            statusMessage.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : statusMessage.type === 'pending'
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          {statusMessage.message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-sm">
          <p className="dashboard-kicker">Channels</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.totalChannels ?? channels.length}</p>
          <p className="text-xs text-slate-500">{summary.activeChannels ?? 0} active</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-sm">
          <p className="dashboard-kicker">Outstanding payouts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.outstanding ?? '$0.00'}</p>
          <p className="text-xs text-slate-500">Awaiting processing</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/60 p-6 shadow-sm">
          <p className="dashboard-kicker">Recent payouts</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {payouts.slice(0, 3).map((payout) => payout.amount).join(' · ') || '—'}
          </p>
          <p className="text-xs text-slate-500">Last 3 payouts</p>
        </div>
      </section>

      {channelFormVisible ? (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">
            {channelForm.id ? 'Edit affiliate channel' : 'New affiliate channel'}
          </h2>
          <ChannelForm
            form={channelForm}
            onChange={handleChannelFieldChange}
            onSubmit={handleChannelSubmit}
            onCancel={resetChannelForm}
            submitting={channelSubmitting}
          />
        </section>
      ) : null}

      <section className="space-y-6">
        {channels.map((channel) => (
          <article
            key={channel.id}
            className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="dashboard-kicker text-primary">{channel.platform}</p>
                <h2 className="text-xl font-semibold text-slate-900">{channel.referralCode}</h2>
                <p className="text-sm text-slate-600">
                  {channel.trackingUrl ? (
                    <a className="text-primary underline" href={channel.trackingUrl} target="_blank" rel="noreferrer">
                      {channel.trackingUrl}
                    </a>
                  ) : (
                    'Add a tracking link to monitor conversions.'
                  )}
                </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                  {channel.status}
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  Commission · {(channel.commissionRateBps / 100).toFixed(2)}%
                </span>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                  Outstanding · {channel.outstandingFormatted}
                </span>
              </div>
              {channel.metadata?.audienceFocus || channel.metadata?.contactEmail ? (
                <dl className="mt-3 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
                  {channel.metadata?.audienceFocus ? (
                    <div>
                      <dt className="font-semibold text-slate-700">Audience focus</dt>
                      <dd>{channel.metadata.audienceFocus}</dd>
                    </div>
                  ) : null}
                  {channel.metadata?.contactEmail ? (
                    <div>
                      <dt className="font-semibold text-slate-700">Partner contact</dt>
                      <dd>
                        <a className="text-primary underline" href={`mailto:${channel.metadata.contactEmail}`}>
                          {channel.metadata.contactEmail}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="dashboard-pill px-4 py-2 text-sm" onClick={() => openChannelForm(channel)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-rose-200 bg-rose-50 text-rose-600 px-4 py-2 text-sm"
                  onClick={() => handleChannelDelete(channel)}
                >
                  Archive
                </button>
                <button
                  type="button"
                  className="dashboard-pill border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-2 text-sm"
                  onClick={() => openPayoutForm(channel)}
                >
                  Record payout
                </button>
              </div>
            </div>

            <dl className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Total earned</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {channel.totalEarningsFormatted ?? '$0.00'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Paid</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {channel.totalPaidFormatted ?? '$0.00'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
                <dt className="dashboard-kicker">Next payout</dt>
                <dd className="mt-1 text-lg font-semibold text-slate-900">
                  {channel.nextPayout?.amount ?? 'Unscheduled'}
                </dd>
                <dd className="text-xs text-slate-500">
                  {channel.nextPayout?.scheduledAt
                    ? new Date(channel.nextPayout.scheduledAt).toLocaleDateString()
                    : 'Awaiting schedule'}
                </dd>
              </div>
            </dl>
            {Array.isArray(channel.notes) && channel.notes.length ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white/60 p-4">
                <p className="dashboard-kicker">Activation notes</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {channel.notes.map((note, index) => (
                    <li key={`${channel.id}-note-${index}`}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {channel.metadata?.utmParameters ? (
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">UTM parameters:</span> {channel.metadata.utmParameters}
              </div>
            ) : null}
          </article>
        ))}
      </section>

      {payoutFormVisible ? (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Record payout</h2>
          <PayoutForm
            form={payoutForm}
            onChange={handlePayoutFieldChange}
            onSubmit={handlePayoutSubmit}
            onCancel={resetPayoutForm}
            submitting={payoutSubmitting}
            channels={channels}
          />
        </section>
      ) : null}

      <section className="dashboard-section">
        <h2 className="text-lg font-semibold text-slate-900">Payout log</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Channel</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payouts.length ? (
                payouts.map((payout) => {
                  const channel = channels.find((item) => item.id === payout.channelId);
                  return (
                    <tr key={payout.id} className="bg-white">
                      <td className="px-4 py-2 text-slate-700">
                        {channel ? `${channel.platform} · ${channel.referralCode}` : payout.channelId}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{payout.amount}</td>
                      <td className="px-4 py-2 text-slate-600">{payout.status}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {payout.scheduledAt ? new Date(payout.scheduledAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">
                    No payouts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
