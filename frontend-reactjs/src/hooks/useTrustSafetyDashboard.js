import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchVerificationOverview,
  reviewVerificationCase
} from '../api/verificationApi.js';
import {
  applyCaseAction,
  getCase,
  listCases,
  listScamReports,
  undoCaseAction,
  updateScamReport
} from '../api/moderationApi.js';
import {
  approveFollowRequest,
  declineFollowRequest,
  fetchFollowers,
  fetchFollowing,
  followUser,
  removeFollower,
  unfollowUser
} from '../api/socialGraphApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_SCAM_FILTERS = Object.freeze({ status: 'pending', page: 1, perPage: 20 });
const DEFAULT_CASE_FILTERS = Object.freeze({ status: ['pending', 'in_review'], page: 1, perPage: 20 });

function mapFollowerList(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

export default function useTrustSafetyDashboard() {
  const { session } = useAuth();
  const token = session?.tokens?.accessToken ?? null;

  const [verification, setVerification] = useState(null);
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationError, setVerificationError] = useState(null);
  const [verificationActionState, setVerificationActionState] = useState({ status: 'idle', message: null });

  const [scamState, setScamState] = useState({
    loading: false,
    error: null,
    items: [],
    pagination: { page: 1, perPage: 20, total: 0, pageCount: 0 },
    filters: DEFAULT_SCAM_FILTERS,
    lastUpdated: null
  });

  const [networkState, setNetworkState] = useState({
    userId: session?.user?.id ?? null,
    loading: false,
    error: null,
    followers: [],
    following: [],
    pending: []
  });

  const [feedback, setFeedback] = useState(null);
  const defaultCommunityId = session?.context?.communityId ?? session?.user?.communityId ?? 1;

  const [casesState, setCasesState] = useState({
    loading: false,
    error: null,
    items: [],
    pagination: { page: 1, perPage: 20, total: 0, pageCount: 0 },
    filters: { ...DEFAULT_CASE_FILTERS, communityId: defaultCommunityId },
    selectedCaseId: null,
    selectedCase: null,
    lastUpdated: null
  });

  const refreshVerification = useCallback(async () => {
    if (!token) {
      setVerification(null);
      setVerificationError(new Error('Authentication required to load verification overview.'));
      return;
    }
    setVerificationLoading(true);
    setVerificationError(null);
    try {
      const overview = await fetchVerificationOverview({ token });
      setVerification(overview ?? null);
    } catch (error) {
      setVerificationError(error);
    } finally {
      setVerificationLoading(false);
    }
  }, [token]);

  const handleVerificationReview = useCallback(
    async ({ verificationId, status, rejectionReason, riskScore, escalationLevel, policyReferences }) => {
      if (!token) {
        setVerificationActionState({ status: 'error', message: 'Authentication required to review verification cases.' });
        return;
      }
      setVerificationActionState({ status: 'pending', message: null });
      try {
        await reviewVerificationCase({
          token,
          verificationId,
          body: {
            status,
            rejectionReason: rejectionReason || null,
            riskScore: Number.isFinite(riskScore) ? riskScore : undefined,
            escalationLevel,
            policyReferences: Array.isArray(policyReferences) ? policyReferences : undefined
          }
        });
        setVerificationActionState({ status: 'success', message: 'Verification review submitted successfully.' });
        refreshVerification();
      } catch (error) {
        setVerificationActionState({
          status: 'error',
          message: error?.message ?? 'Unable to submit verification review.'
        });
      }
    },
    [refreshVerification, token]
  );

  useEffect(() => {
    refreshVerification();
  }, [refreshVerification]);

  const refreshScamReports = useCallback(
    async (overrides = {}) => {
      if (!token) {
        setScamState((prev) => ({
          ...prev,
          loading: false,
          error: new Error('Authentication required to load scam reports.'),
          items: []
        }));
        return;
      }
      setScamState((prev) => ({ ...prev, loading: true, error: null }));
      const filters = { ...scamState.filters, ...overrides };
      try {
        const response = await listScamReports({
          token,
          params: filters
        });
        setScamState({
          loading: false,
          error: null,
          items: response.items,
          pagination: response.pagination,
          filters,
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        setScamState((prev) => ({
          ...prev,
          loading: false,
          error,
          filters
        }));
      }
    },
    [scamState.filters, token]
  );

  useEffect(() => {
    refreshScamReports();
  }, [refreshScamReports]);

  const refreshCases = useCallback(
    async (overrides = {}) => {
      if (!token) {
        setCasesState((prev) => ({
          ...prev,
          loading: false,
          error: new Error('Authentication required to load moderation cases.'),
          items: []
        }));
        return;
      }

      const filters = { ...casesState.filters, ...overrides };
      const { communityId, ...queryParams } = filters;

      setCasesState((prev) => ({ ...prev, loading: true, error: null, filters }));
      try {
        const response = await listCases({
          token,
          communityId,
          params: queryParams
        });
        setCasesState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          items: response.items,
          pagination: response.pagination,
          filters,
          lastUpdated: new Date().toISOString()
        }));
      } catch (error) {
        setCasesState((prev) => ({ ...prev, loading: false, error, filters }));
      }
    },
    [casesState.filters, token]
  );

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const selectCase = useCallback(
    async (caseId) => {
      if (!token || !caseId) {
        setCasesState((prev) => ({ ...prev, selectedCaseId: caseId ?? null, selectedCase: null }));
        return;
      }

      const { communityId } = casesState.filters;
      try {
        const result = await getCase({ token, communityId, caseId });
        setCasesState((prev) => ({
          ...prev,
          selectedCaseId: caseId,
          selectedCase: result?.case
            ? { ...result.case, actions: Array.isArray(result.actions) ? result.actions : [] }
            : null
        }));
      } catch (error) {
        setCasesState((prev) => ({
          ...prev,
          selectedCaseId: caseId,
          selectedCase: null,
          error
        }));
      }
    },
    [casesState.filters, token]
  );

  const handleCaseAction = useCallback(
    async ({ caseId, payload }) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to update moderation cases.' });
        return false;
      }
      const { communityId } = casesState.filters;
      try {
        const result = await applyCaseAction({
          token,
          communityId,
          caseId,
          payload
        });
        setFeedback({ tone: 'success', message: 'Moderation action applied.' });
        refreshCases();
        selectCase(caseId);
        return result;
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to apply moderation action.' });
        return false;
      }
    },
    [casesState.filters, refreshCases, selectCase, token]
  );

  const handleCaseUndo = useCallback(
    async ({ caseId, actionId }) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to undo moderation actions.' });
        return false;
      }
      const { communityId } = casesState.filters;
      try {
        await undoCaseAction({ token, communityId, caseId, actionId });
        setFeedback({ tone: 'success', message: 'Moderation action reverted.' });
        refreshCases();
        selectCase(caseId);
        return true;
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to undo moderation action.' });
        return false;
      }
    },
    [casesState.filters, refreshCases, selectCase, token]
  );

  const handleScamReportUpdate = useCallback(
    async ({ reportId, updates }) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to update scam reports.' });
        return false;
      }
      try {
        await updateScamReport({ token, reportId, payload: updates });
        setFeedback({ tone: 'success', message: 'Scam report updated successfully.' });
        refreshScamReports();
        return true;
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to update scam report.' });
        return false;
      }
    },
    [refreshScamReports, token]
  );

  const refreshNetwork = useCallback(
    async (overrideUserId) => {
      if (!token) {
        setNetworkState((prev) => ({
          ...prev,
          loading: false,
          error: new Error('Authentication required to manage network requests.'),
          followers: [],
          following: [],
          pending: []
        }));
        return;
      }
      const userId = overrideUserId ?? networkState.userId ?? session?.user?.id ?? null;
      setNetworkState((prev) => ({ ...prev, loading: true, error: null, userId }));
      try {
        const [followersResponse, followingResponse, pendingResponse] = await Promise.all([
          fetchFollowers({ token, userId, status: 'accepted', limit: 50 }),
          fetchFollowing({ token, userId, status: 'accepted', limit: 50 }),
          fetchFollowers({ token, userId, status: 'pending', limit: 50 })
        ]);
        setNetworkState((prev) => ({
          ...prev,
          loading: false,
          error: null,
          followers: mapFollowerList(followersResponse),
          following: mapFollowerList(followingResponse),
          pending: mapFollowerList(pendingResponse),
          userId
        }));
      } catch (error) {
        setNetworkState((prev) => ({ ...prev, loading: false, error }));
      }
    },
    [networkState.userId, token]
  );

  useEffect(() => {
    if (session?.user?.id && !networkState.userId) {
      setNetworkState((prev) => ({ ...prev, userId: session.user.id }));
    }
  }, [networkState.userId, session?.user?.id]);

  useEffect(() => {
    if (token) {
      refreshNetwork();
    }
  }, [refreshNetwork, token]);

  const handleNetworkScopeChange = useCallback(
    (userId) => {
      refreshNetwork(userId || null);
    },
    [refreshNetwork]
  );

  const handleApproveFollower = useCallback(
    async (followerId) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to approve requests.' });
        return;
      }
      const userId = networkState.userId;
      if (!userId) {
        setFeedback({ tone: 'error', message: 'Select a member scope before approving follow requests.' });
        return;
      }
      try {
        await approveFollowRequest({ token, userId, followerId });
        setFeedback({ tone: 'success', message: 'Follow request approved.' });
        refreshNetwork();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to approve follow request.' });
      }
    },
    [networkState.userId, refreshNetwork, token]
  );

  const handleDeclineFollower = useCallback(
    async (followerId) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to decline requests.' });
        return;
      }
      const userId = networkState.userId;
      if (!userId) {
        setFeedback({ tone: 'error', message: 'Select a member scope before declining follow requests.' });
        return;
      }
      try {
        await declineFollowRequest({ token, userId, followerId });
        setFeedback({ tone: 'success', message: 'Follow request declined.' });
        refreshNetwork();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to decline follow request.' });
      }
    },
    [networkState.userId, refreshNetwork, token]
  );

  const handleRemoveFollower = useCallback(
    async (followerId) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to remove followers.' });
        return;
      }
      const userId = networkState.userId;
      if (!userId) {
        setFeedback({ tone: 'error', message: 'Select a member scope before removing followers.' });
        return;
      }
      try {
        await removeFollower({ token, userId, followerId });
        setFeedback({ tone: 'success', message: 'Follower removed successfully.' });
        refreshNetwork();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to remove follower.' });
      }
    },
    [networkState.userId, refreshNetwork, token]
  );

  const handleFollowUser = useCallback(
    async (targetUserId, payload) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to follow users.' });
        return;
      }
      try {
        await followUser({ token, userId: targetUserId, payload });
        setFeedback({ tone: 'success', message: 'Follow invitation sent.' });
        refreshNetwork();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to send follow invitation.' });
      }
    },
    [refreshNetwork, token]
  );

  const handleUnfollowUser = useCallback(
    async (targetUserId) => {
      if (!token) {
        setFeedback({ tone: 'error', message: 'Authentication required to remove connections.' });
        return;
      }
      try {
        await unfollowUser({ token, userId: targetUserId });
        setFeedback({ tone: 'success', message: 'Connection removed successfully.' });
        refreshNetwork();
      } catch (error) {
        setFeedback({ tone: 'error', message: error?.message ?? 'Unable to remove connection.' });
      }
    },
    [refreshNetwork, token]
  );

  const outstandingRequests = useMemo(() => {
    const verificationQueue = Array.isArray(verification?.queue) ? verification.queue : [];
    const scamQueue = scamState.items.filter((item) => item.status !== 'resolved' && item.status !== 'dismissed');
    const networkQueue = networkState.pending ?? [];

    return [
      ...verificationQueue.map((item) => ({
        id: `verification-${item.id}`,
        type: 'verification',
        priority: item.hasBreachedSla ? 'high' : 'normal',
        reference: item.reference,
        submittedAt: item.lastSubmittedAt,
        summary: item.user?.name ?? item.user?.email ?? 'User'
      })),
      ...scamQueue.map((item) => ({
        id: `scam-${item.publicId ?? item.id}`,
        type: 'scam-report',
        priority: item.status === 'escalated' ? 'high' : 'normal',
        reference: item.reason,
        submittedAt: item.createdAt,
        summary: item.description ?? 'Scam report requires review'
      })),
      ...networkQueue.map((item) => ({
        id: `network-${item.id ?? item.userId ?? item.email ?? Math.random()}`,
        type: 'network-request',
        priority: 'normal',
        reference: item.name ?? item.email ?? 'Follow request',
        submittedAt: item.createdAt ?? null,
        summary: item.bio ?? 'Pending network approval'
      }))
    ];
  }, [networkState.pending, scamState.items, verification?.queue]);

  return {
    token,
    verification,
    verificationLoading,
    verificationError,
    verificationActionState,
    refreshVerification,
    handleVerificationReview,
    scamReports: scamState.items,
    scamLoading: scamState.loading,
    scamError: scamState.error,
    scamPagination: scamState.pagination,
    scamFilters: scamState.filters,
    setScamFilters: (filters) => setScamState((prev) => ({ ...prev, filters })),
    refreshScamReports,
    handleScamReportUpdate,
    networkState,
    refreshNetwork,
    handleNetworkScopeChange,
    handleApproveFollower,
    handleDeclineFollower,
    handleRemoveFollower,
    handleFollowUser,
    handleUnfollowUser,
    moderationCases: casesState.items,
    moderationCasesLoading: casesState.loading,
    moderationCasesError: casesState.error,
    moderationCasesPagination: casesState.pagination,
    moderationCaseFilters: casesState.filters,
    setModerationCaseFilters: (filters) =>
      setCasesState((prev) => ({
        ...prev,
        filters: { ...prev.filters, ...filters }
      })),
    refreshModerationCases: refreshCases,
    selectModerationCase: selectCase,
    selectedModerationCaseId: casesState.selectedCaseId,
    selectedModerationCase: casesState.selectedCase,
    applyModerationCaseAction: handleCaseAction,
    undoModerationCaseAction: handleCaseUndo,
    moderationCasesLastUpdated: casesState.lastUpdated,
    feedback,
    setFeedback,
    outstandingRequests,
    scamLastUpdated: scamState.lastUpdated
  };
}
