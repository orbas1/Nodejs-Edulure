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
//# sourceMappingURL=CommunityEventDetail.d.ts.map