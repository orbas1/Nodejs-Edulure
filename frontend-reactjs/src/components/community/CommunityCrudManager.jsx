import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { BuildingLibraryIcon } from '@heroicons/react/24/outline';

import adminControlApi from '../../api/adminControlApi.js';
import FormStepper from '../forms/FormStepper.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const FORM_STEPS = [
  { id: 'identity', title: 'Identity', description: 'Name, slug and cover art' },
  { id: 'governance', title: 'Governance', description: 'Visibility and ownership' },
  { id: 'metadata', title: 'Metadata', description: 'Extended configuration JSON' }
];

function createEmptyForm() {
  return {
    name: '',
    slug: '',
    description: '',
    coverImageUrl: '',
    visibility: 'public',
    ownerId: '',
    metadata: ''
  };
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function CommunityForm({ form, onChange, onSubmit, onCancel, submitting, mode, currentStep, setCurrentStep }) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange({
      ...form,
      [name]: value
    });
  };

  const disabled = submitting;

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <FormStepper steps={FORM_STEPS} currentStep={currentStep} onSelect={setCurrentStep} />
      {currentStep === 'identity' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Name</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Slug</span>
            <input
              type="text"
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="community-slug"
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
          <label className="md:col-span-2 space-y-2">
            <span className="text-sm font-semibold text-slate-700">Cover image URL</span>
            <input
              type="url"
              name="coverImageUrl"
              value={form.coverImageUrl}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'governance' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Visibility</span>
            <select
              name="visibility"
              value={form.visibility}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Owner ID</span>
            <input
              type="number"
              name="ownerId"
              value={form.ownerId}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      {currentStep === 'metadata' ? (
        <div>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-700">Metadata (JSON)</span>
            <textarea
              name="metadata"
              value={form.metadata}
              onChange={handleChange}
              rows={4}
              placeholder='{"mission": "Enablement guild"}'
              className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              disabled={disabled}
            />
          </label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-primary-dark disabled:opacity-50"
          disabled={disabled}
        >
          {mode === 'edit' ? 'Update community' : 'Create community'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          disabled={disabled}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

CommunityForm.propTypes = {
  form: PropTypes.shape({
    name: PropTypes.string,
    slug: PropTypes.string,
    description: PropTypes.string,
    coverImageUrl: PropTypes.string,
    visibility: PropTypes.string,
    ownerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    metadata: PropTypes.string
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  submitting: PropTypes.bool.isRequired,
  mode: PropTypes.oneOf(['create', 'edit']).isRequired,
  currentStep: PropTypes.string.isRequired,
  setCurrentStep: PropTypes.func.isRequired
};

export default function CommunityCrudManager() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const role = String(session?.user?.role ?? '').toLowerCase();
  const isAdmin = ['admin', 'superadmin', 'super-admin'].includes(role);
  const permissions = Array.isArray(session?.user?.permissions) ? session.user.permissions : [];
  const canManageCommunities = useMemo(
    () =>
      isAdmin ||
      permissions.some((permission) => {
        if (!permission) return false;
        const normalised = String(permission).toLowerCase();
        return (
          normalised === 'communities:manage' ||
          normalised === 'admin:communities' ||
          normalised === 'admin:*' ||
          normalised === 'platform:superadmin'
        );
      }),
    [isAdmin, permissions]
  );

  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [form, setForm] = useState(() => createEmptyForm());
  const [mode, setMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [currentStep, setCurrentStep] = useState('identity');
  const [submitting, setSubmitting] = useState(false);

  const loadCommunities = useCallback(async () => {
    if (!canManageCommunities || !token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await adminControlApi.listCommunities({ token, params: { perPage: 50 } });
      setCommunities(response?.data ?? []);
    } catch (err) {
      setError(err.message ?? 'Unable to load communities');
    } finally {
      setLoading(false);
    }
  }, [canManageCommunities, token]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const resetForm = useCallback(() => {
    setForm(createEmptyForm());
    setMode('create');
    setEditingId(null);
    setCurrentStep('identity');
  }, []);

  const handleEdit = (community) => {
    setMode('edit');
    setEditingId(community.id);
    setCurrentStep('identity');
    setForm({
      name: community.name ?? '',
      slug: community.slug ?? '',
      description: community.description ?? '',
      coverImageUrl: community.coverImageUrl ?? '',
      visibility: community.visibility ?? 'public',
      ownerId: community.ownerId ?? '',
      metadata: community.metadata ? JSON.stringify(community.metadata, null, 2) : ''
    });
  };

  const handleDelete = async (communityId) => {
    if (!canManageCommunities || !token) return;
    if (!window.confirm('Delete this community?')) return;
    try {
      await adminControlApi.deleteCommunity({ token, id: communityId });
      setSuccessMessage('Community removed');
      await loadCommunities();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to delete community');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManageCommunities || !token) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        visibility: form.visibility,
        ownerId: Number(form.ownerId),
        metadata: parseMetadata(form.metadata)
      };

      if (mode === 'edit' && editingId) {
        await adminControlApi.updateCommunity({ token, id: editingId, payload });
        setSuccessMessage('Community updated');
      } else {
        await adminControlApi.createCommunity({ token, payload });
        setSuccessMessage('Community created');
      }
      await loadCommunities();
      resetForm();
    } catch (err) {
      setError(err.message ?? 'Unable to save community');
    } finally {
      setSubmitting(false);
    }
  };

  const content = useMemo(() => {
    if (!canManageCommunities) {
      return (
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Community admin console locked</p>
          <p className="mt-2 text-sm text-slate-600">
            Only authorised operators can create or update communities from the public site. Request elevated permissions or sign
            in with an administrator account to manage communities.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-4xl border border-slate-200 bg-white/90 p-8 shadow-xl">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Community console</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === 'edit' ? 'Update community' : 'Create community'}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Launch, update and retire community workspaces. Every change writes to the production database with audit logging and runtime validation.
            </p>
            {successMessage ? (
              <p className="mt-2 rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600">
                {successMessage}
              </p>
            ) : null}
            {error ? (
              <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <CommunityForm
            form={form}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            submitting={submitting}
            mode={mode}
            currentStep={currentStep}
            setCurrentStep={setCurrentStep}
          />
        </div>
        <div className="mt-10 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Communities</p>
          {loading ? <p className="text-sm text-slate-500">Loading communities…</p> : null}
          {!loading && communities.length === 0 ? (
            <p className="text-sm text-slate-500">No communities created yet.</p>
          ) : null}
          <div className="grid gap-3">
            {communities.map((community) => (
              <div
                key={community.id}
                className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{community.name}</p>
                    <p className="text-xs text-slate-500">Visibility {community.visibility}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(community)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(community.id)}
                      className="inline-flex items-center justify-center rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Owner #{community.ownerId} · Updated {community.updatedAt ? new Date(community.updatedAt).toLocaleString() : 'recently'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }, [
    canManageCommunities,
    mode,
    form,
    submitting,
    currentStep,
    communities,
    loading,
    handleSubmit,
    resetForm,
    successMessage,
    error
  ]);

  return (
    <section className="space-y-6">
        <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BuildingLibraryIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">Community production</p>
          <h2 className="text-2xl font-semibold text-slate-900">Manage communities</h2>
        </div>
      </div>
      {content}
    </section>
  );
}
