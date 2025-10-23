import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';

import { startSetupRun } from '../api/setupApi.js';
import usePageMetadata from '../hooks/usePageMetadata.js';
import useSetupProgress from '../hooks/useSetupProgress.js';

const BACKEND_FIELD_GROUPS = [
  {
    title: 'Application',
    description: 'Base metadata for the backend service and public URL.',
    fields: [
      { key: 'APP_NAME', label: 'App name', placeholder: 'Edulure' },
      { key: 'APP_ENV', label: 'Environment', placeholder: 'development' },
      { key: 'APP_URL', label: 'Application URL', placeholder: 'http://localhost:4000' },
      { key: 'APP_PORT', label: 'API port', placeholder: '4000' },
      { key: 'JWT_SECRET', label: 'JWT secret (fallback)', placeholder: 'change-me-super-secret-key' }
    ]
  },
  {
    title: 'Database',
    description: 'MySQL connection details used by the backend and migrations.',
    fields: [
      { key: 'DB_HOST', label: 'Host', placeholder: '127.0.0.1' },
      { key: 'DB_PORT', label: 'Port', placeholder: '3306' },
      { key: 'DB_USER', label: 'User', placeholder: 'edulure' },
      { key: 'DB_PASSWORD', label: 'Password', placeholder: 'edulure' },
      { key: 'DB_NAME', label: 'Database name', placeholder: 'edulure' },
      {
        key: 'DB_URL',
        label: 'Database URL',
        placeholder: 'mysql://edulure:edulure@127.0.0.1:3306/edulure?timezone=Z'
      }
    ]
  },
  {
    title: 'Caching & realtime',
    description: 'Redis / socket connection strings for realtime gateways and workers.',
    fields: [
      { key: 'REDIS_URL', label: 'Redis URL', placeholder: 'redis://127.0.0.1:6379/0' },
      { key: 'REALTIME_PORT', label: 'Realtime port', placeholder: '4100' }
    ]
  },
  {
    title: 'Search',
    description: 'Meilisearch cluster configuration for explorer and mail search.',
    fields: [
      { key: 'MEILISEARCH_HOSTS', label: 'Hosts', placeholder: 'http://127.0.0.1:7700' },
      { key: 'MEILISEARCH_API_KEY', label: 'API key', placeholder: 'masterKey' }
    ]
  }
];

const FRONTEND_FIELDS = [
  { key: 'VITE_APP_URL', label: 'Web app URL', placeholder: 'http://localhost:5173' },
  { key: 'VITE_API_URL', label: 'API URL', placeholder: 'http://localhost:4000/api/v1' },
  { key: 'VITE_REALTIME_URL', label: 'Realtime URL', placeholder: 'http://localhost:4100' },
  { key: 'VITE_STORAGE_PUBLIC_BASE', label: 'Public asset base URL', placeholder: 'http://localhost:4000/storage' }
];

const DEFAULT_BACKEND_VALUES = BACKEND_FIELD_GROUPS.flatMap((group) => group.fields).reduce((acc, field) => {
  acc[field.key] = field.placeholder ?? '';
  return acc;
}, {});

const DEFAULT_FRONTEND_VALUES = FRONTEND_FIELDS.reduce((acc, field) => {
  acc[field.key] = field.placeholder ?? '';
  return acc;
}, {});

const STORAGE_DRIVERS = [
  { value: 'local', label: 'Local (disk storage served by backend)' },
  { value: 'r2', label: 'Cloudflare R2 (S3 compatible)' }
];

const LOCAL_STORAGE_FIELDS = [
  { key: 'LOCAL_STORAGE_ROOT', label: 'Local storage root', placeholder: './storage/local' },
  { key: 'LOCAL_STORAGE_PUBLIC_URL', label: 'Public base URL', placeholder: 'http://localhost:4000/storage' },
  { key: 'LOCAL_STORAGE_SERVE_STATIC', label: 'Serve static assets', placeholder: 'true' }
];

