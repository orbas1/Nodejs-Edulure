/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityChatMessage } from './CommunityChatMessage';
export type CommunityChatMessageExtended = (CommunityChatMessage & {
    reactions?: Array<{
        emoji?: string;
        count?: number;
    }>;
    viewerReactions?: Array<string>;
});

