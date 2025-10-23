import { useCallback, useMemo, useState } from 'react';

import { reactToCommunityPost, removeCommunityPostReaction } from '../api/communityApi.js';
import { trackEvent } from '../lib/analytics.js';

function extractCommunityId(post) {
  if (!post) return null;
  if (post.community && post.community.id) {
    return post.community.id;
  }
  if (post.communityId) {
    return post.communityId;
  }
  return null;
}

export default function useFeedInteractions({
  token,
  analyticsContext = {},
  onPostUpdated,
  allowToggle = false
} = {}) {
  const [reactionStates, setReactionStates] = useState({});

  const updateState = useCallback((postId, updates) => {
    if (!postId) return;
    setReactionStates((prev) => {
      if (updates === null) {
        if (!prev[postId]) return prev;
        const next = { ...prev };
        delete next[postId];
        return next;
      }
      const current = prev[postId] ?? {};
      return {
        ...prev,
        [postId]: { ...current, ...updates }
      };
    });
  }, []);

  const resolvePostUpdate = useCallback(
    (postId, updatedPost) => {
      if (typeof onPostUpdated === 'function' && postId) {
        onPostUpdated(postId, updatedPost);
      }
    },
    [onPostUpdated]
  );

  const react = useCallback(
    async (post, reaction = 'appreciate') => {
      if (!token || !post?.id) return;
      const communityId = extractCommunityId(post);
      if (!communityId) return;

      updateState(post.id, { isProcessing: true, error: null });

      try {
        const response = await reactToCommunityPost({
          communityId,
          postId: post.id,
          token,
          reaction
        });
        resolvePostUpdate(post.id, response.data ?? post);
        trackEvent('feed:reaction', {
          postId: post.id,
          communityId,
          reaction,
          ...analyticsContext
        });
        updateState(post.id, { isProcessing: false, error: null, lastReaction: reaction });
      } catch (error) {
        updateState(post.id, {
          isProcessing: false,
          error: error?.message ?? 'Unable to record reaction'
        });
      }
    },
    [analyticsContext, resolvePostUpdate, token, updateState]
  );

  const removeReaction = useCallback(
    async (post, reaction = 'appreciate') => {
      if (!allowToggle || !token || !post?.id) return;
      const communityId = extractCommunityId(post);
      if (!communityId) return;

      updateState(post.id, { isProcessing: true, error: null });

      try {
        const response = await removeCommunityPostReaction({
          communityId,
          postId: post.id,
          token,
          reaction
        });
        resolvePostUpdate(post.id, response.data ?? post);
        trackEvent('feed:reaction:removed', {
          postId: post.id,
          communityId,
          reaction,
          ...analyticsContext
        });
        updateState(post.id, { isProcessing: false, error: null, lastReaction: null });
      } catch (error) {
        updateState(post.id, {
          isProcessing: false,
          error: error?.message ?? 'Unable to remove reaction'
        });
      }
    },
    [allowToggle, analyticsContext, resolvePostUpdate, token, updateState]
  );

  const reactionMap = useMemo(() => reactionStates, [reactionStates]);

  return {
    react,
    removeReaction,
    reactionStates: reactionMap,
    resetReactionState: (postId) => updateState(postId, null)
  };
}
