import PropTypes from 'prop-types';

export default function CourseCreationHeader({
  onGenerateOutline,
  onImportFromNotion,
  onSyncFromLms,
  isGenerating,
  isImporting,
  isSyncing
}) {
  const canGenerate = typeof onGenerateOutline === 'function';
  const canImport = typeof onImportFromNotion === 'function';
  const canSync = typeof onSyncFromLms === 'function';

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="dashboard-title">Course creation hub</h1>
        <p className="dashboard-subtitle">
          Structure each cohort with production-ready blueprints, module pacing, and readiness insights.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="dashboard-primary-pill disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onGenerateOutline}
          disabled={isGenerating || !canGenerate}
          aria-busy={isGenerating}
          aria-live="polite"
          aria-label="Generate AI-assisted course outline"
        >
          {isGenerating ? 'Generating…' : 'Generate outline'}
        </button>
        <button
          type="button"
          className="dashboard-pill disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onImportFromNotion}
          disabled={isImporting || !canImport}
          aria-busy={isImporting}
        >
          {isImporting ? 'Importing…' : 'Import from Notion'}
        </button>
        <button
          type="button"
          className="dashboard-pill disabled:cursor-not-allowed disabled:opacity-60"
          onClick={onSyncFromLms}
          disabled={isSyncing || !canSync}
          aria-busy={isSyncing}
        >
          {isSyncing ? 'Syncing…' : 'Sync from LMS'}
        </button>
      </div>
    </div>
  );
}

CourseCreationHeader.propTypes = {
  onGenerateOutline: PropTypes.func,
  onImportFromNotion: PropTypes.func,
  onSyncFromLms: PropTypes.func,
  isGenerating: PropTypes.bool,
  isImporting: PropTypes.bool,
  isSyncing: PropTypes.bool
};

CourseCreationHeader.defaultProps = {
  onGenerateOutline: undefined,
  onImportFromNotion: undefined,
  onSyncFromLms: undefined,
  isGenerating: false,
  isImporting: false,
  isSyncing: false
};
