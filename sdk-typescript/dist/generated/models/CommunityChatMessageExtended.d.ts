import type { CommunityChatMessage } from './CommunityChatMessage';
export type CommunityChatMessageExtended = (CommunityChatMessage & {
    reactions?: Array<{
        emoji?: string;
        count?: number;
    }>;
    viewerReactions?: Array<string>;
});
//# sourceMappingURL=CommunityChatMessageExtended.d.ts.map