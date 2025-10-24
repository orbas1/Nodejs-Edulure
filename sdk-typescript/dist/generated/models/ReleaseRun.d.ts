export type ReleaseRun = {
    publicId: string;
    versionTag: string;
    environment: string;
    status: 'scheduled' | 'in_progress' | 'ready' | 'blocked' | 'cancelled' | 'completed';
    initiatedByEmail: string;
    initiatedByName?: string | null;
    scheduledAt: string;
    startedAt?: string | null;
    completedAt?: string | null;
    changeWindowStart?: string | null;
    changeWindowEnd?: string | null;
    summaryNotes?: string | null;
    metadata: Record<string, any>;
};
//# sourceMappingURL=ReleaseRun.d.ts.map