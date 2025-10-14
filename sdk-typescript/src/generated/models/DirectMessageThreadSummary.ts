/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DirectMessage } from './DirectMessage';
import type { DirectMessageParticipantSummary } from './DirectMessageParticipantSummary';
import type { DirectMessageThread } from './DirectMessageThread';
export type DirectMessageThreadSummary = {
    thread: DirectMessageThread;
    participants: Array<DirectMessageParticipantSummary>;
    latestMessage?: DirectMessage | null;
    unreadCount: number;
};

