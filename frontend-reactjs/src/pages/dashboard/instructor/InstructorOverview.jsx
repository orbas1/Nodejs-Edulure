import { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';

import VerificationStatusCard from '../../../components/dashboard/VerificationStatusCard.jsx';
import InstructorMetricsSection from './sections/InstructorMetricsSection.jsx';
import InstructorPipelineSection from './sections/InstructorPipelineSection.jsx';
import InstructorProductionSection from './sections/InstructorProductionSection.jsx';
import InstructorProfileSection from './sections/InstructorProfileSection.jsx';
import InstructorRevenueSection from './sections/InstructorRevenueSection.jsx';
import InstructorTaskBoard from '../../../components/dashboard/InstructorTaskBoard.jsx';

function normaliseNumber(value) {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) return numeric;
  return 0;
}

function formatChange(current, previous) {
  const delta = current - previous;
  const prefix = delta >= 0 ? '+' : '−';
  return `${prefix}${Math.abs(delta)}`;
}

export default function InstructorOverview({ dashboard, profile, onRefresh }) {
  const safeProfile = useMemo(
    () => ({
      name: profile?.name ?? 'Team',
      role: profile?.role ?? 'Instructor',
      avatarUrl: profile?.avatarUrl ?? profile?.avatar ?? null,
      verification: profile?.verification ?? null,
      team: Array.isArray(profile?.team) ? profile.team : []
    }),
    [profile]
  );

  const metrics = useMemo(() => {
    if (!Array.isArray(dashboard.metrics)) return [];
    return dashboard.metrics.filter((metric) => metric && metric.label && metric.value !== undefined);
  }, [dashboard.metrics]);

  const enrollmentMetrics = useMemo(() => {
    const enrollment = Array.isArray(dashboard.analytics?.enrollment) ? dashboard.analytics.enrollment : [];
    return enrollment.map((metric) => {
      const current = normaliseNumber(metric.current);
      const previous = normaliseNumber(metric.previous);
      const displayValue = metric.current ?? current;
      return {
        label: metric.label ?? 'Metric',
        value: `${displayValue}`,
        change: formatChange(current, previous),
        trend: current >= previous ? 'up' : 'down'
      };
    });
  }, [dashboard.analytics?.enrollment]);

  const revenueSlices = useMemo(() => {
    const raw = Array.isArray(dashboard.analytics?.revenueStreams) ? dashboard.analytics.revenueStreams : [];
    const totals = raw.reduce((sum, slice) => sum + normaliseNumber(slice.value ?? slice.percent), 0);
    return raw
      .filter((slice) => slice?.name)
      .map((slice) => {
        const amount = normaliseNumber(slice.value ?? slice.percent);
        const percent = totals > 0 ? Math.round((amount / totals) * 100) : amount;
        return {
          name: slice.name,
          value: slice.displayValue ?? slice.value ?? slice.percent ?? amount,
          percent: Math.max(0, Math.min(100, percent))
        };
      });
  }, [dashboard.analytics?.revenueStreams]);

  const pipeline = useMemo(() => {
    const raw = Array.isArray(dashboard.courses?.pipeline) ? dashboard.courses.pipeline : [];
    return raw
      .filter((item) => item && (item.id ?? item.name))
      .map((item) => ({
        ...item,
        startDate: item.startDate ?? 'TBD',
        learners: item.learners ?? '0'
      }));
  }, [dashboard.courses?.pipeline]);

  const production = useMemo(() => {
    const raw = Array.isArray(dashboard.courses?.production) ? dashboard.courses.production : [];
    return raw.filter((item) => item && (item.id ?? item.asset));
  }, [dashboard.courses?.production]);

  const alerts = useMemo(() => {
    if (!Array.isArray(dashboard.alerts?.items)) return [];
    return dashboard.alerts.items
      .filter((alert) => alert && alert.title)
      .map((alert) => ({
        id: alert.id ?? alert.slug ?? alert.title,
        title: alert.title,
        severity: alert.severity ?? 'info',
        actionLabel: alert.actionLabel ?? 'View details',
        description: alert.description ?? '',
        link: alert.link ?? null
      }));
  }, [dashboard.alerts?.items]);

  const healthSummary = useMemo(() => {
    const totalRevenue = revenueSlices.reduce((sum, slice) => sum + normaliseNumber(slice.percent ?? slice.value), 0);
    return {
      totalRevenue,
      pipelineCount: pipeline.length,
      productionCount: production.length
    };
  }, [pipeline, production, revenueSlices]);

  const taskSources = useMemo(() => {
    const sources = [];
    if (Array.isArray(dashboard.tasks)) {
      sources.push(...dashboard.tasks);
    }
    if (Array.isArray(dashboard.tasks?.items)) {
      sources.push(...dashboard.tasks.items);
    }
    if (Array.isArray(dashboard.alerts?.tasks)) {
      sources.push(...dashboard.alerts.tasks);
    }
    if (Array.isArray(dashboard.courses?.production)) {
      sources.push(
        ...dashboard.courses.production.map((item) => ({
          id: item.id ?? item.asset,
          title: item.asset ?? item.title ?? 'Production asset',
          description: item.description ?? item.summary,
          status: item.status ?? (item.complete ? 'completed' : 'in-progress'),
          dueAt: item.dueAt ?? item.deadline ?? null,
          category: 'Production',
          impact: item.impact ?? null
        }))
      );
    }
    return sources;
  }, [dashboard.tasks, dashboard.alerts?.tasks, dashboard.courses?.production]);

  const taskBoardTasks = useMemo(() => {
    if (!Array.isArray(taskSources) || taskSources.length === 0) return [];
    return taskSources
      .map((task, index) => ({
        id: task.id ?? task.slug ?? `task-${index}`,
        title: task.title ?? task.name ?? 'Task',
        description: task.description ?? task.summary ?? '',
        status: task.status ?? (task.completed ? 'completed' : 'pending'),
        dueAt: task.dueAt ?? task.dueDate ?? task.deadline ?? null,
        category: task.category ?? task.type ?? 'General',
        impact: task.impact ?? task.importance ?? null,
        link: task.href ?? task.link ?? null
      }))
      .slice(0, 8);
  }, [taskSources]);

  const taskBoardMetrics = useMemo(() => {
    if (taskBoardTasks.length === 0) {
      return [];
    }
    const total = taskBoardTasks.length;
    const completed = taskBoardTasks.filter((task) => String(task.status).toLowerCase().includes('complete')).length;
    const pending = total - completed;
    const scheduled = taskBoardTasks.filter((task) => task.dueAt).length;
    return [
      {
        label: 'Tasks open',
        value: pending,
        change: `${total} total`,
        trend: pending > completed ? 'up' : 'down'
      },
      {
        label: 'Completed',
        value: completed,
        change: pending ? `${pending} remaining` : 'All clear',
        trend: 'up'
      },
      {
        label: 'Scheduled work',
        value: scheduled,
        change: 'Linked to deadlines',
        trend: 'up'
      }
    ];
  }, [taskBoardTasks]);

  const handleTaskSelect = useCallback(
    (task) => {
      if (task?.link) {
        window.open(task.link, '_blank', 'noopener,noreferrer');
      }
    },
    []
  );

  return (
    <div className="space-y-10">
      {metrics.length > 0 ? (
        <InstructorMetricsSection metrics={metrics} />
      ) : (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Metrics dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            No metrics available for this workspace yet. Connect telemetry sources to unlock insight tracking.
          </p>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-5">
        <InstructorProfileSection profile={safeProfile} stats={enrollmentMetrics} />
        <div className="space-y-6">
          <InstructorRevenueSection revenueSlices={revenueSlices} />
          <div className="dashboard-card-muted space-y-2 p-4 text-xs text-slate-600">
            <p className="text-sm font-semibold text-slate-900">Portfolio snapshot</p>
            <p>{healthSummary.pipelineCount} active pipeline cohorts</p>
            <p>{healthSummary.productionCount} assets in production sprint</p>
            <p>{Math.round(healthSummary.totalRevenue)}% revenue coverage mapped</p>
          </div>
        </div>
      </section>

      <VerificationStatusCard verification={safeProfile.verification} onRefresh={onRefresh} />

      <InstructorTaskBoard tasks={taskBoardTasks} metrics={taskBoardMetrics} onTaskSelect={handleTaskSelect} />

      {alerts.length > 0 ? (
        <section className="dashboard-section">
          <h2 className="text-lg font-semibold text-slate-900">Action centre</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
              >
                <div>
                  <p className="font-semibold text-slate-900">{alert.title}</p>
                  {alert.description ? <p className="text-xs text-slate-500">{alert.description}</p> : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full px-3 py-1 text-[11px] uppercase tracking-wide text-slate-600">
                    {alert.severity}
                  </span>
                  {alert.link ? (
                    <a
                      href={alert.link}
                      className="dashboard-pill px-3 py-1"
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {alert.actionLabel}
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <InstructorPipelineSection pipeline={pipeline} />
        <InstructorProductionSection production={production} />
      </section>
    </div>
  );
}

InstructorOverview.propTypes = {
  dashboard: PropTypes.object.isRequired,
  profile: PropTypes.object.isRequired,
  onRefresh: PropTypes.func
};

InstructorOverview.defaultProps = {
  onRefresh: null
};
