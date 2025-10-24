import { useCallback, useEffect, useMemo, useState } from 'react';

import DashboardSwitcherHeader from '../../components/dashboard/DashboardSwitcherHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import DashboardActionFeedback from '../../components/dashboard/DashboardActionFeedback.jsx';
import {
  createAffiliateChannel,
  updateAffiliateChannel,
  deleteAffiliateChannel,
  recordAffiliatePayout
} from '../../api/learnerDashboardApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useDashboardSurface from '../../hooks/useDashboardSurface.js';

const CHANNEL_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'retired', label: 'Retired' }
];

const PAYOUT_STATUSES = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'processing', label: 'Processing' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' }
];

const CSV_QUOTE = '"';

const toCsvValue = (value) => {
  if (value === null || value === undefined) {
    return `${CSV_QUOTE}${CSV_QUOTE}`;
  }
  const normalised = String(value).replace(/"/g, `${CSV_QUOTE}${CSV_QUOTE}`);
  return `${CSV_QUOTE}${normalised}${CSV_QUOTE}`;
};

const buildCsv = (rows, columns) => {
  const header = columns.map((column) => toCsvValue(column.label ?? column.key ?? '')).join(',');
  const lines = rows.map((row) =>
    columns
      .map((column) => {
        if (typeof column.accessor === 'function') {
          return toCsvValue(column.accessor(row));
        }
        if (column.key) {
          return toCsvValue(row?.[column.key]);
        }
        return toCsvValue('');
      })
      .join(',')
  );
  return [header, ...lines].join('\n');
};

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
  const { role, surface, refresh, trackView, trackAction, context } = useDashboardSurface('affiliate', {
    origin: 'dashboard-affiliate'
  });
  const dashboard = context?.dashboard ?? null;

  useEffect(() => {
    trackView();
  }, [trackView]);
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
  const [channelStatusFilter, setChannelStatusFilter] = useState('all');
  const [channelSearch, setChannelSearch] = useState('');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [payoutChannelFilter, setPayoutChannelFilter] = useState('all');

  const channels = useMemo(() => (Array.isArray(affiliate?.channels) ? affiliate.channels : []), [affiliate?.channels]);
  const payouts = useMemo(() => (Array.isArray(affiliate?.payouts) ? affiliate.payouts : []), [affiliate?.payouts]);
  const summary = affiliate?.summary ?? {};

  useEffect(() => {
    setChannelStatusFilter('all');
    setChannelSearch('');
  }, [affiliate?.channels]);

  useEffect(() => {
    setPayoutChannelFilter('all');
    setPayoutStatusFilter('all');
  }, [affiliate?.payouts]);

  const channelLookup = useMemo(() => {
    return channels.reduce((acc, channel) => {
      if (channel?.id === undefined || channel?.id === null) {
        return acc;
      }
      acc.set(String(channel.id), channel);
      return acc;
    }, new Map());
  }, [channels]);

  const filteredChannels = useMemo(() => {
    const term = channelSearch.trim().toLowerCase();
    return channels
      .filter((channel) => {
        const status = (channel.status ?? 'draft').toLowerCase();
        if (channelStatusFilter !== 'all' && status !== channelStatusFilter) {
          return false;
        }
        if (!term) {
          return true;
        }
        const haystack = [channel.platform, channel.handle, channel.referralCode, channel.metadata?.audienceFocus]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        const statusOrder = ['active', 'draft', 'paused', 'retired'];
        const statusA = statusOrder.indexOf((a.status ?? '').toLowerCase());
        const statusB = statusOrder.indexOf((b.status ?? '').toLowerCase());
        const rankA = statusA === -1 ? statusOrder.length : statusA;
        const rankB = statusB === -1 ? statusOrder.length : statusB;
        if (rankA !== rankB) {
          return rankA - rankB;
        }
        return (a.platform ?? '').localeCompare(b.platform ?? '');
      });
  }, [channelSearch, channelStatusFilter, channels]);

  const filteredPayouts = useMemo(() => {
    return payouts
      .filter((payout) => {
        if (payoutChannelFilter !== 'all' && String(payout.channelId) !== payoutChannelFilter) {
          return false;
        }
        if (payoutStatusFilter !== 'all' && (payout.status ?? '').toLowerCase() !== payoutStatusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.scheduledAt ?? a.createdAt ?? 0).getTime();
        const timeB = new Date(b.scheduledAt ?? b.createdAt ?? 0).getTime();
        return timeB - timeA;
      });
  }, [payoutChannelFilter, payoutStatusFilter, payouts]);

  const payoutChannelOptions = useMemo(() => {
    const options = new Map();
    channels.forEach((channel) => {
      if (channel?.id !== undefined && channel?.id !== null) {
        const id = String(channel.id);
        options.set(id, `${channel.platform ?? 'Channel'} · ${channel.referralCode ?? id}`);
      }
    });
    payouts.forEach((payout) => {
      const id = payout?.channelId;
      if (id === undefined || id === null) {
        return;
      }
      const key = String(id);
      if (!options.has(key)) {
        options.set(key, `Channel ${key}`);
      }
    });
    return Array.from(options.entries()).map(([value, label]) => ({ value, label }));
  }, [channels, payouts]);

  const triggerCsvDownload = useCallback((csv, filename) => {
    if (typeof window === 'undefined' || typeof window.URL === 'undefined' || !window.URL.createObjectURL) {
      return false;
    }
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      link.target = '_self';
      document.body.appendChild(link);
      const isJsdom =
        typeof navigator !== 'undefined' && /jsdom/i.test((navigator.userAgent ?? '').toLowerCase());
      if (!isJsdom && typeof link.click === 'function') {
        link.click();
      }
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Unable to export CSV', error);
      return false;
    }
  }, []);

  const resetChannelFilters = useCallback(() => {
    setChannelStatusFilter('all');
    setChannelSearch('');
  }, []);

  const resetPayoutFilters = useCallback(() => {
    setPayoutChannelFilter('all');
    setPayoutStatusFilter('all');
  }, []);

  const handleExportChannels = useCallback(() => {
    if (!filteredChannels.length) {
      setStatusMessage({
        type: 'info',
        message: 'No channels to export with the current filters.'
      });
      return;
    }
    const columns = [
      { label: 'Platform', accessor: (channel) => channel.platform ?? '' },
      { label: 'Handle', accessor: (channel) => channel.handle ?? '' },
      { label: 'Referral code', accessor: (channel) => channel.referralCode ?? '' },
      { label: 'Status', accessor: (channel) => channel.status ?? 'draft' },
      { label: 'Commission (bps)', accessor: (channel) => channel.commissionRateBps ?? '' },
      {
        label: 'Audience focus',
        accessor: (channel) => channel.metadata?.audienceFocus ?? ''
      },
      {
        label: 'Next payout',
        accessor: (channel) => channel.nextPayout?.amount ?? ''
      }
    ];
    const csv = buildCsv(filteredChannels, columns);
    const filename = `affiliate-channels-${new Date().toISOString().slice(0, 10)}.csv`;
    const success = triggerCsvDownload(csv, filename);
    setStatusMessage({
      type: success ? 'success' : 'error',
      message: success
        ? `Exported ${filteredChannels.length} channel${filteredChannels.length === 1 ? '' : 's'}.`
        : 'Your browser blocked the download. Try again or adjust permissions.'
    });
    trackAction('export_channels', {
      count: filteredChannels.length,
      success
    });
  }, [filteredChannels, triggerCsvDownload, setStatusMessage, trackAction]);

  const handleExportPayouts = useCallback(() => {
    if (!filteredPayouts.length) {
      setStatusMessage({
        type: 'info',
        message: 'No payouts to export with the current filters.'
      });
      return;
    }
    const columns = [
      {
        label: 'Channel',
        accessor: (payout) => {
          const channel = channelLookup.get(String(payout.channelId));
          if (!channel) {
            return payout.channelId ?? 'Unassigned';
          }
          return `${channel.platform ?? 'Channel'} · ${channel.referralCode ?? channel.id}`;
        }
      },
      { label: 'Amount', accessor: (payout) => payout.amount ?? payout.amountCents ?? '' },
      {
        label: 'Status',
        accessor: (payout) => payout.status ?? 'scheduled'
      },
      {
        label: 'Scheduled at',
        accessor: (payout) => (payout.scheduledAt ? new Date(payout.scheduledAt).toISOString() : '')
      }
    ];
    const csv = buildCsv(filteredPayouts, columns);
    const filename = `affiliate-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    const success = triggerCsvDownload(csv, filename);
    setStatusMessage({
      type: success ? 'success' : 'error',
      message: success
        ? `Exported ${filteredPayouts.length} payout${filteredPayouts.length === 1 ? '' : 's'}.`
        : 'Your browser blocked the download. Try again or adjust permissions.'
    });
    trackAction('export_payouts', {
      count: filteredPayouts.length,
      success
    });
  }, [channelLookup, filteredPayouts, triggerCsvDownload, setStatusMessage, trackAction]);

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
          trackAction('update_channel', { status: channelForm.status });
        } else {
          await createAffiliateChannel({ token, payload });
          setStatusMessage({ type: 'success', message: 'Affiliate channel created.' });
          trackAction('create_channel', { status: channelForm.status });
        }
        resetChannelForm();
        await refresh?.();
      } catch (submitError) {
        setStatusMessage({
          type: 'error',
          message: submitError instanceof Error ? submitError.message : 'Unable to save the affiliate channel.'
        });
        trackAction('channel_error', { reason: submitError instanceof Error ? submitError.message : 'unknown' });
      } finally {
        setChannelSubmitting(false);
      }
    },
    [channelForm, refresh, resetChannelForm, token, trackAction]
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
        trackAction('delete_channel', { platform: channel.platform });
        await refresh?.();
      } catch (deleteError) {
        setStatusMessage({
          type: 'error',
          message: deleteError instanceof Error ? deleteError.message : 'Unable to archive this channel right now.'
        });
        trackAction('channel_error', { reason: deleteError instanceof Error ? deleteError.message : 'delete_failed' });
      }
    },
    [refresh, token, trackAction]
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
        trackAction('record_payout', { status: payoutForm.status, channelId: payoutForm.channelId });
        resetPayoutForm();
        await refresh?.();
      } catch (submitError) {
        setStatusMessage({
          type: 'error',
          message: submitError instanceof Error ? submitError.message : 'Unable to record the payout right now.'
        });
        trackAction('payout_error', { reason: submitError instanceof Error ? submitError.message : 'unknown' });
      } finally {
        setPayoutSubmitting(false);
      }
    },
    [payoutForm, refresh, resetPayoutForm, token, trackAction]
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

  const feedbackTone =
    statusMessage?.type === 'error'
      ? 'error'
      : statusMessage?.type === 'success'
        ? 'success'
        : statusMessage?.type === 'pending'
          ? 'warning'
          : 'info';

  return (
    <div className="space-y-8">
      <DashboardSwitcherHeader
        surface={surface}
        onRefresh={refresh}
        actions={[
          {
            id: 'new-channel',
            label: 'New channel',
            onSelect: () => openChannelForm(null)
          }
        ]}
      />

      {statusMessage ? (
        <DashboardActionFeedback
          feedback={{
            tone: feedbackTone,
            message: statusMessage.message,
            detail: statusMessage.detail
          }}
          onDismiss={() => setStatusMessage(null)}
          persistKey="dashboard-affiliate-feedback"
          autoDismiss={feedbackTone === 'success' ? 4500 : null}
        />
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

      <section className="dashboard-section space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">Partner roster</p>
            <h2 className="text-lg font-semibold text-slate-900">Affiliate channels</h2>
            <p className="text-sm text-slate-500">
              Segment by performance and empower your partner success rituals with focused context.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Channel status
              <select
                className="dashboard-input mt-1"
                value={channelStatusFilter}
                onChange={(event) => setChannelStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {CHANNEL_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Search channels
              <input
                className="dashboard-input mt-1"
                value={channelSearch}
                onChange={(event) => setChannelSearch(event.target.value)}
                placeholder="Search by platform, handle, or code"
              />
            </label>
            <button type="button" className="dashboard-pill px-4 py-2 text-sm" onClick={resetChannelFilters}>
              Reset
            </button>
            <button
              type="button"
              className="dashboard-pill px-4 py-2 text-sm"
              onClick={handleExportChannels}
            >
              Export channels (.csv)
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredChannels.length ? (
            filteredChannels.map((channel) => (
              <article
                key={channel.id ?? channel.referralCode}
                className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="dashboard-kicker text-primary">{channel.platform}</p>
                    <h2 className="text-xl font-semibold text-slate-900">{channel.referralCode}</h2>
                    {channel.handle ? (
                      <p className="text-sm text-slate-500">Handle · {channel.handle}</p>
                    ) : null}
                    <p className="text-sm text-slate-600">
                      {channel.trackingUrl ? (
                        <a className="text-primary underline" href={channel.trackingUrl} target="_blank" rel="noreferrer">
                          {channel.trackingUrl}
                        </a>
                      ) : (
                        'Add a tracking link to monitor conversions.'
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="dashboard-pill px-4 py-2 text-sm"
                      onClick={() => openChannelForm(channel)}
                    >
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

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                    {(channel.status ?? 'draft').toUpperCase()}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                    Commission · {(channel.commissionRateBps / 100).toFixed(2)}%
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">
                    Outstanding · {channel.outstandingFormatted ?? '$0.00'}
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
            ))
          ) : (
            <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white/60 p-8 text-center text-sm text-slate-500">
              No channels match the current filters. Reset or add a new partner to see data here.
            </div>
          )}
        </div>
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

      <section className="dashboard-section space-y-4" data-testid="affiliate-payouts-section">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payout log</h2>
            <p className="text-sm text-slate-500">Monitor scheduled, processing, and completed partner payouts.</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Channel
              <select
                className="dashboard-input mt-1"
                value={payoutChannelFilter}
                onChange={(event) => setPayoutChannelFilter(event.target.value)}
              >
                <option value="all">All channels</option>
                {payoutChannelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payout status
              <select
                className="dashboard-input mt-1"
                value={payoutStatusFilter}
                onChange={(event) => setPayoutStatusFilter(event.target.value)}
              >
                <option value="all">All statuses</option>
                {PAYOUT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="dashboard-pill px-4 py-2 text-sm" onClick={resetPayoutFilters}>
              Reset
            </button>
            <button type="button" className="dashboard-pill px-4 py-2 text-sm" onClick={handleExportPayouts}>
              Export payouts (.csv)
            </button>
          </div>
        </div>

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
              {filteredPayouts.length ? (
                filteredPayouts.map((payout) => {
                  const channel = channelLookup.get(String(payout.channelId));
                  return (
                    <tr key={payout.id} className="bg-white">
                      <td className="px-4 py-2 text-slate-700">
                        {channel ? `${channel.platform} · ${channel.referralCode}` : payout.channelId ?? '—'}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{payout.amount ?? payout.amountCents ?? '—'}</td>
                      <td className="px-4 py-2 text-slate-600">{payout.status ?? 'scheduled'}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {payout.scheduledAt ? new Date(payout.scheduledAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-4 py-6 text-center text-sm text-slate-500">
                    {payouts.length
                      ? 'No payouts match the current filters.'
                      : 'No payouts recorded yet.'}
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