const R2_STORAGE_FIELDS = [
  { key: 'R2_ACCOUNT_ID', label: 'Account ID', placeholder: 'xxxx-xxxx-xxxx' },
  { key: 'R2_ACCESS_KEY_ID', label: 'Access key ID', placeholder: 'AKIA...' },
  { key: 'R2_SECRET_ACCESS_KEY', label: 'Secret access key', placeholder: '********' },
  { key: 'R2_REGION', label: 'Region', placeholder: 'auto' },
  { key: 'R2_PUBLIC_BUCKET', label: 'Public bucket', placeholder: 'edulure-public' },
  { key: 'R2_PRIVATE_BUCKET', label: 'Private bucket', placeholder: 'edulure-private' },
  { key: 'R2_UPLOADS_BUCKET', label: 'Uploads bucket', placeholder: 'edulure-uploads' },
  { key: 'R2_QUARANTINE_BUCKET', label: 'Quarantine bucket', placeholder: 'edulure-quarantine' },
  { key: 'R2_CDN_URL', label: 'CDN URL (optional)', placeholder: 'https://cdn.example.com' }
];

const TASK_STATUS_CLASS = {
  pending: 'border-slate-200 text-slate-600 bg-slate-50/70',
  running: 'border-indigo-400 text-indigo-600 bg-indigo-50/70',
  succeeded: 'border-emerald-400 text-emerald-600 bg-emerald-50/70',
  failed: 'border-rose-500 text-rose-600 bg-rose-50/80'
};

const RUN_STATUS_CLASS = {
  succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  running: 'border-indigo-200 bg-indigo-50 text-indigo-700'
};

function resolveRunStatusClass(status) {
  return RUN_STATUS_CLASS[status] ?? 'border-slate-200 bg-slate-50 text-slate-600';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleTimeString();
}

function formatFullDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
}

