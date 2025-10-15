import PropTypes from 'prop-types';
import { ClockIcon, ShieldCheckIcon, UserCircleIcon } from '@heroicons/react/24/outline';

import { findActiveSessionForUser, sessionRecency } from './creationStudioUtils.js';

function CollaboratorRow({ collaborator, isSelf }) {
  const permissions = Array.isArray(collaborator.permissions) ? collaborator.permissions : [];
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-600">
      <div>
        <p className="font-semibold text-slate-900">
          User #{collaborator.userId} {isSelf && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">You</span>}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{collaborator.role}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheckIcon className="h-4 w-4" />
        {permissions.length} permissions
      </div>
    </li>
  );
}

CollaboratorRow.propTypes = {
  collaborator: PropTypes.shape({
    userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    role: PropTypes.string,
    permissions: PropTypes.array
  }).isRequired,
  isSelf: PropTypes.bool
};

CollaboratorRow.defaultProps = {
  isSelf: false
};

function SessionRow({ session, isOwnSession, onEndSession, sessionLoading }) {
  const isLive = sessionRecency(session) < 1000 * 90;
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
      <div>
        <p className="font-semibold text-slate-900">User #{session.participantId}</p>
        <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
          {session.role} · Started {session.joinedAt ? new Date(session.joinedAt).toLocaleTimeString() : 'recently'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${
          isLive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
        }`}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isLive ? '#047857' : '#94a3b8' }} />
          {isLive ? 'Live' : 'Idle'}
        </span>
        {isOwnSession && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
            onClick={() => onEndSession(session)}
            disabled={sessionLoading}
          >
            End
          </button>
        )}
      </div>
    </li>
  );
}

SessionRow.propTypes = {
  session: PropTypes.shape({
    participantId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    role: PropTypes.string,
    joinedAt: PropTypes.string
  }).isRequired,
  isOwnSession: PropTypes.bool,
  onEndSession: PropTypes.func.isRequired,
  sessionLoading: PropTypes.bool
};

SessionRow.defaultProps = {
  isOwnSession: false,
  sessionLoading: false
};

export default function CreationCollaboratorsPanel({
  collaborators,
  sessions,
  currentUserId,
  sessionLoading,
  onTerminateSelfSession
}) {
  const ownSession = findActiveSessionForUser(sessions, currentUserId);

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Collaborators</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">Team access & presence</h3>
          <p className="mt-1 text-sm text-slate-600">
            Manage who can collaborate on this project and monitor live presence. Ending a session will immediately revoke live editing access.
          </p>
        </div>
        <UserCircleIcon className="h-10 w-10 text-primary" />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active sessions</p>
        <ul className="space-y-2">
          {sessions.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              No collaborators are active right now.
            </li>
          ) : (
            sessions.map((session) => (
              <SessionRow
                key={session.id ?? session.publicId ?? `${session.participantId}-${session.joinedAt}`}
                session={session}
                isOwnSession={ownSession?.id === session.id || ownSession?.id === session.publicId}
                onEndSession={() => onTerminateSelfSession(session)}
                sessionLoading={sessionLoading}
              />
            ))
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Collaborator roster</p>
        <ul className="space-y-2">
          {collaborators.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              No collaborators assigned yet.
            </li>
          ) : (
            collaborators.map((collaborator) => (
              <CollaboratorRow
                key={collaborator.userId}
                collaborator={collaborator}
                isSelf={String(collaborator.userId) === String(currentUserId)}
              />
            ))
          )}
        </ul>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <ClockIcon className="h-4 w-4" />
        Sessions automatically expire after 30 minutes of inactivity to protect access. Refreshing the page will renew your heartbeat.
      </div>
    </section>
  );
}

CreationCollaboratorsPanel.propTypes = {
  collaborators: PropTypes.arrayOf(CollaboratorRow.propTypes.collaborator),
  sessions: PropTypes.arrayOf(SessionRow.propTypes.session),
  currentUserId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sessionLoading: PropTypes.bool,
  onTerminateSelfSession: PropTypes.func
};

CreationCollaboratorsPanel.defaultProps = {
  collaborators: [],
  sessions: [],
  currentUserId: null,
  sessionLoading: false,
  onTerminateSelfSession: () => {}
};
