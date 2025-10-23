import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';

import AdminSummaryCard from '../../../components/admin/AdminSummaryCard.jsx';
import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminBookingsApi from '../../../api/adminBookingsApi.js';
import { formatCurrency } from '../../dashboard/admin/adminControlConfig.jsx';

const BOOKING_STATUSES = [
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

function formatDate(value) {
  if (!value) return 'TBC';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'TBC';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function calculateInsights(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      total: 0,
      confirmed: 0,
      completed: 0,
      upcoming: 0,
      projectedRevenueCents: 0
    };
  }

  const now = new Date();
  const totals = items.reduce(
    (acc, booking) => {
      const status = booking.status ?? 'requested';
      acc.total += 1;
      if (status === 'confirmed') acc.confirmed += 1;
      if (status === 'completed') acc.completed += 1;
      const startAt = booking.scheduledStart ? new Date(booking.scheduledStart) : null;
      if (startAt && !Number.isNaN(startAt.getTime()) && startAt > now && status !== 'cancelled') {
        acc.upcoming += 1;
      }
      const hourlyRateCents = Number(booking.hourlyRateAmount ?? 0);
      const durationMinutes = Number(booking.durationMinutes ?? 60);
      const revenueCents = Math.round((hourlyRateCents * durationMinutes) / 60);
      acc.projectedRevenueCents += Number.isFinite(revenueCents) ? revenueCents : 0;
      return acc;
    },
    { total: 0, confirmed: 0, completed: 0, upcoming: 0, projectedRevenueCents: 0 }
  );

  return totals;
}

const bookingFields = [
  { name: 'tutorId', label: 'Tutor ID', type: 'number', required: true },
  { name: 'learnerId', label: 'Learner ID', type: 'number', required: true },
  { name: 'scheduledStart', label: 'Start time', type: 'datetime', required: true },
  { name: 'scheduledEnd', label: 'End time', type: 'datetime', required: true },
  {
    name: 'durationMinutes',
    label: 'Duration (minutes)',
    type: 'number',
    min: 15,
    step: 15,
    defaultValue: 60
  },
  {
    name: 'hourlyRateAmount',
    label: 'Hourly rate (USD)',
    type: 'number',
    min: 0,
    step: '0.01',
    fromInput: (value) => (value === '' ? undefined : Math.round(Number(value) * 100)),
    toInput: (item) =>
      item?.hourlyRateAmount ? (Number(item.hourlyRateAmount) / 100).toFixed(2) : ''
  },
  { name: 'hourlyRateCurrency', label: 'Currency', type: 'text', defaultValue: 'USD' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    defaultValue: 'requested',
    options: BOOKING_STATUSES
  },
  { name: 'meetingUrl', label: 'Meeting URL', type: 'text', placeholder: 'https://meeting.edulure.com/...' },
  {
    name: 'metadata',
    label: 'Metadata (JSON)',
    type: 'json',
    rows: 4,
    allowEmpty: true,
    placeholder: '{"notes":"Bring onboarding worksheet"}'
  }
];

const bookingColumns = [
  {
    key: 'schedule',
    label: 'Schedule',
    render: (item) => (
      <div>
        <p className="font-semibold text-slate-900">{formatDate(item.scheduledStart)}</p>
        <p className="text-xs text-slate-500">Duration {item.durationMinutes ?? 60} mins</p>
      </div>
    )
  },
  {
    key: 'tutorProfile',
    label: 'Tutor',
    render: (item) => item.tutorProfile?.displayName ?? `Tutor #${item.tutorId}`
  },
  {
    key: 'status',
    label: 'Status',
    render: (item) => (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {item.status}
      </span>
    )
  },
  {
    key: 'hourlyRateAmount',
    label: 'Hourly rate',
    render: (item) => formatCurrency(item.hourlyRateAmount ?? 0, item.hourlyRateCurrency ?? 'USD')
  }
];

export default function AdminBookingsSection({ sectionId, token }) {
  const [insights, setInsights] = useState({
    total: 0,
    confirmed: 0,
    completed: 0,
    upcoming: 0,
    projectedRevenueCents: 0
  });

  const handleItemsChange = useCallback((items) => {
    setInsights(calculateInsights(items));
  }, []);

  const summaryCards = [
    { label: 'Total bookings', value: insights.total },
    { label: 'Confirmed', value: insights.confirmed },
    { label: 'Upcoming', value: insights.upcoming },
    {
      label: 'Projected revenue',
      value: formatCurrency(insights.projectedRevenueCents, 'USD'),
      helper: `${insights.completed} completed`
    }
  ];

  return (
    <section id={sectionId} className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Tutor bookings</h2>
        <p className="text-sm text-slate-600">
          Orchestrate concierge sessions, manage confirmations, and reconcile coaching revenue across the bookings pipeline.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <AdminSummaryCard key={card.label} {...card} />
        ))}
      </div>
      <AdminCrudResource
        token={token}
        title="Bookings management"
        description="Create, confirm, and reconcile 1:1 and cohort tutoring sessions."
        entityName="booking"
        listRequest={({ token: authToken, params, signal }) =>
          adminBookingsApi.listBookings({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminBookingsApi.createBooking({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminBookingsApi.updateBooking({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminBookingsApi.deleteBooking({ token: authToken, id })}
        fields={bookingFields}
        columns={bookingColumns}
        searchPlaceholder="Search bookings by tutor or meeting link"
        statusOptions={BOOKING_STATUSES}
        onItemsChange={handleItemsChange}
      />
    </section>
  );
}

AdminBookingsSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminBookingsSection.defaultProps = {
  sectionId: 'bookings',
  token: null
};
