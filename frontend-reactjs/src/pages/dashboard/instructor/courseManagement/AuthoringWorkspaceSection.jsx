import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthoringDraftModal from './AuthoringDraftModal.jsx';

const LAST_DRAFT_KEY = 'edulure.authoring.lastDraft';

function getStoredDraftId() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_DRAFT_KEY);
}

function persistDraftId(id) {
  if (typeof window === 'undefined') return;
  if (id) {
    window.localStorage.setItem(LAST_DRAFT_KEY, id);
  } else {
    window.localStorage.removeItem(LAST_DRAFT_KEY);
  }
}

function buildDraftSummary(draft) {
  const collaboratorCount = draft.collaborators?.length ?? 0;
  const sessionCount = draft.activeSessions?.length ?? 0;
  const localesCount = draft.locales?.length ?? 0;
  return `${collaboratorCount} collaborators · ${sessionCount} active · ${localesCount} locales`;
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export default function AuthoringWorkspaceSection({ authoring }) {
  const drafts = Array.isArray(authoring?.drafts) ? authoring.drafts : [];
  const activeSessions = Array.isArray(authoring?.activeSessions) ? authoring.activeSessions : [];
  const coverage = authoring?.localisationCoverage ?? { totalLanguages: 0, publishedLanguages: 0, missing: [] };

  const [selectedDraftId, setSelectedDraftId] = useState(() => getStoredDraftId());
  const [searchTerm, setSearchTerm] = useState('');

  const selectedDraft = useMemo(
    () => drafts.find((draft) => String(draft.id) === String(selectedDraftId)) ?? null,
    [drafts, selectedDraftId]
  );

  useEffect(() => {
    persistDraftId(selectedDraft ? selectedDraft.id : null);
  }, [selectedDraft]);

  const openDraft = useCallback((draftId) => {
    setSelectedDraftId(String(draftId));
  }, []);

  const closeModal = useCallback(() => {
    setSelectedDraftId(null);
  }, []);

  const forgetDraft = useCallback(() => {
    setSelectedDraftId(null);
  }, []);

  const missingLanguages = Array.isArray(coverage.missing) ? coverage.missing : [];

  const filteredDrafts = useMemo(() => {
    if (!searchTerm) return drafts;
    const normalised = searchTerm.toLowerCase();
    return drafts.filter((draft) =>
      [draft.title, draft.status, (draft.complianceNotes ?? []).join(' ')].some((value) =>
        value ? String(value).toLowerCase().includes(normalised) : false
      )
    );
  }, [drafts, searchTerm]);

  const hasContent = drafts.length > 0 || activeSessions.length > 0;
  if (!hasContent) {
    return null;
  }

  return (
    <section className="dashboard-section">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Authoring workspace</h2>
          <p className="text-sm text-slate-600">
            Monitor collaborative production drafts and localisation readiness.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Filter drafts</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search status, owner, compliance"
            className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
        <div className="dashboard-card-muted px-4 py-3 text-xs text-slate-600">
          <p className="text-sm font-semibold text-slate-900">Localisation coverage</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-primary"
                style={{ width: `${percentage(coverage.publishedLanguages ?? 0, coverage.totalLanguages ?? 0)}%` }}
              />
            </div>
            <span>
              {coverage.publishedLanguages ?? 0}/{coverage.totalLanguages ?? 0} languages published
            </span>
          </div>
          {missingLanguages.length > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              Missing: {missingLanguages.slice(0, 5).join(', ')}
              {missingLanguages.length > 5 ? '…' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="dashboard-card-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Drafts in progress</h3>
            <span className="text-xs text-slate-500">{filteredDrafts.length}/{drafts.length} drafts</span>
          </div>
          {filteredDrafts.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No draft projects available.</p>
          ) : (
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {filteredDrafts.map((draft) => (
                <li key={draft.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{draft.title}</p>
                      <p className="text-xs text-slate-500">{buildDraftSummary(draft)}</p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-pill px-3 py-1 text-xs"
                      onClick={() => openDraft(draft.id)}
                    >
                      View draft
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {(draft.complianceNotes ?? []).slice(0, 2).map((note, index) => (
                      <span key={index} className="rounded-full bg-slate-100 px-2 py-1">
                        {note}
                      </span>
                    ))}
                    {(draft.publishingChannels ?? []).map((channel) => (
                      <span key={channel} className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                        {channel}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="dashboard-card-muted p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Active collaboration sessions</h3>
            <span className="text-xs text-slate-500">{activeSessions.length} active</span>
          </div>
          {activeSessions.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No live sessions detected.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-xs text-slate-600">
              {activeSessions.map((session) => (
                <li key={session.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{session.participant}</p>
                      <p className="text-xs text-slate-500">
                        {session.projectTitle} · {session.role}
                      </p>
                    </div>
                    {session.joinedAt && (
                      <span className="text-xs text-slate-500">
                        Joined {new Date(session.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {session.capabilities?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {session.capabilities.map((capability) => (
                        <span key={capability} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {capability}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selectedDraft ? (
        <AuthoringDraftModal draft={selectedDraft} onClose={closeModal} onForget={forgetDraft} />
      ) : null}
    </section>
  );
}

AuthoringWorkspaceSection.propTypes = {
  authoring: PropTypes.shape({
    drafts: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string,
        status: PropTypes.string,
        collaborators: PropTypes.array,
        activeSessions: PropTypes.array,
        locales: PropTypes.array,
        complianceNotes: PropTypes.array,
        publishingChannels: PropTypes.array
      })
    ),
    activeSessions: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        participant: PropTypes.string,
        role: PropTypes.string,
        joinedAt: PropTypes.string,
        capabilities: PropTypes.arrayOf(PropTypes.string),
        projectTitle: PropTypes.string
      })
    ),
    localisationCoverage: PropTypes.shape({
      totalLanguages: PropTypes.number,
      publishedLanguages: PropTypes.number,
      missing: PropTypes.arrayOf(PropTypes.string)
    })
  })
};

AuthoringWorkspaceSection.defaultProps = {
  authoring: null
};
