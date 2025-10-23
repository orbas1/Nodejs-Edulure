import { useMemo } from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

import FeedList from '../../../components/feed/FeedList.jsx';

const highlightPropType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  time: PropTypes.string.isRequired,
  tags: PropTypes.arrayOf(PropTypes.string).isRequired,
  headline: PropTypes.string.isRequired,
  reactions: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  comments: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  summary: PropTypes.string,
  community: PropTypes.string
});

function mapHighlightToFeedEntry(highlight) {
  if (!highlight || !highlight.id) {
    return null;
  }

  const timestamp = (() => {
    if (!highlight.time) return null;
    const parsed = new Date(highlight.time);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  })();

  const reactions = Number.isFinite(Number(highlight.reactions)) ? Number(highlight.reactions) : 0;
  const comments = Number.isFinite(Number(highlight.comments)) ? Number(highlight.comments) : 0;
  const tags = Array.isArray(highlight.tags) ? highlight.tags : [];
  const summary = highlight.summary ?? highlight.body ?? highlight.headline ?? 'Community highlight';

  return {
    kind: 'post',
    post: {
      id: highlight.id,
      title: highlight.headline ?? 'Community highlight',
      body: summary,
      publishedAt: timestamp,
      createdAt: timestamp,
      tags,
      community: highlight.community ? { name: highlight.community } : undefined,
      author: {
        id: highlight.authorId ?? null,
        name: highlight.authorName ?? 'Community pulse',
        role: highlight.authorRole ?? 'Highlights',
        avatarUrl: highlight.authorAvatarUrl ?? null
      },
      stats: {
        reactions,
        comments
      },
      permissions: {
        canModerate: false,
        canRemove: false
      }
    }
  };
}

export default function LearnerFeedHighlightsSection({ highlights, className }) {
  const feedEntries = useMemo(() => {
    if (!Array.isArray(highlights)) return [];
    return highlights.map(mapHighlightToFeedEntry).filter(Boolean);
  }, [highlights]);

  if (feedEntries.length === 0) return null;

  return (
    <section className={clsx('dashboard-section h-full', className)}>
      <p className="dashboard-kicker">Feed highlights</p>
      <h3 className="mt-2 text-lg font-semibold text-slate-900">Signals from your communities</h3>
      <FeedList
        items={feedEntries}
        loading={false}
        hasMore={false}
        emptyState={<p className="text-sm text-slate-500">No highlights available.</p>}
      />
    </section>
  );
}

LearnerFeedHighlightsSection.propTypes = {
  highlights: PropTypes.arrayOf(highlightPropType),
  className: PropTypes.string
};

LearnerFeedHighlightsSection.defaultProps = {
  highlights: [],
  className: ''
};
