import type { CommunityChannelMembership } from './CommunityChannelMembership';
import type { CommunityChatChannel } from './CommunityChatChannel';
import type { CommunityChatMessage } from './CommunityChatMessage';
export type CommunityChatChannelSummary = {
    channel: CommunityChatChannel;
    membership: CommunityChannelMembership;
    latestMessage?: CommunityChatMessage | null;
    unreadCount: number;
};
//# sourceMappingURL=CommunityChatChannelSummary.d.ts.map