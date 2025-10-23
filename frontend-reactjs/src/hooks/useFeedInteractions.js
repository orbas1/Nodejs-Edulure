import { useCallback } from 'react';
import PropTypes from 'prop-types';

import { toggleFeedReaction } from '../api/feedApi.js';
import { trackEvent } from '../lib/analytics.js';

export default function useFeedInteractions({ token, onPostReplace, onActionStateChange, resolveMetadata }) {
  const updateActionState = useCallback(
    (postId, updates) => {
      if (typeof onActionStateChange === 'function') {
        onActionStateChange(postId, updates);
      }
    },
    [onActionStateChange]
  );

  const handleReact = useCallback(
    async (post, reaction = 'appreciate') => {
      if (!post?.id || !token) return;
      updateActionState(post.id, { isProcessing: true, error: null });
      try {
        const metadata = typeof resolveMetadata === 'function' ? resolveMetadata(post) : undefined;
        const response = await toggleFeedReaction({ token, postId: post.id, reaction, metadata });
        const result = response?.data ?? {};
        const updatedPost = result.post ?? null;
        if (updatedPost && typeof onPostReplace === 'function') {
          onPostReplace(post.id, () => updatedPost);
        }
        trackEvent('feed:reaction', {
          postId: post.id,
          reaction: result.reaction ?? reaction,
          active: Boolean(result.active),
          context: updatedPost?.context ?? post.context ?? 'global'
        });
        updateActionState(post.id, { isProcessing: false, error: null });
      } catch (error) {
        updateActionState(post.id, {
          isProcessing: false,
          error: error?.message ?? 'Unable to update reaction right now.'
        });
      }
    },
    [token, updateActionState, onPostReplace]
  );

  return {
    handleReact
  };
}

useFeedInteractions.propTypes = {
  token: PropTypes.string,
  onPostReplace: PropTypes.func,
  onActionStateChange: PropTypes.func,
  resolveMetadata: PropTypes.func
};

useFeedInteractions.defaultProps = {
  token: null,
  onPostReplace: undefined,
  onActionStateChange: undefined,
  resolveMetadata: undefined
};
