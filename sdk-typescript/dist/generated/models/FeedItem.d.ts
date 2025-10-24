import type { FeedAd } from './FeedAd';
import type { FeedPost } from './FeedPost';
export type FeedItem = {
    kind: 'post' | 'ad';
    context: string;
    timestamp: string;
    post?: FeedPost | null;
    ad?: FeedAd | null;
};
//# sourceMappingURL=FeedItem.d.ts.map