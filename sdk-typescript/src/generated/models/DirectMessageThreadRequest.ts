/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DirectMessageRequest } from './DirectMessageRequest';
export type DirectMessageThreadRequest = {
    participantIds: Array<number>;
    subject?: string;
    forceNew?: boolean;
    initialMessage?: DirectMessageRequest;
};

