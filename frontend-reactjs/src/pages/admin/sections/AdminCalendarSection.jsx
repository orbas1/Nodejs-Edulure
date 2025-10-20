import { useCallback, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import AdminCrudResource from '../../../components/dashboard/admin/AdminCrudResource.jsx';
import adminControlApi from '../../../api/adminControlApi.js';
import { createAdminControlResourceConfigs } from '../../dashboard/admin/adminControlConfig.jsx';

function SummaryCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

SummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  helper: PropTypes.string
};

SummaryCard.defaultProps = {
  helper: undefined
};

function useLiveStreamConfig() {
  return useMemo(() => {
    const configs = createAdminControlResourceConfigs();
    return configs.liveStreams;
  }, []);
}

function calculateInsights(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      upcoming: 0,
      completed: 0,
      capacity: 0,
      occupancyRate: 0
    };
  }

  const now = new Date();
  const totals = items.reduce(
    (acc, stream) => {
      const status = stream.status ?? 'draft';
      if (status === 'scheduled' || status === 'live') acc.upcoming += 1;
      if (status === 'completed') acc.completed += 1;
      acc.capacity += Number(stream.capacity ?? 0);
      const reserved = Number(stream.reservedSeats ?? 0);
      acc.reserved += Number.isFinite(reserved) ? reserved : 0;
      return acc;
    },
    { upcoming: 0, completed: 0, capacity: 0, reserved: 0 }
  );

  const occupancyRate = totals.capacity === 0 ? 0 : Math.round((totals.reserved / totals.capacity) * 100);

  const nextEvent = items
    .map((stream) => {
      if (!stream.startAt) return null;
      const start = new Date(stream.startAt);
      if (Number.isNaN(start.getTime()) || start < now) return null;
      return { id: stream.id, title: stream.title, startAt: start, status: stream.status };
    })
    .filter(Boolean)
    .sort((a, b) => a.startAt - b.startAt)[0];

  return {
    upcoming: totals.upcoming,
    completed: totals.completed,
    capacity: totals.capacity,
    occupancyRate,
    nextEvent
  };
}

function formatDateTime(value) {
  if (!value) return 'TBC';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'TBC';
  }
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

export default function AdminCalendarSection({ sectionId, token }) {
  const config = useLiveStreamConfig();
  const [insights, setInsights] = useState({ upcoming: 0, completed: 0, capacity: 0, occupancyRate: 0, nextEvent: null });

  const handleItemsChange = useCallback((items) => {
    setInsights(calculateInsights(items));
  }, []);

  if (!config) {
    return null;
  }

  const summaryCards = [
    { label: 'Upcoming sessions', value: insights.upcoming },
    { label: 'Completed', value: insights.completed },
    { label: 'Total capacity', value: insights.capacity },
    { label: 'Occupancy', value: `${insights.occupancyRate}%` }
  ];

  return (
    <section id={sectionId} className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">Live experiences calendar</h2>
        <p className="text-sm text-slate-600">
          Coordinate workshops, webinars, and community events with timezone awareness, ticketing capacity, and runbook context.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </div>
      {insights.nextEvent ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-900">
          <p className="font-semibold uppercase tracking-wide">Next session</p>
          <p className="mt-1 text-lg font-semibold">{insights.nextEvent.title}</p>
          <p className="text-sm">{formatDateTime(insights.nextEvent.startAt)}</p>
        </div>
      ) : null}
      <AdminCrudResource
        token={token}
        title={config.title}
        description={config.description}
        entityName={config.entityName}
        listRequest={({ token: authToken, params, signal }) =>
          adminControlApi.listLiveStreams({ token: authToken, params: { ...params, perPage: 50 }, signal })
        }
        createRequest={({ token: authToken, payload }) => adminControlApi.createLiveStream({ token: authToken, payload })}
        updateRequest={({ token: authToken, id, payload }) =>
          adminControlApi.updateLiveStream({ token: authToken, id, payload })
        }
        deleteRequest={({ token: authToken, id }) => adminControlApi.deleteLiveStream({ token: authToken, id })}
        fields={config.fields}
        columns={config.columns}
        searchPlaceholder="Search live sessions"
        onItemsChange={handleItemsChange}
      />
    </section>
  );
}

AdminCalendarSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string
};

AdminCalendarSection.defaultProps = {
  sectionId: 'calendar',
  token: null
};
