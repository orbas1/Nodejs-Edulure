/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityEvent } from './CommunityEvent';
import type { CommunityEventMap } from './CommunityEventMap';
import type { CommunityEventParticipant } from './CommunityEventParticipant';
export type CommunityEventDetail = (CommunityEvent & {
    map?: CommunityEventMap;
    participants?: Array<CommunityEventParticipant>;
    attendance?: {
        confirmed: number;
        waitlisted: number;
    };
});

