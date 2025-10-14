import type { ExplorerMapMarker } from './ExplorerMapMarker';
export type ExplorerHit = {
    id: (string | number);
    entityType: 'communities' | 'courses' | 'ebooks' | 'tutors' | 'profiles' | 'ads' | 'events';
    title: string;
    subtitle?: string | null;
    description?: string | null;
    tags?: Array<string>;
    metrics?: Record<string, any>;
    actions?: Array<{
        label: string;
        href?: string;
    }>;
    geo?: ExplorerMapMarker | null;
    raw: Record<string, any>;
};
//# sourceMappingURL=ExplorerHit.d.ts.map