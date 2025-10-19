import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HandThumbUpIcon,
  LockClosedIcon,
  SignalIcon,
  UserGroupIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

import DashboardSectionHeader from '../../components/dashboard/DashboardSectionHeader.jsx';
import DashboardStateMessage from '../../components/dashboard/DashboardStateMessage.jsx';
import {
  approveFollowRequest,
  declineFollowRequest,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRecommendations,
  followUser,
  unfollowUser,
  fetchSocialPrivacy,
  updateSocialPrivacy,
  fetchSocialMutes,
  fetchSocialBlocks,
  muteUser,
  unmuteUser,
  blockUser,
  unblockUser
} from '../../api/socialGraphApi.js';
import { mapFollowerItem, mapRecommendationItem } from '../../utils/socialGraph.js';
import { useAuth } from '../../context/AuthContext.jsx';

const privacyDefaults = {
  profileVisibility: 'public',
  followApprovalRequired: false,
  messagePermission: 'followers',
  shareActivity: true
};

function StatPill({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function PersonCard({ person, actions, accent = 'default' }) {
  const accentClass =
    accent === 'warning'
      ? 'border-amber-200 bg-amber-50'
      : accent === 'success'
        ? 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-3xl border ${accentClass} p-4 shadow-sm transition`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{person.name}</p>
          <p className="text-xs text-slate-500">{person.role}</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Trust {person.trust ?? 72}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">{person.tagline}</p>
      {person.meta ? (
        <p className="mt-1 text-xs text-slate-400">{person.meta}</p>
      ) : null}
      {Array.isArray(actions) && actions.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export default function LearnerSocial() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;
  const userId = session?.user?.id ?? null;

  const [followers, setFollowers] = useState([]);
  const [pendingFollowers, setPendingFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [privacy, setPrivacy] = useState(privacyDefaults);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState(null);
  const [mutes, setMutes] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionState, setActionState] = useState({});

  const followersDisplay = useMemo(() => followers.map(mapFollowerItem), [followers]);
  const pendingDisplay = useMemo(() => pendingFollowers.map(mapFollowerItem), [pendingFollowers]);
  const followingDisplay = useMemo(() => following.map(mapFollowerItem), [following]);
  const recommendationDisplay = useMemo(() => recommendations.map(mapRecommendationItem), [recommendations]);

  const followingIdSet = useMemo(() => {
    const ids = new Set();
    followingDisplay.forEach((entry) => {
      const followerId = entry.relationship?.followingId ?? entry.relationship?.id ?? entry.id;
      if (followerId) ids.add(Number(followerId));
    });
    return ids;
  }, [followingDisplay]);

  const loadGraph = useCallback(async () => {
    if (!token) {
      setFollowers([]);
      setPendingFollowers([]);
      setFollowing([]);
      setRecommendations([]);
      setPrivacy(privacyDefaults);
      setMutes([]);
      setBlocks([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [followersResponse, pendingResponse, followingResponse, recommendationsResponse, privacyResponse, mutesResponse, blocksResponse] =
        await Promise.all([
          fetchFollowers({ token, limit: 24, status: 'accepted' }),
          fetchFollowers({ token, limit: 24, status: 'pending' }),
          fetchFollowing({ token, limit: 24, status: 'accepted' }),
          fetchFollowRecommendations({ token, limit: 12 }),
          fetchSocialPrivacy({ token }),
          fetchSocialMutes({ token }),
          fetchSocialBlocks({ token })
        ]);

      setFollowers(followersResponse?.data ?? []);
      setPendingFollowers(pendingResponse?.data ?? []);
      setFollowing(followingResponse?.data ?? []);
      setRecommendations(recommendationsResponse?.data ?? []);
      if (privacyResponse?.data) {
        setPrivacy({
          profileVisibility: privacyResponse.data.profileVisibility ?? 'public',
          followApprovalRequired: Boolean(privacyResponse.data.followApprovalRequired),
          messagePermission: privacyResponse.data.messagePermission ?? 'followers',
          shareActivity: Boolean(privacyResponse.data.shareActivity)
        });
      }
      setMutes(mutesResponse?.data ?? []);
      setBlocks(blocksResponse?.data ?? []);
    } catch (loadError) {
      setError(loadError?.message ?? 'Unable to load social graph data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  const refreshActionState = useCallback((id, updates) => {
    setActionState((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...updates } }));
  }, []);

  const withActionState = useCallback(
    async (id, action) => {
      if (!id) return;
      refreshActionState(id, { loading: true, error: null });
      try {
        await action();
        refreshActionState(id, { loading: false, error: null });
        await loadGraph();
      } catch (actionError) {
        refreshActionState(id, {
          loading: false,
          error: actionError?.message ?? 'Action failed'
        });
      }
    },
    [loadGraph, refreshActionState]
  );

  const handleFollow = useCallback(
    (targetId, reason = 'learner.social.recommendation') =>
      withActionState(targetId, () =>
        followUser({
          token,
          userId: targetId,
          payload: { source: 'learner.social', reason, metadata: { initiatedFrom: 'learner-dashboard' } }
        })
      ),
    [token, withActionState]
  );

  const handleUnfollow = useCallback(
    (targetId) => withActionState(targetId, () => unfollowUser({ token, userId: targetId })),
    [token, withActionState]
  );

  const handleApprove = useCallback(
    (followerId) => {
      if (!userId) return;
      withActionState(followerId, () => approveFollowRequest({ token, userId, followerId }));
    },
    [token, userId, withActionState]
  );

  const handleDecline = useCallback(
    (followerId) => {
      if (!userId) return;
      withActionState(followerId, () => declineFollowRequest({ token, userId, followerId }));
    },
    [token, userId, withActionState]
  );

  const handleMute = useCallback(
    (userId) => withActionState(`mute-${userId}`, () => muteUser({ token, userId })),
    [token, withActionState]
  );

  const handleUnmute = useCallback(
    (userId) => withActionState(`mute-${userId}`, () => unmuteUser({ token, userId })),
    [token, withActionState]
  );

  const handleBlock = useCallback(
    (userId) => withActionState(`block-${userId}`, () => blockUser({ token, userId })),
    [token, withActionState]
  );

  const handleUnblock = useCallback(
    (userId) => withActionState(`block-${userId}`, () => unblockUser({ token, userId })),
    [token, withActionState]
  );

  const handlePrivacyChange = useCallback((field, value) => {
    setPrivacy((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handlePrivacySubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!token) return;
      setPrivacySaving(true);
      setPrivacyMessage(null);
      try {
        await updateSocialPrivacy({ token, payload: privacy });
        setPrivacyMessage('Privacy preferences updated.');
      } catch (submitError) {
        setPrivacyMessage(submitError?.message ?? 'Unable to update privacy preferences.');
      } finally {
        setPrivacySaving(false);
      }
    },
    [token, privacy]
  );

  if (!token) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Sign in required"
        description="You need to be signed in to manage your social graph."
      />
    );
  }

  if (loading) {
    return (
      <DashboardStateMessage
        title="Loading social dashboard"
        description="Fetching follower graph, recommendations, and privacy controls."
      />
    );
  }

  if (error) {
    return (
      <DashboardStateMessage
        variant="error"
        title="Social data unavailable"
        description={error}
        actionLabel="Retry"
        onAction={loadGraph}
      />
    );
  }

  const followerCount = followersDisplay.length;
  const followingCount = followingDisplay.length;
  const pendingCount = pendingDisplay.length;

  return (
    <div className="space-y-10">
      <DashboardSectionHeader
        eyebrow="Social"
        title="Grow your learning network"
        description="Approve new followers, curate your following list, and tune privacy defaults for a safe, high-signal feed."
        actions={
          <button type="button" className="dashboard-primary-pill" onClick={loadGraph}>
            Refresh data
          </button>
        }
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatPill label="Followers" value={followerCount} />
        <StatPill label="Following" value={followingCount} />
        <StatPill label="Pending approvals" value={pendingCount} />
      </section>

      {pendingDisplay.length ? (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <UserPlusIcon className="h-5 w-5 text-primary" />
            <div>
              <p className="text-base font-semibold text-slate-900">Follow requests</p>
              <p className="text-sm text-slate-600">Approve learners who requested access to your updates.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingDisplay.map((person) => {
              const state = actionState[person.id] ?? {};
              return (
                <PersonCard
                  key={person.id}
                  person={person}
                  accent="warning"
                  actions={[
                    <button
                      key="approve"
                      type="button"
                      onClick={() => handleApprove(person.relationship?.followerId ?? person.id)}
                      disabled={state.loading}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {state.loading ? 'Approving…' : 'Approve'}
                    </button>,
                    <button
                      key="decline"
                      type="button"
                      onClick={() => handleDecline(person.relationship?.followerId ?? person.id)}
                      disabled={state.loading}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                    >
                      Decline
                    </button>
                  ]}
                />
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-5 w-5 text-primary" />
          <div>
            <p className="text-base font-semibold text-slate-900">Followers</p>
            <p className="text-sm text-slate-600">People staying close to your learning updates.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {followersDisplay.map((person) => {
            const personId = person.relationship?.followerId ?? person.id;
            const isFollowedBack = followingIdSet.has(Number(personId));
            const state = actionState[personId] ?? {};
            return (
              <PersonCard
                key={person.id}
                person={person}
                actions={[
                  <button
                    key="follow"
                    type="button"
                    onClick={() => handleFollow(personId, 'learner.social.follow-back')}
                    disabled={state.loading || isFollowedBack}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
                  >
                    {isFollowedBack ? 'Following' : state.loading ? 'Processing…' : 'Follow back'}
                  </button>,
                  <button
                    key="mute"
                    type="button"
                    onClick={() => handleMute(personId)}
                    disabled={(actionState[`mute-${personId}`]?.loading ?? false)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    Mute
                  </button>,
                  <button
                    key="block"
                    type="button"
                    onClick={() => handleBlock(personId)}
                    disabled={(actionState[`block-${personId}`]?.loading ?? false)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Block
                  </button>
                ]}
              />
            );
          })}
          {!followersDisplay.length ? (
            <DashboardStateMessage
              title="No followers yet"
              description="Invite peers to connect with your learning timeline to populate this section."
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <SignalIcon className="h-5 w-5 text-primary" />
          <div>
            <p className="text-base font-semibold text-slate-900">Following</p>
            <p className="text-sm text-slate-600">Keep the most relevant instructors, peers, and operators at hand.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {followingDisplay.map((person) => {
            const personId = person.relationship?.followingId ?? person.id;
            const state = actionState[personId] ?? {};
            return (
              <PersonCard
                key={person.id}
                person={person}
                actions={[
                  <button
                    key="unfollow"
                    type="button"
                    onClick={() => handleUnfollow(personId)}
                    disabled={state.loading}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    {state.loading ? 'Processing…' : 'Unfollow'}
                  </button>,
                  <button
                    key="mute"
                    type="button"
                    onClick={() => handleMute(personId)}
                    disabled={(actionState[`mute-${personId}`]?.loading ?? false)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 disabled:opacity-60"
                  >
                    Mute
                  </button>,
                  <button
                    key="block"
                    type="button"
                    onClick={() => handleBlock(personId)}
                    disabled={(actionState[`block-${personId}`]?.loading ?? false)}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                  >
                    Block
                  </button>
                ]}
              />
            );
          })}
          {!followingDisplay.length ? (
            <DashboardStateMessage
              title="You’re not following anyone"
              description="Use recommendations or community pages to discover people worth following."
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <HandThumbUpIcon className="h-5 w-5 text-primary" />
          <div>
            <p className="text-base font-semibold text-slate-900">Recommendations</p>
            <p className="text-sm text-slate-600">Curated suggestions based on your cohorts and mutual connections.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recommendationDisplay.map((person) => {
            const personId = person.id;
            const state = actionState[personId] ?? {};
            return (
              <PersonCard
                key={person.id}
                person={{ ...person, meta: `${person.mutualFollowers ?? 0} mutual connections` }}
                actions={[
                  <button
                    key="follow"
                    type="button"
                    onClick={() => handleFollow(personId, 'learner.social.recommendation')}
                    disabled={state.loading || followingIdSet.has(Number(personId))}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
                  >
                    {state.loading ? 'Following…' : followingIdSet.has(Number(personId)) ? 'Following' : 'Follow'}
                  </button>
                ]}
              />
            );
          })}
          {!recommendationDisplay.length ? (
            <DashboardStateMessage
              title="No recommendations"
              description="Once you start following more people we’ll surface new recommendations."
            />
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <LockClosedIcon className="h-5 w-5 text-primary" />
          <div>
            <p className="text-base font-semibold text-slate-900">Privacy controls</p>
            <p className="text-sm text-slate-600">Define who can follow you, message you, and see your activity.</p>
          </div>
        </div>
        <form onSubmit={handlePrivacySubmit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2">
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Profile visibility
            <select
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={privacy.profileVisibility}
              onChange={(event) => handlePrivacyChange('profileVisibility', event.target.value)}
            >
              <option value="public">Public</option>
              <option value="followers">Followers only</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="flex flex-col text-sm font-medium text-slate-700">
            Message permissions
            <select
              className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={privacy.messagePermission}
              onChange={(event) => handlePrivacyChange('messagePermission', event.target.value)}
            >
              <option value="anyone">Anyone</option>
              <option value="followers">Followers only</option>
              <option value="none">No one</option>
            </select>
          </label>
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Follow approvals</p>
              <p className="text-xs text-slate-500">Require manual approval for new followers.</p>
            </div>
            <button
              type="button"
              onClick={() => handlePrivacyChange('followApprovalRequired', !privacy.followApprovalRequired)}
              className={`mt-3 inline-flex h-6 w-12 items-center rounded-full transition ${
                privacy.followApprovalRequired ? 'bg-primary' : 'bg-slate-300'
              }`}
              aria-pressed={privacy.followApprovalRequired}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                  privacy.followApprovalRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <div>
              <p className="font-semibold text-slate-800">Share activity</p>
              <p className="text-xs text-slate-500">Allow Edulure to display your engagement streaks and highlights.</p>
            </div>
            <button
              type="button"
              onClick={() => handlePrivacyChange('shareActivity', !privacy.shareActivity)}
              className={`mt-3 inline-flex h-6 w-12 items-center rounded-full transition ${
                privacy.shareActivity ? 'bg-primary' : 'bg-slate-300'
              }`}
              aria-pressed={privacy.shareActivity}
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                  privacy.shareActivity ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
            <p className="text-xs text-slate-500">
              Privacy updates apply immediately across communities, the feed, and direct messages.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
                disabled={privacySaving}
              >
                {privacySaving ? 'Saving…' : 'Save preferences'}
              </button>
              {privacyMessage ? <span className="text-xs text-slate-600">{privacyMessage}</span> : null}
            </div>
          </div>
        </form>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-base font-semibold text-slate-900">Muted users</p>
            <span className="text-xs text-slate-500">Temporarily silenced from your feed.</span>
          </div>
          <div className="space-y-3">
            {mutes.length ? (
              mutes.map((entry) => {
                const id = entry.user?.id ?? entry.mute?.mutedUserId;
                const state = actionState[`mute-${id}`] ?? {};
                return (
                  <div key={id} className="flex flex-wrap items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.user?.firstName ?? 'Muted user'}</p>
                      <p className="text-xs text-slate-500">Muted until {entry.mute?.mutedUntil ? new Date(entry.mute.mutedUntil).toLocaleString() : 'manually released'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnmute(id)}
                      disabled={state.loading}
                      className="text-sm font-semibold text-primary transition hover:text-primary-dark disabled:opacity-60"
                    >
                      {state.loading ? 'Unmuting…' : 'Unmute'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-3xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                You haven’t muted anyone. Use mute to pause noisy accounts without unfollowing.
              </p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <p className="text-base font-semibold text-slate-900">Blocked users</p>
            <span className="text-xs text-slate-500">Fully removed from your communities and feed.</span>
          </div>
          <div className="space-y-3">
            {blocks.length ? (
              blocks.map((entry) => {
                const id = entry.user?.id ?? entry.block?.blockedUserId;
                const state = actionState[`block-${id}`] ?? {};
                return (
                  <div key={id} className="flex flex-wrap items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.user?.firstName ?? 'Blocked user'}</p>
                      <p className="text-xs text-slate-500">Blocked on {entry.block?.blockedAt ? new Date(entry.block.blockedAt).toLocaleDateString() : 'unknown date'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnblock(id)}
                      disabled={state.loading}
                      className="text-sm font-semibold text-primary transition hover:text-primary-dark disabled:opacity-60"
                    >
                      {state.loading ? 'Unblocking…' : 'Unblock'}
                    </button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-3xl border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                You haven’t blocked anyone. Use blocks for abusive or spammy behaviour.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
