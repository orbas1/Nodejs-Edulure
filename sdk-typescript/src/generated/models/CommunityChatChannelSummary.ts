/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityChannelMembership } from './CommunityChannelMembership';
import type { CommunityChatChannel } from './CommunityChatChannel';
import type { CommunityChatMessage } from './CommunityChatMessage';
export type CommunityChatChannelSummary = {
    channel: CommunityChatChannel;
    membership: CommunityChannelMembership;
    latestMessage?: CommunityChatMessage | null;
    unreadCount: number;
};

