import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import {
  fetchAdminProfileSettings,
  updateAdminProfileSettings
} from '../../../api/adminSettingsApi.js';
import { cloneDeep, isDeepEqual } from '../utils.js';

function createId(prefix) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const emptySettings = Object.freeze({
  organisation: {},
  leadership: [],
  supportChannels: [],
  runbooks: [],
  media: [],
  onCall: {}
});

function normalizeSettings(settings) {
  if (!settings) {
    return { ...emptySettings };
  }
  return {
    organisation: { ...settings.organisation },
    leadership: Array.isArray(settings.leadership) ? [...settings.leadership] : [],
    supportChannels: Array.isArray(settings.supportChannels) ? [...settings.supportChannels] : [],
    runbooks: Array.isArray(settings.runbooks) ? [...settings.runbooks] : [],
    media: Array.isArray(settings.media) ? [...settings.media] : [],
    onCall: { ...settings.onCall }
  };
}

export default function AdminProfileSettingsSection({ sectionId, token, settings, onSettingsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(() => normalizeSettings(settings));
  const [baseline, setBaseline] = useState(() => cloneDeep(normalizeSettings(settings)));
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const hasChanges = useMemo(() => !isDeepEqual(formState, baseline), [formState, baseline]);
  const organisation = useMemo(() => formState.organisation ?? {}, [formState.organisation]);
  const onCall = useMemo(() => formState.onCall ?? {}, [formState.onCall]);

  const applySettings = useCallback((payload) => {
    const next = normalizeSettings(payload);
    setFormState(next);
    setBaseline(cloneDeep(next));
  }, []);

  useEffect(() => {
    if (!token) return;
    if (settings) {
      applySettings(settings);
      return;
    }

    let active = true;
    setLoading(true);
    fetchAdminProfileSettings({ token })
      .then((payload) => {
        if (!active) return;
        applySettings(payload);
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error?.message ?? 'Failed to load profile settings');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token, settings, applySettings]);

  const handleOrganisationChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      organisation: {
        ...prev.organisation,
        [field]: value
      }
    }));
  };

  const handleOnCallChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      onCall: {
        ...prev.onCall,
        [field]: value
      }
    }));
  };

  const updateCollection = (key, updater) => {
    setFormState((prev) => ({
      ...prev,
      [key]: updater(Array.isArray(prev[key]) ? [...prev[key]] : [])
    }));
  };

  const handleAddLeadership = () => {
    updateCollection('leadership', (items) => [
      ...items,
      {
        id: createId('leader'),
        name: '',
        role: '',
        email: '',
        phone: '',
        avatarUrl: '',
        bio: ''
      }
    ]);
  };

  const handleAddSupportChannel = () => {
    updateCollection('supportChannels', (items) => [
      ...items,
      {
        id: createId('channel'),
        type: 'Email',
        label: '',
        destination: '',
        slaMinutes: 120,
        activeHours: '24/7'
      }
    ]);
  };

  const handleAddRunbook = () => {
    updateCollection('runbooks', (items) => [
      ...items,
      {
        id: createId('runbook'),
        title: '',
        url: '',
        lastReviewed: ''
      }
    ]);
  };

  const handleAddMedia = (type = 'video') => {
    updateCollection('media', (items) => [
      ...items,
      {
        id: createId('media'),
        type,
        title: '',
        url: '',
        thumbnailUrl: ''
      }
    ]);
  };

  const handleCollectionChange = (key, index, field) => (event) => {
    const value = event.target.value;
    updateCollection(key, (items) => {
      if (!items[index]) return items;
      const next = [...items];
      next[index] = {
        ...next[index],
        [field]: field === 'slaMinutes' ? Number(value ?? 0) : value
      };
      return next;
    });
  };

  const handleRemoveCollectionItem = (key, index) => () => {
    updateCollection(key, (items) => items.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleReset = () => {
    if (!baseline) return;
    setFormState(cloneDeep(baseline));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleSave = async () => {
    if (!token) {
      setErrorMessage('Sign in required to update profile settings.');
      return;
    }

    if (!hasChanges) {
      setSuccessMessage('No changes detected.');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const payload = {
      organisation: {
        name: organisation.name ?? '',
        mission: organisation.mission ?? '',
        tagline: organisation.tagline ?? '',
        headquarters: organisation.headquarters ?? '',
        established: organisation.established ?? '',
        statement: organisation.statement ?? '',
        heroVideoUrl: organisation.heroVideoUrl ?? '',
        heroPosterUrl: organisation.heroPosterUrl ?? ''
      },
      leadership: formState.leadership.map((leader) => ({
        id: leader.id,
        name: leader.name,
        role: leader.role,
        email: leader.email,
        phone: leader.phone,
        avatarUrl: leader.avatarUrl,
        bio: leader.bio
      })),
      supportChannels: formState.supportChannels.map((channel) => ({
        id: channel.id,
        type: channel.type,
        label: channel.label,
        destination: channel.destination,
        slaMinutes: Number(channel.slaMinutes ?? 0),
        activeHours: channel.activeHours
      })),
      runbooks: formState.runbooks.map((runbook) => ({
        id: runbook.id,
        title: runbook.title,
        url: runbook.url,
        lastReviewed: runbook.lastReviewed
      })),
      media: formState.media.map((asset) => ({
        id: asset.id,
        type: asset.type,
        title: asset.title,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl
      })),
      onCall: {
        rotation: onCall.rotation ?? '',
        timezone: onCall.timezone ?? '',
        currentPrimary: onCall.currentPrimary ?? '',
        backup: onCall.backup ?? '',
        escalationChannel: onCall.escalationChannel ?? ''
      }
    };

    try {
      const updated = await updateAdminProfileSettings({ token, payload });
      applySettings(updated);
      setSuccessMessage('Admin profile settings updated successfully.');
      if (onSettingsUpdated) {
        onSettingsUpdated(updated);
      }
    } catch (error) {
      setErrorMessage(error?.message ?? 'Unable to update admin profile settings.');
    } finally {
      setSaving(false);
    }
  };

  const heroMedia = organisation.heroVideoUrl || formState.media.find((asset) => asset.type === 'video')?.url || '';

  return (
    <section id={sectionId} className="dashboard-section">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Admin profile settings</h3>
          <p className="mt-1 text-sm text-slate-600">
            Curate executive context, leadership contacts, and escalation material for the operations console.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {loading ? 'Loading…' : hasChanges ? 'Unsaved changes' : 'All changes saved'}
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || saving || loading}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving || loading}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : hasChanges ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-primary" aria-hidden="true" />
          <span>Loading latest profile settings…</span>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}
      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">Organisation overview</h4>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              <span className="text-slate-600">Name</span>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={organisation.name ?? ''}
                onChange={handleOrganisationChange('name')}
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Mission statement</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                rows={3}
                value={organisation.mission ?? ''}
                onChange={handleOrganisationChange('mission')}
              />
            </label>
            <label className="block">
              <span className="text-slate-600">Executive tagline</span>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={organisation.tagline ?? ''}
                onChange={handleOrganisationChange('tagline')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Headquarters</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={organisation.headquarters ?? ''}
                  onChange={handleOrganisationChange('headquarters')}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Established</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={organisation.established ?? ''}
                  onChange={handleOrganisationChange('established')}
                />
              </label>
            </div>
            <label className="block">
              <span className="text-slate-600">Narrative</span>
              <textarea
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                rows={4}
                value={organisation.statement ?? ''}
                onChange={handleOrganisationChange('statement')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Hero video URL</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={organisation.heroVideoUrl ?? ''}
                  onChange={handleOrganisationChange('heroVideoUrl')}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Hero poster image</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={organisation.heroPosterUrl ?? ''}
                  onChange={handleOrganisationChange('heroPosterUrl')}
                />
              </label>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-base font-semibold text-slate-900">On-call rotation</h4>
          <div className="mt-4 grid gap-4 text-sm">
            <label className="block">
              <span className="text-slate-600">Rotation cadence</span>
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={onCall.rotation ?? ''}
                onChange={handleOnCallChange('rotation')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Timezone</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={onCall.timezone ?? ''}
                  onChange={handleOnCallChange('timezone')}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Escalation channel</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={onCall.escalationChannel ?? ''}
                  onChange={handleOnCallChange('escalationChannel')}
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-600">Primary on-call</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={onCall.currentPrimary ?? ''}
                  onChange={handleOnCallChange('currentPrimary')}
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-600">Backup</span>
                <input
                  type="text"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  value={onCall.backup ?? ''}
                  onChange={handleOnCallChange('backup')}
                />
              </label>
            </div>
            {heroMedia ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <video
                  src={heroMedia}
                  poster={organisation.heroPosterUrl || formState.media.find((asset) => asset.thumbnailUrl)?.thumbnailUrl}
                  controls
                  className="h-48 w-full object-cover"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                Provide a hero video link or upload media assets to power onboarding tours.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-semibold text-slate-900">Leadership directory</h4>
          <button
            type="button"
            onClick={handleAddLeadership}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
          >
            Add leader
          </button>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {formState.leadership.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No leadership contacts configured yet.
            </p>
          ) : (
            formState.leadership.map((leader, index) => (
              <div key={leader.id ?? index} className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Profile #{index + 1}</p>
                  <button
                    type="button"
                    onClick={handleRemoveCollectionItem('leadership', index)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                  >
                    Remove
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={leader.name ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'name')}
                />
                <input
                  type="text"
                  placeholder="Role"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={leader.role ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'role')}
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={leader.email ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'email')}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={leader.phone ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'phone')}
                />
                <input
                  type="url"
                  placeholder="Avatar URL"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={leader.avatarUrl ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'avatarUrl')}
                />
                <textarea
                  placeholder="Short bio"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={2}
                  value={leader.bio ?? ''}
                  onChange={handleCollectionChange('leadership', index, 'bio')}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Support channels</h4>
            <button
              type="button"
              onClick={handleAddSupportChannel}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
            >
              Add channel
            </button>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {formState.supportChannels.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Provide at least one escalation or support channel.
              </p>
            ) : (
              formState.supportChannels.map((channel, index) => (
                <div key={channel.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Channel #{index + 1}</span>
                    <button
                      type="button"
                      onClick={handleRemoveCollectionItem('supportChannels', index)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Type"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={channel.type ?? ''}
                      onChange={handleCollectionChange('supportChannels', index, 'type')}
                    />
                    <input
                      type="text"
                      placeholder="Label"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={channel.label ?? ''}
                      onChange={handleCollectionChange('supportChannels', index, 'label')}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Destination"
                    className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                    value={channel.destination ?? ''}
                    onChange={handleCollectionChange('supportChannels', index, 'destination')}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col text-xs text-slate-500">
                      SLA minutes
                      <input
                        type="number"
                        className="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={channel.slaMinutes ?? 0}
                        min={0}
                        onChange={handleCollectionChange('supportChannels', index, 'slaMinutes')}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Active hours"
                      className="rounded-xl border border-slate-200 px-3 py-2"
                      value={channel.activeHours ?? ''}
                      onChange={handleCollectionChange('supportChannels', index, 'activeHours')}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-slate-900">Runbooks & media</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddRunbook}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
              >
                Add runbook
              </button>
              <button
                type="button"
                onClick={() => handleAddMedia('video')}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-primary/40 hover:text-primary"
              >
                Add media
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="space-y-3 text-sm">
              {formState.runbooks.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No runbooks published yet.
                </p>
              ) : (
                formState.runbooks.map((runbook, index) => (
                  <div key={runbook.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">Runbook #{index + 1}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCollectionItem('runbooks', index)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Title"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={runbook.title ?? ''}
                      onChange={handleCollectionChange('runbooks', index, 'title')}
                    />
                    <input
                      type="url"
                      placeholder="Runbook URL"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={runbook.url ?? ''}
                      onChange={handleCollectionChange('runbooks', index, 'url')}
                    />
                    <input
                      type="text"
                      placeholder="Last reviewed"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={runbook.lastReviewed ?? ''}
                      onChange={handleCollectionChange('runbooks', index, 'lastReviewed')}
                    />
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3 text-sm">
              {formState.media.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Add media assets to share video tours, executive briefings, or policy walkthroughs.
                </p>
              ) : (
                formState.media.map((asset, index) => (
                  <div key={asset.id ?? index} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">Media asset #{index + 1}</span>
                      <button
                        type="button"
                        onClick={handleRemoveCollectionItem('media', index)}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <select
                        className="rounded-xl border border-slate-200 px-3 py-2"
                        value={asset.type ?? 'image'}
                        onChange={handleCollectionChange('media', index, 'type')}
                      >
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Title"
                        className="rounded-xl border border-slate-200 px-3 py-2"
                        value={asset.title ?? ''}
                        onChange={handleCollectionChange('media', index, 'title')}
                      />
                    </div>
                    <input
                      type="url"
                      placeholder="Asset URL"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={asset.url ?? ''}
                      onChange={handleCollectionChange('media', index, 'url')}
                    />
                    <input
                      type="url"
                      placeholder="Thumbnail URL"
                      className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
                      value={asset.thumbnailUrl ?? ''}
                      onChange={handleCollectionChange('media', index, 'thumbnailUrl')}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

AdminProfileSettingsSection.propTypes = {
  sectionId: PropTypes.string,
  token: PropTypes.string,
  settings: PropTypes.shape({
    organisation: PropTypes.object,
    leadership: PropTypes.array,
    supportChannels: PropTypes.array,
    runbooks: PropTypes.array,
    media: PropTypes.array,
    onCall: PropTypes.object
  }),
  onSettingsUpdated: PropTypes.func
};

AdminProfileSettingsSection.defaultProps = {
  sectionId: 'profile-settings',
  token: null,
  settings: null,
  onSettingsUpdated: undefined
};
