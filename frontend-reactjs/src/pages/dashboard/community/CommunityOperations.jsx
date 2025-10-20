import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardActionFeedback from "../../../components/dashboard/DashboardActionFeedback.jsx";
import DashboardStateMessage from "../../../components/dashboard/DashboardStateMessage.jsx";
import {
  acknowledgeCommunityEscalation,
  publishCommunityRunbook
} from "../../../api/communityApi.js";
import { useAuth } from "../../../context/AuthContext.jsx";

const emptyRunbookForm = {
  communityId: "",
  title: "",
  summary: "",
  owner: "",
  tagsInput: "",
  linkUrl: "",
  automationReady: false
};

export default function CommunityOperations({ dashboard, onRefresh }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const initialRunbooks = useMemo(
    () => (Array.isArray(dashboard?.operations?.runbooks) ? dashboard.operations.runbooks : []),
    [dashboard?.operations?.runbooks]
  );
  const initialEscalations = useMemo(
    () => (Array.isArray(dashboard?.operations?.escalations) ? dashboard.operations.escalations : []),
    [dashboard?.operations?.escalations]
  );
  const moderators = useMemo(
    () => (Array.isArray(dashboard?.health?.moderators) ? dashboard.health.moderators : []),
    [dashboard?.health?.moderators]
  );
  const [runbooks, setRunbooks] = useState(initialRunbooks);
  const [escalations, setEscalations] = useState(initialEscalations);
  const [runbookForm, setRunbookForm] = useState({
    ...emptyRunbookForm,
    owner: session?.profile?.name ?? "Operations team"
  });
  const [ackNotes, setAckNotes] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ackPendingId, setAckPendingId] = useState(null);

  useEffect(() => {
    setRunbooks(initialRunbooks);
  }, [initialRunbooks]);

  useEffect(() => {
    setEscalations(initialEscalations);
  }, [initialEscalations]);

  const communityOptions = useMemo(() => {
    const options = new Map();
    if (Array.isArray(dashboard?.operations?.communities)) {
      dashboard.operations.communities.forEach((community) => {
        if (community?.id) {
          options.set(String(community.id), {
            value: String(community.id),
            label: community.name ?? community.title ?? `Community ${community.id}`
          });
        }
      });
    }
    [...runbooks, ...escalations].forEach((item) => {
      if (!item?.communityId) return;
      const key = String(item.communityId);
      if (!options.has(key)) {
        options.set(key, {
          value: key,
          label: item.communityName ?? item.community ?? `Community ${key}`
        });
      }
    });
    return Array.from(options.values());
  }, [dashboard?.operations?.communities, escalations, runbooks]);

  const defaultCommunityId = useMemo(() => {
    if (dashboard?.operations?.targetCommunityId) {
      return String(dashboard.operations.targetCommunityId);
    }
    if (communityOptions.length > 0) {
      return communityOptions[0].value;
    }
    if (runbooks[0]?.communityId) {
      return String(runbooks[0].communityId);
    }
    if (escalations[0]?.communityId) {
      return String(escalations[0].communityId);
    }
    return "";
  }, [communityOptions, dashboard?.operations?.targetCommunityId, escalations, runbooks]);

  useEffect(() => {
    setRunbookForm((previous) => ({
      ...previous,
      communityId: previous.communityId || defaultCommunityId
    }));
  }, [defaultCommunityId]);

  const handleRunbookFieldChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setRunbookForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  }, []);

  const handleRunbookSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) {
        setFeedback({ tone: "error", message: "You must be signed in to publish runbooks." });
        return;
      }
      if (!runbookForm.communityId) {
        setFeedback({ tone: "error", message: "Select a community to attach the runbook to." });
        return;
      }
      if (!runbookForm.title) {
        setFeedback({ tone: "error", message: "Runbook title is required." });
        return;
      }
      setIsSubmitting(true);
      setFeedback(null);
      const tags = runbookForm.tagsInput
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      const optimistic = {
        id: `temp-${Date.now()}`,
        title: runbookForm.title,
        summary: runbookForm.summary,
        owner: runbookForm.owner || "Operations team",
        automationReady: runbookForm.automationReady,
        tags,
        linkUrl: runbookForm.linkUrl || null,
        updatedAt: new Date().toISOString(),
        communityId: runbookForm.communityId
      };
      setRunbooks((previous) => [optimistic, ...previous]);
      try {
        const response = await publishCommunityRunbook({
          communityId: runbookForm.communityId,
          token,
          payload: {
            title: runbookForm.title,
            summary: runbookForm.summary,
            owner: runbookForm.owner || "Operations team",
            automationReady: runbookForm.automationReady,
            linkUrl: runbookForm.linkUrl || undefined,
            tags
          }
        });
        if (response.data) {
          setRunbooks((previous) =>
            previous.map((runbook) => (runbook.id === optimistic.id ? response.data : runbook))
          );
          setFeedback({ tone: "success", message: "Runbook published successfully." });
        }
        setRunbookForm({
          ...emptyRunbookForm,
          owner: runbookForm.owner,
          communityId: runbookForm.communityId
        });
      } catch (error) {
        setRunbooks((previous) => previous.filter((runbook) => runbook.id !== optimistic.id));
        setFeedback({ tone: "error", message: error?.message ?? "Failed to publish runbook." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [runbookForm, token]
  );

  const handleAcknowledge = useCallback(
    async (task) => {
      if (!token) {
        setFeedback({ tone: "error", message: "You must be signed in to acknowledge escalations." });
        return;
      }
      const targetCommunityId =
        runbookForm.communityId || defaultCommunityId || String(task.communityId ?? "");
      if (!targetCommunityId) {
        setFeedback({ tone: "error", message: "Community identifier required to acknowledge." });
        return;
      }
      setAckPendingId(task.id);
      setFeedback(null);
      const note = ackNotes[task.id] ?? "";
      const optimistic = { ...task, status: "Acknowledged" };
      setEscalations((previous) => previous.map((item) => (item.id === task.id ? optimistic : item)));
      try {
        await acknowledgeCommunityEscalation({
          communityId: targetCommunityId,
          escalationId: task.id,
          token,
          payload: note ? { note } : {}
        });
        setFeedback({ tone: "success", message: "Escalation acknowledged." });
      } catch (error) {
        setEscalations((previous) => previous.map((item) => (item.id === task.id ? task : item)));
        setFeedback({ tone: "error", message: error?.message ?? "Failed to acknowledge escalation." });
      } finally {
        setAckPendingId(null);
      }
    },
    [ackNotes, defaultCommunityId, runbookForm.communityId, token]
  );

  if (!dashboard) {
    return (
      <DashboardStateMessage
        title="Community operations unavailable"
        description="We could not resolve any operational telemetry for your communities. Refresh once data sources are synced."
        actionLabel="Refresh"
        onAction={onRefresh}
      />
    );
  }

  return (
    <div className="space-y-8">
      <DashboardActionFeedback feedback={feedback} onDismiss={() => setFeedback(null)} />
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="dashboard-title">Operations command center</h1>
          <p className="dashboard-subtitle">
            Review playbooks, outstanding escalations, and moderator coverage to maintain consistent community rituals.
          </p>
        </div>
        <button type="button" className="dashboard-primary-pill" onClick={onRefresh}>
          Refresh signals
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="dashboard-section space-y-5">
          <div>
            <p className="dashboard-kicker">Runbooks</p>
            <h2 className="text-lg font-semibold text-slate-900">Automation-ready playbooks</h2>
          </div>
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white/70 p-4" onSubmit={handleRunbookSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Target community
                <select
                  name="communityId"
                  value={runbookForm.communityId}
                  onChange={handleRunbookFieldChange}
                  className="dashboard-input"
                >
                  <option value="">Select community</option>
                  {communityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner
                <input
                  name="owner"
                  value={runbookForm.owner}
                  onChange={handleRunbookFieldChange}
                  className="dashboard-input"
                  placeholder="Operations team"
                />
              </label>
            </div>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Title
              <input
                required
                name="title"
                value={runbookForm.title}
                onChange={handleRunbookFieldChange}
                className="dashboard-input"
                placeholder="Incident response ritual"
              />
            </label>
            <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Summary
              <textarea
                name="summary"
                value={runbookForm.summary}
                onChange={handleRunbookFieldChange}
                className="dashboard-input min-h-[100px]"
                placeholder="Outline the cadence, tooling, and roles involved in this ritual."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tags
                <input
                  name="tagsInput"
                  value={runbookForm.tagsInput}
                  onChange={handleRunbookFieldChange}
                  className="dashboard-input"
                  placeholder="escalation, moderation, onboarding"
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Link URL
                <input
                  name="linkUrl"
                  value={runbookForm.linkUrl}
                  onChange={handleRunbookFieldChange}
                  className="dashboard-input"
                  placeholder="https://docs.example.com/runbook"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <input
                type="checkbox"
                name="automationReady"
                checked={runbookForm.automationReady}
                onChange={handleRunbookFieldChange}
              />
              Automation ready
            </label>
            <div className="flex justify-end">
              <button type="submit" className="dashboard-primary-pill px-5 py-2" disabled={isSubmitting}>
                {isSubmitting ? "Publishing…" : "Publish runbook"}
              </button>
            </div>
          </form>
          <ul className="space-y-4">
            {runbooks.map((runbook) => (
              <li key={runbook.id} className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{runbook.title}</p>
                    <p className="mt-1 text-xs text-slate-500">Maintained by {runbook.owner}</p>
                  </div>
                  <span
                    className={`dashboard-pill px-3 py-1 text-xs font-semibold ${
                      runbook.automationReady ? "border-primary/30 text-primary" : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {runbook.automationReady ? "Automation ready" : "Manual workflow"}
                  </span>
                </div>
                {runbook.summary ? (
                  <p className="mt-3 text-sm text-slate-600">{runbook.summary}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                  {runbook.tags?.map((tag) => (
                    <span key={`${runbook.id}-${tag}`} className="dashboard-pill px-3 py-1">
                      {tag}
                    </span>
                  ))}
                  <span className="dashboard-pill px-3 py-1">Updated {runbook.updatedAt}</span>
                  {runbook.linkUrl ? (
                    <a
                      href={runbook.linkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="dashboard-pill px-3 py-1 text-primary hover:underline"
                    >
                      View documentation
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          {runbooks.length === 0 ? (
            <DashboardStateMessage
              title="No runbooks available"
              description="Create a community operations playbook to document rituals, cadences, and escalation paths."
            />
          ) : null}
        </article>

        <article className="dashboard-section space-y-5">
          <div>
            <p className="dashboard-kicker">Escalations</p>
            <h2 className="text-lg font-semibold text-slate-900">Operational backlog</h2>
          </div>
          <ul className="space-y-4">
            {escalations.map((task) => (
              <li key={task.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-semibold text-amber-900">{task.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-amber-600">
                      Due {task.due ?? task.sla ?? "soon"}
                    </p>
                  </div>
                  <span className="dashboard-pill border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800">
                    {task.status}
                  </span>
                </div>
                {task.community ? (
                  <p className="mt-3 text-sm text-amber-800">{task.community}</p>
                ) : null}
                <p className="mt-1 text-xs text-amber-700">Owner: {task.owner ?? "Operations"}</p>
                <label className="mt-3 block text-xs text-amber-700">
                  Acknowledgement note
                  <textarea
                    value={ackNotes[task.id] ?? ""}
                    onChange={(event) =>
                      setAckNotes((previous) => ({ ...previous, [task.id]: event.target.value }))
                    }
                    className="dashboard-input mt-1"
                    placeholder="Document actions, next steps, or hand-offs."
                  />
                </label>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                  <button
                    type="button"
                    className="dashboard-pill border-amber-300 bg-white px-3 py-1 text-amber-700"
                    onClick={() => handleAcknowledge(task)}
                    disabled={ackPendingId === task.id}
                  >
                    {ackPendingId === task.id ? "Submitting…" : "Acknowledge"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {escalations.length === 0 ? (
            <DashboardStateMessage
              title="No escalations in queue"
              description="Escalation-ready rituals will surface here when tasks require intervention."
            />
          ) : null}
        </article>
      </section>

      <section className="dashboard-section space-y-4">
        <div>
          <p className="dashboard-kicker">Moderator coverage</p>
          <h2 className="text-lg font-semibold text-slate-900">Leadership roster</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {moderators.map((moderator) => (
            <div key={moderator.id} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{moderator.role}</p>
              <p className="mt-1 text-xs text-slate-500">{moderator.community}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="dashboard-pill px-3 py-1">{moderator.timezone}</span>
                <span className="dashboard-pill px-3 py-1">{moderator.coverage}</span>
              </div>
            </div>
          ))}
          {moderators.length === 0 ? (
            <DashboardStateMessage
              title="No moderators assigned"
              description="Invite moderators or community leads to ensure hand-offs and coverage are documented."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

CommunityOperations.propTypes = {
  dashboard: PropTypes.object,
  onRefresh: PropTypes.func
};

CommunityOperations.defaultProps = {
  dashboard: null,
  onRefresh: undefined
};
