import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { createCommunityPost } from '../../api/communityApi.js';
import { useAuth } from '../../context/AuthContext.jsx';

const MIN_BODY_LENGTH = 10;
const MAX_BODY_LENGTH = 8000;
const ALLOWED_MEMBER_ROLES = ['owner', 'admin', 'moderator', 'author', 'instructor', 'creator'];
const DEFAULT_VISIBILITY_OPTIONS = ['members', 'public', 'admins'];
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);

function normaliseTags(input) {
  if (!input) return [];

  const seen = new Set();

  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#+/, ''))
    .filter((tag) => {
      if (!tag) return false;
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((tag) => tag.slice(0, 32))
    .slice(0, 12);
}

export default function Composer({ communities, defaultCommunityId, disabled = false, onPostCreated }) {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken;
  const userName = session?.user?.name ?? session?.user?.email ?? 'You';
  const avatarUrl = session?.user?.avatarUrl ?? null;
  const userInitials = useMemo(() => {
    return userName
      .split(' ')
      .map((chunk) => chunk.slice(0, 1))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [userName]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCommunityId, setSelectedCommunityId] = useState(
    defaultCommunityId ? String(defaultCommunityId) : ''
  );
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState('members');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const composerCommunities = useMemo(() => {
    if (!Array.isArray(communities)) return [];

    return communities
      .filter((community) => {
        const permissions = community?.permissions ?? {};

        const explicitPermission = ['canCreatePosts', 'canCreatePost', 'canPost', 'canPublish'].find(
          (key) => typeof permissions[key] === 'boolean'
        );

        if (explicitPermission) {
          return permissions[explicitPermission];
        }

        if (community.membership?.status && community.membership.status !== 'active') {
          return false;
        }

        if (community.membership?.role) {
          return ALLOWED_MEMBER_ROLES.includes(community.membership.role);
        }

        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [communities]);

  const selectedCommunity = useMemo(() => {
    if (!selectedCommunityId) return undefined;
    return composerCommunities.find((community) => String(community.id) === String(selectedCommunityId));
  }, [composerCommunities, selectedCommunityId]);

  const canCompose = Boolean(token) && composerCommunities.length > 0 && !disabled;
  const trimmedBody = body.trim();

  const visibilityOptions = useMemo(() => {
    const rawOptions = selectedCommunity?.permissions?.visibilityOptions ?? selectedCommunity?.visibilityOptions;

    if (Array.isArray(rawOptions) && rawOptions.length) {
      const seen = new Set();
      return rawOptions
        .map((option) => String(option).trim())
        .filter((option) => {
          if (!option) return false;
          const normalised = option.toLowerCase();
          if (seen.has(normalised)) return false;
          seen.add(normalised);
          return true;
        });
    }

    return DEFAULT_VISIBILITY_OPTIONS;
  }, [selectedCommunity]);

  const normalisedVisibility = visibilityOptions.includes(visibility)
    ? visibility
    : visibilityOptions[0] ?? 'members';
  const defaultVisibilityOption = visibilityOptions[0] ?? 'members';

  const isValid = trimmedBody.length >= MIN_BODY_LENGTH && selectedCommunityId;

  useEffect(() => {
    if (!visibilityOptions.includes(visibility)) {
      setVisibility(defaultVisibilityOption);
    }
  }, [visibilityOptions, visibility, defaultVisibilityOption]);

  useEffect(() => {
    if (defaultCommunityId) {
      setSelectedCommunityId(String(defaultCommunityId));
      return;
    }

    if (!composerCommunities.length) {
      setSelectedCommunityId('');
      return;
    }

    setSelectedCommunityId((prev) => {
      if (prev && composerCommunities.some((community) => String(community.id) === String(prev))) {
        return prev;
      }
      return composerCommunities[0] ? String(composerCommunities[0].id) : '';
    });
  }, [defaultCommunityId, composerCommunities]);

  useEffect(() => {
    if (!isExpanded) {
      setError(null);
      return;
    }

    setSuccessMessage(null);
  }, [isExpanded]);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setTagsInput('');
    setVisibility(defaultVisibilityOption);
    setLinkUrl('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCompose) return;

    const trimmedTitle = title.trim();

    if (!selectedCommunityId) {
      setError('Please choose a community before posting.');
      return;
    }

    if (!selectedCommunity) {
      setError('Selected community is no longer available for posting.');
      return;
    }

    const tags = normaliseTags(tagsInput);

    let attachments;
    if (linkUrl.trim()) {
      try {
        const parsed = new URL(linkUrl.trim());
        if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) {
          throw new Error('Unsupported protocol');
        }
        attachments = [
          {
            type: 'link',
            url: parsed.toString(),
            label: parsed.hostname.replace(/^www\./, '')
          }
        ];
      } catch (linkError) {
        setError('Please provide a valid URL for the shared link.');
        return;
      }
    }

    const payload = {
      title: trimmedTitle || null,
      body: body.trim(),
      tags,
      visibility: normalisedVisibility,
      status: 'published',
      metadata: attachments ? { attachments } : undefined
    };

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await createCommunityPost({
        communityId: selectedCommunityId,
        token,
        payload
      });

      if (response?.data) {
        const communityLabel = selectedCommunity?.name || 'your community';
        setSuccessMessage(`Update shared with ${communityLabel}.`);
        resetForm();
        setIsExpanded(false);
        onPostCreated?.(response.data);
      } else {
        setSuccessMessage(null);
      }
    } catch (submitError) {
      if (submitError?.response?.status === 401 || submitError?.response?.status === 403) {
        setError('You do not have permission to publish in this community.');
      } else {
        setError(submitError?.message ?? 'Unable to publish your update.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCompose) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 text-sm text-slate-500 shadow-sm">
        {disabled
          ? 'Feed composer is currently disabled for maintenance.'
          : 'Join a community with posting permissions to share updates.'}
      </div>
    );
  }

  return (
    <form
      className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm"
      onSubmit={handleSubmit}
      aria-labelledby="feed-composer-heading"
    >
      <div className="flex items-start gap-4">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Your avatar" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
            {userInitials}
          </span>
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="feed-composer-heading" className="text-sm font-semibold text-slate-900">
              Share an update
            </h2>
            {composerCommunities.length > 1 ? (
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary focus:border-primary focus:outline-none"
                value={selectedCommunityId}
                onChange={(event) => setSelectedCommunityId(event.target.value)}
                disabled={!canCompose}
                aria-label="Select community"
              >
                {composerCommunities.map((community) => (
                  <option key={community.id} value={community.id}>
                    {community.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-3 inline-flex w-full items-center justify-between rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-500 transition hover:border-primary hover:bg-primary/5"
            onClick={() => setIsExpanded(true)}
            disabled={!canCompose || isExpanded}
          >
            {isExpanded ? 'Compose your update below.' : 'Start typing to share what your community should know.'}
            <span className="text-xs font-semibold text-primary">Write</span>
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="composer-title" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Headline (optional)
            </label>
            <input
              id="composer-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 200))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
              placeholder="What’s the key takeaway?"
              disabled={!canCompose || isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="composer-body" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Share the update
            </label>
            <textarea
              id="composer-body"
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, MAX_BODY_LENGTH))}
              className="mt-2 h-36 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 focus:border-primary focus:outline-none"
              placeholder="Celebrate a win, share a learning, or highlight a resource."
              disabled={!canCompose || isSubmitting}
              required
            />
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>{trimmedBody.length} / {MAX_BODY_LENGTH} characters</span>
              {trimmedBody.length < MIN_BODY_LENGTH ? (
                <span>Write at least {MIN_BODY_LENGTH} characters</span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="composer-tags" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tags (comma separated)
              </label>
              <input
                id="composer-tags"
                type="text"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                placeholder="#Automation, #Retention, #Launch"
                disabled={!canCompose || isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="composer-link" className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Attach a link (optional)
              </label>
              <input
                id="composer-link"
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none"
                placeholder="https://edulure.test/update"
                disabled={!canCompose || isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">Visibility</span>
              <select
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-primary focus:border-primary focus:outline-none"
                value={normalisedVisibility}
                onChange={(event) => setVisibility(event.target.value)}
                disabled={!canCompose || isSubmitting}
              >
                {visibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={() => {
                  resetForm();
                  setIsExpanded(false);
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full border border-primary bg-primary px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!canCompose || !isValid || isSubmitting}
              >
                {isSubmitting ? 'Publishing…' : 'Publish update'}
              </button>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600" role="alert">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-600" role="status">
              {successMessage}
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

Composer.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string,
      permissions: PropTypes.object,
      membership: PropTypes.shape({
        status: PropTypes.string,
        role: PropTypes.string
      })
    })
  ),
  defaultCommunityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disabled: PropTypes.bool,
  onPostCreated: PropTypes.func
};

Composer.defaultProps = {
  communities: [],
  defaultCommunityId: null,
  disabled: false,
  onPostCreated: null
};
