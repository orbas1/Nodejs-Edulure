import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import { createCommunityPost } from '../api/communityApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_BODY_LENGTH = 10;
const MAX_BODY_LENGTH = 8000;
const ALLOWED_MEMBER_ROLES = ['owner', 'admin', 'moderator', 'author', 'instructor', 'creator'];

function normaliseTags(input) {
  if (!input) return [];
  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
    .slice(0, 12);
}

export default function FeedComposer({ communities, defaultCommunityId, disabled = false, onPostCreated }) {
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
  const canCompose = Boolean(token) && composerCommunities.length > 0 && !disabled;
  const trimmedBody = body.trim();
  const isValid = trimmedBody.length >= MIN_BODY_LENGTH && selectedCommunityId;

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
    setVisibility('members');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canCompose || !isValid) return;

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      title: title.trim() ? title.trim() : null,
      body: trimmedBody,
      tags: normaliseTags(tagsInput),
      visibility,
      postType: 'update'
    };

    try {
      const selectedCommunity = composerCommunities.find(
        (community) => String(community.id) === String(selectedCommunityId)
      );

      const response = await createCommunityPost({
        communityId: selectedCommunity?.id ?? selectedCommunityId,
        token,
        payload
      });

      const createdPost = response?.data ?? null;
      setSuccessMessage('Update shared with your community.');
      resetForm();
      setIsExpanded(false);
      if (typeof onPostCreated === 'function' && createdPost) {
        onPostCreated(createdPost);
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message ?? err?.message;
      setError(apiMessage ?? 'Unable to publish your update right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCompose) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
        {disabled
          ? 'Feed composer is currently disabled for maintenance.'
          : 'Join a community with posting permissions to share updates.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${userName}'s avatar`}
              className="h-10 w-10 rounded-full border border-white object-cover shadow-sm"
            />
          ) : (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold uppercase text-primary" aria-hidden="true">
              {userInitials}
            </span>
          )}
          <div className="flex-1">
            {!isExpanded ? (
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-500 transition hover:border-primary hover:text-primary"
                onClick={() => setIsExpanded(true)}
              >
                Share something with your communities…
              </button>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Post to
                  <select
                    value={selectedCommunityId}
                    onChange={(event) => setSelectedCommunityId(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {composerCommunities.map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Visibility
                  <select
                    value={visibility}
                    onChange={(event) => setVisibility(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="admins">Admins</option>
                  </select>
                </label>
              </div>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Title (optional)
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  placeholder="Launch retrospective, new playbook drop…"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                What would you like to share?
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  minLength={MIN_BODY_LENGTH}
                  maxLength={MAX_BODY_LENGTH}
                  required
                  rows={5}
                  className="mt-1 w-full rounded-3xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Celebrate a win, share an automation recipe, or ask for support."
                />
                <span className="mt-1 block text-right text-[11px] font-medium text-slate-400">
                  {trimmedBody.length} / {MAX_BODY_LENGTH} characters
                </span>
              </label>

              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tags (comma separated)
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="ops, launch, automation"
                  className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status" aria-live="polite">
                  {successMessage}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-500">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Live session</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Upload lesson</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Poll members</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsExpanded(false);
                      resetForm();
                    }}
                    className="inline-flex items-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-slate-300"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!isValid || isSubmitting}
                    className="inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Publishing…' : 'Publish update'}
                  </button>
                </div>
              </div>
              </form>
            )}
          </div>
        </div>
      </div>
      {successMessage && !isExpanded && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}
    </div>
  );
}

FeedComposer.propTypes = {
  communities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired
    })
  ),
  defaultCommunityId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disabled: PropTypes.bool,
  onPostCreated: PropTypes.func
};
