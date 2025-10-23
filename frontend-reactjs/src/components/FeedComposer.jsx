import { useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';

import { createCommunityPost } from '../api/communityApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const MIN_BODY_LENGTH = 10;
const MAX_BODY_LENGTH = 8000;
const ALLOWED_MEMBER_ROLES = ['owner', 'admin', 'moderator', 'author', 'instructor', 'creator'];
const DEFAULT_VISIBILITY_OPTIONS = ['members', 'public', 'admins'];
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:']);
const MAX_MEDIA_ATTACHMENTS = 4;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

function isAcceptableMediaType(type) {
  if (!type) return false;
  return type.startsWith('image/');
}

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
  const [linkUrl, setLinkUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [mediaDrafts, setMediaDrafts] = useState([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const mediaDraftsRef = useRef([]);

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
    return composerCommunities.find(
      (community) => String(community.id) === String(selectedCommunityId)
    );
  }, [composerCommunities, selectedCommunityId]);
  const canCompose = Boolean(token) && composerCommunities.length > 0 && !disabled;
  const trimmedBody = body.trim();

  const visibilityOptions = useMemo(() => {
    const rawOptions =
      selectedCommunity?.permissions?.visibilityOptions ?? selectedCommunity?.visibilityOptions;

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

  useEffect(() => {
    mediaDraftsRef.current = mediaDrafts;
  }, [mediaDrafts]);

  useEffect(() => {
    return () => {
      mediaDraftsRef.current.forEach((draft) => {
        if (draft?.objectUrl) {
          URL.revokeObjectURL(draft.objectUrl);
        }
      });
    };
  }, []);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setTagsInput('');
    setVisibility(defaultVisibilityOption);
    setLinkUrl('');
    setMediaDrafts((previous) => {
      previous.forEach((draft) => {
        if (draft?.objectUrl) {
          URL.revokeObjectURL(draft.objectUrl);
        }
      });
      return [];
    });
    setIsDragActive(false);
  };

  const handleFilesSelected = async (filesList) => {
    if (!filesList) return;
    const availableSlots = Math.max(0, MAX_MEDIA_ATTACHMENTS - mediaDraftsRef.current.length);
    if (availableSlots <= 0) {
      setError('You can attach up to four images per post. Remove one to upload another.');
      return;
    }

    const rawFiles = Array.from(filesList).filter((file) => isAcceptableMediaType(file.type));
    if (!rawFiles.length) {
      setError('Only image attachments are supported right now.');
      return;
    }

    const selectedFiles = rawFiles.slice(0, availableSlots);
    const processed = [];

    for (const file of selectedFiles) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const objectUrl = URL.createObjectURL(file);
        processed.push({
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          objectUrl
        });
      } catch (fileError) {
        // Skip invalid files silently
      }
    }

    if (processed.length) {
      setMediaDrafts((prev) => {
        const next = [...prev, ...processed].slice(0, MAX_MEDIA_ATTACHMENTS);
        return next;
      });
      setError(null);
    }
  };

  const handleMediaInputChange = async (event) => {
    const { files } = event.target;
    await handleFilesSelected(files);
    event.target.value = '';
  };

  const handleRemoveDraft = (draftId) => {
    setMediaDrafts((prev) => {
      const draft = prev.find((item) => item.id === draftId);
      if (draft?.objectUrl) {
        URL.revokeObjectURL(draft.objectUrl);
      }
      return prev.filter((item) => item.id !== draftId);
    });
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      setIsExpanded(true);
      await handleFilesSelected(files);
    }
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

    if (trimmedBody.length < MIN_BODY_LENGTH) {
      setError(`Updates must be at least ${MIN_BODY_LENGTH} characters long.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    const mediaPayload = mediaDrafts.map((draft) => ({
      type: 'image',
      name: draft.name,
      size: draft.size,
      mimeType: draft.type,
      dataUrl: draft.dataUrl
    }));

    const payload = {
      title: trimmedTitle ? trimmedTitle : null,
      body: trimmedBody,
      tags,
      visibility: normalisedVisibility,
      postType: 'update',
      attachments
    };

    if (mediaPayload.length > 0) {
      payload.media = mediaPayload;
    }

    try {
      const response = await createCommunityPost({
        communityId: selectedCommunity?.id ?? selectedCommunityId,
        token,
        payload
      });

      const createdPost = response?.data ?? null;
      const communityLabel = selectedCommunity.name || 'your community';
      setSuccessMessage(`Update shared with ${communityLabel}.`);
      resetForm();
      setIsExpanded(false);
      if (typeof onPostCreated === 'function' && createdPost) {
        onPostCreated(createdPost);
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message ?? err?.message;
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setError('You do not have permission to publish in this community.');
      } else {
        setError(apiMessage ?? 'Unable to publish your update right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const mediaSlotsRemaining = Math.max(0, MAX_MEDIA_ATTACHMENTS - mediaDrafts.length);

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
                      value={normalisedVisibility}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (!visibilityOptions.includes(nextValue)) {
                          setVisibility(visibilityOptions[0] ?? 'members');
                          return;
                        }
                        setVisibility(nextValue);
                      }}
                      className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {visibilityOptions.map((option) => (
                        <option key={option} value={option}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </option>
                      ))}
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
                  <span className="mt-2 block text-[11px] text-slate-400">
                    Up to 12 tags, duplicates removed automatically.
                  </span>
                </label>

                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Share a link (optional)
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(event) => setLinkUrl(event.target.value)}
                    placeholder="https://example.com/resource"
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="mt-2 block text-[11px] text-slate-400">
                    Links are attached to the post so members can open resources instantly.
                  </span>
                </label>

                <div
                  className={`rounded-3xl border-2 border-dashed px-4 py-6 text-sm transition ${
                    isDragActive
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-300 bg-slate-50 text-slate-600'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={handleMediaInputChange}
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Media attachments</p>
                  <p className="mt-2 text-sm">
                    Drag and drop imagery here or{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="font-semibold text-primary underline-offset-2 transition hover:underline"
                    >
                      browse your library
                    </button>
                    .
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Supports JPG, PNG, GIF, and WebP. {mediaSlotsRemaining} slot
                    {mediaSlotsRemaining === 1 ? '' : 's'} remaining.
                  </p>
                  {mediaDrafts.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {mediaDrafts.map((draft) => (
                        <div
                          key={draft.id}
                          className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                        >
                          <img
                            src={draft.objectUrl ?? draft.dataUrl}
                            alt={draft.name}
                            className="h-32 w-full object-cover transition duration-300 group-hover:scale-[1.01]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveDraft(draft.id)}
                            className="absolute right-3 top-3 rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:bg-slate-900/90"
                          >
                            Remove
                          </button>
                          <div className="truncate px-3 py-2 text-xs font-semibold text-slate-600">
                            {draft.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {error && (
                  <div
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                    role="alert"
                    aria-live="assertive"
                  >
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                    role="status"
                    aria-live="polite"
                  >
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
