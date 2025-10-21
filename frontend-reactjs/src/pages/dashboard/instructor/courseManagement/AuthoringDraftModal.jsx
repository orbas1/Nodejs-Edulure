import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';

const STORAGE_PREFIX = 'edulure.authoring.draft.';

function getDraftStorageKey(draftId) {
  return `${STORAGE_PREFIX}${draftId}`;
}

function persistDraftVisit(draft) {
  if (typeof window === 'undefined') return;
  const key = getDraftStorageKey(draft.id);
  const payload = {
    projectId: draft.projectId,
    lastViewedAt: new Date().toISOString(),
    status: draft.status,
    collaborators: draft.collaborators?.map((collaborator) => collaborator.id) ?? []
  };
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage quota errors
  }
}

export default function AuthoringDraftModal({ draft, onClose, onForget }) {
  useEffect(() => {
    persistDraftVisit(draft);
  }, [draft]);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => undefined;
    }
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleForget = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(getDraftStorageKey(draft.id));
    }
    onForget?.(draft);
  };

  const handleOpenStudio = () => {
    if (typeof window === 'undefined') return;
    const target = `/dashboard/instructor/creation-studio?project=${draft.projectId ?? draft.id}`;
    window.open(target, '_blank', 'noopener');
  };

  const renderCollaborators = (collaborators = []) => {
    if (!collaborators.length) {
      return <p className="text-xs text-slate-500">No collaborators assigned yet.</p>;
    }
    return (
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {collaborators.map((collaborator) => (
          <li key={collaborator.id} className="flex items-center justify-between gap-3">
            <span className="font-medium text-slate-900">{collaborator.displayName}</span>
            <span className="text-xs text-slate-500">{collaborator.role}</span>
          </li>
        ))}
      </ul>
    );
  };

  const renderSessions = (sessions = []) => {
    if (!sessions.length) {
      return <p className="text-xs text-slate-500">No live collaboration sessions detected.</p>;
    }
    return (
      <ul className="mt-2 space-y-1 text-xs text-slate-600">
        {sessions.map((session) => (
          <li key={session.id} className="rounded bg-slate-100 px-2 py-1">
            <span className="font-medium text-slate-900">{session.participant}</span>
            <span className="ml-2 text-slate-500">{session.role}</span>
            {session.joinedAt && (
              <span className="ml-2 text-slate-500">
                Joined {new Date(session.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const renderCompliance = (notes = []) => {
    if (!notes.length) {
      return <p className="text-xs text-slate-500">No compliance notes recorded.</p>;
    }
    return (
      <ul className="mt-2 space-y-2 text-xs text-slate-600">
        {notes.map((note, index) => (
          <li key={index} className="rounded bg-white/70 p-2">
            {note}
          </li>
        ))}
      </ul>
    );
  };

  const modalTarget = typeof document !== 'undefined' ? document.body : null;
  if (!modalTarget) {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{draft.title}</h2>
            <p className="text-xs uppercase tracking-wide text-slate-500">{draft.status}</p>
          </div>
          <button
            type="button"
            className="dashboard-pill px-3 py-1 text-xs"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Collaborators</h3>
            {renderCollaborators(draft.collaborators)}
          </div>
          <div className="rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Live sessions</h3>
            {renderSessions(draft.activeSessions)}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Localisation readiness</h3>
            <p className="mt-1 text-xs text-slate-500">
              {draft.locales?.length ?? 0} locales attached · {draft.complianceNotes?.length ?? 0} compliance notes
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(draft.locales ?? []).map((locale) => (
                <span key={locale} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  {locale}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Compliance</h3>
            {renderCompliance(draft.complianceNotes)}
          </div>
        </div>

        {(draft.publishingChannels?.length ?? 0) > 0 && (
          <div className="mt-4 rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Publishing channels</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {draft.publishingChannels.map((channel) => (
                <span key={channel} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                  {channel}
                </span>
              ))}
            </div>
          </div>
        )}

        {draft.analyticsTargets && Object.keys(draft.analyticsTargets).length > 0 && (
          <div className="mt-4 rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Analytics targets</h3>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {Object.entries(draft.analyticsTargets).map(([metric, target]) => (
                <li key={metric} className="flex items-center justify-between gap-3">
                  <span className="font-medium text-slate-900">{metric}</span>
                  <span>{String(target)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="dashboard-primary-pill px-4 py-2 text-xs" onClick={handleOpenStudio}>
            Open in creation studio
          </button>
          <button type="button" className="dashboard-pill px-4 py-2 text-xs" onClick={handleForget}>
            Forget local cache
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, modalTarget);
}

AuthoringDraftModal.propTypes = {
  draft: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    projectId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    title: PropTypes.string,
    status: PropTypes.string,
    collaborators: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        displayName: PropTypes.string,
        role: PropTypes.string
      })
    ),
    activeSessions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        participant: PropTypes.string,
        role: PropTypes.string,
        joinedAt: PropTypes.string
      })
    ),
    locales: PropTypes.arrayOf(PropTypes.string),
    complianceNotes: PropTypes.arrayOf(PropTypes.string),
    publishingChannels: PropTypes.arrayOf(PropTypes.string),
    analyticsTargets: PropTypes.object
  }).isRequired,
  onClose: PropTypes.func.isRequired,
  onForget: PropTypes.func
};

AuthoringDraftModal.defaultProps = {
  onForget: undefined
};