function formatDuration(start, end) {
  if (!start || !end) {
    return '—';
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '—';
  }
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const totalSeconds = Math.round(diffMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  if (totalMinutes < 60) {
    return `${totalMinutes}m ${remainingSeconds}s`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${totalHours}h ${remainingMinutes}m`;
}

export default function Setup() {
  usePageMetadata({ title: 'Platform installer' });

  const [backendEnv, setBackendEnv] = useState(DEFAULT_BACKEND_VALUES);
  const [frontendEnv, setFrontendEnv] = useState(DEFAULT_FRONTEND_VALUES);
  const [storageDriver, setStorageDriver] = useState('local');
  const [advancedStorageValues, setAdvancedStorageValues] = useState({});
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [isCustomTaskSelection, setIsCustomTaskSelection] = useState(false);
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    state: setupState,
    tasks: taskCatalog,
    presets,
    defaults,
    loading,
    error: streamError,
    connectionState,
    history
  } = useSetupProgress();

  const orderedTaskIds = useMemo(() => taskCatalog.map((task) => task.id), [taskCatalog]);

  const presetsById = useMemo(() => {
    const map = new Map();
    presets.forEach((preset) => {
      map.set(preset.id, preset);
    });
    return map;
  }, [presets]);

  const recentRuns = useMemo(() => (Array.isArray(history) ? history.slice(0, 5) : []), [history]);

  const presetInitialisedRef = useRef(false);

  const applyPreset = useCallback(
    (presetId) => {
      const preset = presetsById.get(presetId);
      if (!preset) {
        return;
      }
      setSelectedPreset(presetId);
      setSelectedTasks(new Set(preset.tasks));
      setIsCustomTaskSelection(false);
    },
    [presetsById]
  );

  useEffect(() => {
    if (presetInitialisedRef.current) {
      return;
    }
    if (!presets.length) {
      return;
    }
    const defaultPresetId = defaults?.preset ?? presets[0]?.id;
    if (!defaultPresetId) {
      return;
    }
    applyPreset(defaultPresetId);
    presetInitialisedRef.current = true;
  }, [applyPreset, defaults, presets]);

  useEffect(() => {
    if (!setupState?.activePreset) {
      return;
    }
    applyPreset(setupState.activePreset);
  }, [applyPreset, setupState?.activePreset]);

  const handleBackendChange = useCallback((key, value) => {
    setBackendEnv((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFrontendChange = useCallback((key, value) => {
    setFrontendEnv((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleStorageChange = useCallback((key, value) => {
    setAdvancedStorageValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePresetSelect = useCallback(
    (presetId) => {
      applyPreset(presetId);
    },
    [applyPreset]
  );

  const toggleTask = useCallback((taskId) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
    setIsCustomTaskSelection(true);
  }, []);

  const isEnvironmentTaskSelected = useMemo(() => selectedTasks.has('environment'), [selectedTasks]);

  const buildPayload = useCallback(() => {
    const backend = { ...backendEnv, ASSET_STORAGE_DRIVER: storageDriver };

    if (storageDriver === 'local') {
      LOCAL_STORAGE_FIELDS.forEach((field) => {
        backend[field.key] = advancedStorageValues[field.key] ?? field.placeholder ?? '';
      });
    } else if (storageDriver === 'r2') {
      R2_STORAGE_FIELDS.forEach((field) => {
        backend[field.key] = advancedStorageValues[field.key] ?? '';
      });
    }

    backend.CONTENT_MAX_UPLOAD_MB = advancedStorageValues.CONTENT_MAX_UPLOAD_MB ?? '200';
    backend.ASSET_PRESIGN_TTL_MINUTES = advancedStorageValues.ASSET_PRESIGN_TTL_MINUTES ?? '30';
    backend.ASSET_DOWNLOAD_TTL_MINUTES = advancedStorageValues.ASSET_DOWNLOAD_TTL_MINUTES ?? '30';

    const frontend = { ...frontendEnv };

    return { backend, frontend };
  }, [advancedStorageValues, backendEnv, frontendEnv, storageDriver]);

  const runningTaskCount = useMemo(() => setupState?.tasks?.filter((task) => task.status === 'running').length ?? 0, [
    setupState
  ]);

  const activePresetLabel = useMemo(() => {
    if (!setupState?.activePreset) {
      return null;
    }
    const preset = presetsById.get(setupState.activePreset);
    return preset?.label ?? setupState.activePreset;
  }, [presetsById, setupState?.activePreset]);

  const lastPresetLabel = useMemo(() => {
    if (!setupState?.lastPreset) {
      return null;
    }
    const preset = presetsById.get(setupState.lastPreset);
    return preset?.label ?? setupState.lastPreset;
  }, [presetsById, setupState?.lastPreset]);

  const selectedPresetDescription = useMemo(() => {
    if (!selectedPreset) {
      return null;
    }
    return presetsById.get(selectedPreset)?.description ?? null;
  }, [presetsById, selectedPreset]);

  const lastError = setupState?.lastError ?? null;
  const lastHeartbeat = formatDate(setupState?.heartbeatAt);
  const connectionLabel = connectionState === 'streaming' ? 'Live updates' : connectionState === 'polling' ? 'Polling fallback' : connectionState === 'error' ? 'Connection lost' : 'Idle';
  const isRunning = setupState?.status === 'running';
  const connectionBadgeClass = useMemo(() => {
    if (connectionState === 'streaming') {
      return 'border-emerald-300 bg-emerald-50 text-emerald-700';
    }
    if (connectionState === 'polling') {
      return 'border-amber-300 bg-amber-50 text-amber-700';
    }
    if (connectionState === 'error') {
      return 'border-rose-300 bg-rose-50 text-rose-700';
    }
    return 'border-slate-200 bg-slate-50 text-slate-600';
  }, [connectionState]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!selectedTasks.size) {
        setFormError('Select at least one setup task to run.');
        return;
      }
      if (selectedTasks.has('environment') && !backendEnv.APP_URL) {
        setFormError('APP_URL is required when writing environment files.');
        return;
      }

      try {
        setIsSubmitting(true);
        setFormError(null);
        const taskOrder = orderedTaskIds.length ? orderedTaskIds : Array.from(selectedTasks);
        const tasks = Array.from(selectedTasks).sort((a, b) => {
          const positionA = taskOrder.indexOf(a);
          const positionB = taskOrder.indexOf(b);
          if (positionA === -1 && positionB === -1) return 0;
          if (positionA === -1) return 1;
          if (positionB === -1) return -1;
          return positionA - positionB;
        });

        const payload = { tasks, envConfig: buildPayload(), preset: selectedPreset };
        await startSetupRun(payload);
      } catch (err) {
        console.error('Failed to start setup run', err);
        setFormError(err.message ?? 'Failed to start setup run');
      } finally {
        setIsSubmitting(false);
      }
    },
    [buildPayload, backendEnv.APP_URL, orderedTaskIds, selectedPreset, selectedTasks]
  );

  const storageFields = storageDriver === 'r2' ? R2_STORAGE_FIELDS : LOCAL_STORAGE_FIELDS;

  return (
    <div className="bg-slate-50/60 py-16">
      <div className="mx-auto max-w-6xl px-6">
        <header className="mb-10">
          <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
            <WrenchScrewdriverIcon className="h-5 w-5" />
            Guided installation
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-slate-900">Install the Edulure platform</h1>
          <p className="mt-3 max-w-3xl text-base text-slate-600">
            Configure environment secrets, provision databases, initialise Meilisearch, and warm background services without
            leaving your browser. The installer writes local <code>.env.local</code> files and verifies each component.
          </p>
        </header>

        {streamError ? (
          <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">Realtime updates paused</p>
            <p className="mt-1 text-xs">
              {streamError}. The installer is running in polling mode until the connection is restored.
            </p>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <section className="rounded-3xl bg-white p-8 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Environment configuration</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provide the key settings for your backend and frontend apps. You can customise values before generating
                    <code>.env.local</code> files.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Storage driver
                  <select
                    className="rounded-full border-none bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm focus:outline-none"
                    value={storageDriver}
                    onChange={(event) => setStorageDriver(event.target.value)}
                  >
                    {STORAGE_DRIVERS.map((driver) => (
                      <option key={driver.value} value={driver.value}>
                        {driver.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!isEnvironmentTaskSelected ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Environment writing is currently disabled for this run, but your values will be ready when you toggle the task
                  back on.
                </div>
              ) : null}

              <div className="mt-6 grid gap-6">
                {BACKEND_FIELD_GROUPS.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-slate-100 p-6">
                    <h3 className="text-lg font-semibold text-slate-800">{group.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {group.fields.map((field) => (
                        <label key={field.key} className="flex flex-col text-sm font-medium text-slate-700">
                          {field.label}
                          <input
                            type="text"
                            value={backendEnv[field.key] ?? ''}
                            onChange={(event) => handleBackendChange(field.key, event.target.value)}
                            placeholder={field.placeholder}
                            className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-semibold text-slate-800">Storage configuration</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {storageDriver === 'local'
                      ? 'Files are stored locally on disk. Configure the directory and optional public URL for development.'
                      : 'Provide your Cloudflare R2 credentials and bucket names to enable direct uploads and asset serving.'}
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {storageFields.map((field) => (
                      <label key={field.key} className="flex flex-col text-sm font-medium text-slate-700">
                        {field.label}
                        <input
                          type="text"
                          value={advancedStorageValues[field.key] ?? ''}
                          onChange={(event) => handleStorageChange(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </label>
                    ))}
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      Max upload size (MB)
                      <input
                        type="number"
                        min="1"
                        value={advancedStorageValues.CONTENT_MAX_UPLOAD_MB ?? '200'}
                        onChange={(event) => handleStorageChange('CONTENT_MAX_UPLOAD_MB', event.target.value)}
                        className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      Upload URL expiry (minutes)
                      <input
                        type="number"
                        min="1"
                        value={advancedStorageValues.ASSET_PRESIGN_TTL_MINUTES ?? '30'}
                        onChange={(event) => handleStorageChange('ASSET_PRESIGN_TTL_MINUTES', event.target.value)}
                        className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                    <label className="flex flex-col text-sm font-medium text-slate-700">
                      Download URL expiry (minutes)
                      <input
                        type="number"
                        min="1"
                        value={advancedStorageValues.ASSET_DOWNLOAD_TTL_MINUTES ?? '30'}
                        onChange={(event) => handleStorageChange('ASSET_DOWNLOAD_TTL_MINUTES', event.target.value)}
                        className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 p-6">
                  <h3 className="text-lg font-semibold text-slate-800">Frontend overrides</h3>
                  <p className="mt-1 text-sm text-slate-500">Values are written to <code>frontend-reactjs/.env.local</code>.</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {FRONTEND_FIELDS.map((field) => (
                      <label key={field.key} className="flex flex-col text-sm font-medium text-slate-700">
                        {field.label}
                        <input
                          type="text"
                          value={frontendEnv[field.key] ?? ''}
                          onChange={(event) => handleFrontendChange(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          className="mt-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-normal text-slate-800 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-white p-8 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">Setup tasks</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose the tasks to execute. The installer will run them sequentially and stream logs below.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePresetSelect(preset.id)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-primary/60 hover:text-primary'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
                {isCustomTaskSelection ? (
                  <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Custom selection
                  </span>
                ) : null}
              </div>
              {selectedPresetDescription ? (
                <p className="mt-2 text-xs text-slate-500">{selectedPresetDescription}</p>
              ) : null}
              <div className="mt-4 grid gap-3">
                {taskCatalog.map((task) => {
                  const isSelected = selectedTasks.has(task.id);
                  return (
                    <label
                      key={task.id}
                      className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50/80'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{task.label}</p>
                        <p className="text-xs text-slate-500">Task ID: {task.id}</p>
                      </div>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary"
                        checked={isSelected}
                        onChange={() => toggleTask(task.id)}
                      />
                    </label>
                  );
                })}
              </div>
              {selectedTasks.size === 0 ? (
                <p className="mt-3 text-sm font-medium text-rose-600">Select at least one task to run the installer.</p>
              ) : null}
            </section>

            <div className="flex items-center justify-between gap-4">
              {formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : <span />}
              <button
                type="submit"
                disabled={isSubmitting || (isRunning && runningTaskCount > 0)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting || isRunning ? (
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                ) : (
                  <PlayIcon className="h-5 w-5" />
                )}
                {isRunning ? 'Running installer…' : 'Run installer'}
              </button>
            </div>
          </form>

          <aside className="flex flex-col gap-6">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Run status</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {loading
                      ? 'Loading current status…'
                      : setupState
                        ? `Current run: ${setupState.status ?? 'unknown'}`
                        : 'No runs executed yet.'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${connectionBadgeClass}`}
                >
                  {connectionLabel}
                </span>
              </div>
              {setupState ? (
                <>
                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    <div className="flex justify-between">
                      <dt>Run ID</dt>
                      <dd className="font-mono text-xs">{setupState.id ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Started</dt>
                      <dd>{formatDate(setupState.startedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Completed</dt>
                      <dd>{formatDate(setupState.completedAt)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Status</dt>
                      <dd className="capitalize">{setupState.status ?? 'unknown'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Heartbeat</dt>
                      <dd>{lastHeartbeat}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Preset</dt>
                      <dd>{activePresetLabel ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt>Last preset</dt>
                      <dd>{lastPresetLabel ?? '—'}</dd>
                    </div>
                  </dl>
                  {setupState.lastPreset ? (
                    <button
                      type="button"
                      onClick={() => handlePresetSelect(setupState.lastPreset)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Load {lastPresetLabel ?? setupState.lastPreset} preset
                    </button>
                  ) : null}
                  {lastError ? (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
                      <p className="font-semibold">Last failure</p>
                      <dl className="mt-2 space-y-1">
                        <div className="flex justify-between gap-3">
                          <dt>Task</dt>
                          <dd className="font-mono text-[11px] text-rose-800">{lastError.taskId ?? '—'}</dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Command</dt>
                          <dd className="truncate text-rose-800" title={lastError.command ?? ''}>
                            {lastError.command ?? '—'}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt>Exit code</dt>
                          <dd>{lastError.exitCode ?? '—'}</dd>
                        </div>
                      </dl>
                      <p className="mt-2 text-[11px]">{lastError.message ?? '—'}</p>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Recent runs</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    History for the five latest installer executions.
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {recentRuns.length ? `${recentRuns.length} shown` : 'No runs'}
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {recentRuns.length === 0 ? (
                  <li className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    Runs will appear here once the installer has executed.
                  </li>
                ) : (
                  recentRuns.map((run) => {
                    const presetLabel = presetsById.get(run.presetId)?.label ?? run.presetId ?? 'Custom selection';
                    const statusClass = resolveRunStatusClass(run.status);
                    const taskCount = Array.isArray(run.metadata?.taskOrder) ? run.metadata.taskOrder.length : '—';
                    const statusLabel = run.status ? run.status.charAt(0).toUpperCase() + run.status.slice(1) : 'Unknown';
                    return (
                      <li key={run.publicId} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{presetLabel}</p>
                            <p className="mt-1 font-mono text-[11px] text-slate-500">{run.publicId}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
                          <div className="space-y-1">
                            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Started</dt>
                            <dd className="text-slate-700">{formatFullDate(run.startedAt)}</dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Completed</dt>
                            <dd className="text-slate-700">{formatFullDate(run.completedAt)}</dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Duration</dt>
                            <dd className="text-slate-700">{formatDuration(run.startedAt, run.completedAt)}</dd>
                          </div>
                          <div className="space-y-1">
                            <dt className="text-[11px] uppercase tracking-wide text-slate-400">Tasks</dt>
                            <dd className="text-slate-700">{taskCount}</dd>
                          </div>
                        </dl>
                        {run.lastError?.message ? (
                          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                            {run.lastError.message}
                          </p>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Task logs</h2>
              <div className="mt-4 space-y-4">
                {(setupState?.tasks ?? taskCatalog).map((task) => {
                  const status = task.status ?? 'pending';
                  const statusClass = TASK_STATUS_CLASS[status] ?? TASK_STATUS_CLASS.pending;
                  return (
                    <div key={task.id} className={`rounded-2xl border px-4 py-3 ${statusClass}`}>
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{task.label ?? task.id}</span>
                        <span className="capitalize">{status}</span>
                      </div>
                      {task.error ? (
                        <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                          <p className="font-semibold">Error</p>
                          <p className="mt-1">{task.error.message ?? 'Task failed'}</p>
                          <dl className="mt-2 space-y-1">
                            <div className="flex justify-between gap-3">
                              <dt>Command</dt>
                              <dd className="truncate text-rose-800" title={task.error.command ?? ''}>
                                {task.error.command ?? '—'}
                              </dd>
                            </div>
                            <div className="flex justify-between gap-3">
                              <dt>Exit code</dt>
                              <dd>{task.error.exitCode ?? '—'}</dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}
                      <details className="mt-3 rounded-xl bg-white/70 p-3 text-xs text-slate-600">
                        <summary className="cursor-pointer font-medium text-slate-700">View logs</summary>
                        <div className="mt-2 space-y-2">
                          {task.logs?.length ? (
                            task.logs.map((entry, index) => (
                              <pre
                                key={`${task.id}-log-${index}`}
                                className="overflow-x-auto rounded-lg bg-slate-900/80 p-3 font-mono text-[11px] text-slate-100"
                              >
                                {entry}
                              </pre>
                            ))
                          ) : (
                            <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-500">No log output yet.</p>
                          )}
                        </div>
                      </details>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl bg-slate-900 p-6 text-slate-100 shadow-lg">
              <h2 className="text-lg font-semibold">Tips for a smooth install</h2>
              <ul className="mt-3 space-y-3 text-sm leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-1 h-5 w-5 text-emerald-400" />
                  Ensure MySQL, Redis, and Meilisearch are running locally or reachable from this machine before launching the
                  installer.
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="mt-1 h-5 w-5 text-emerald-400" />
                  When using R2 storage, generate access keys with write permissions for public, private, uploads, and quarantine
                  buckets.
                </li>
                <li className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-1 h-5 w-5 text-amber-400" />
                  The installer writes local <code>.env.local</code> files; commit secrets to a secure vault rather than source
                  control.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
