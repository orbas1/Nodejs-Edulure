/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeedAdMetrics } from './FeedAdMetrics';
export type FeedHighlight = {
    type: string;
    id: string;
    title?: string | null;
    name?: string | null;
    summary?: string | null;
    status?: string | null;
    projectType?: string | null;
    objective?: string | null;
    ownerId?: number | null;
    metrics?: FeedAdMetrics | null;
    targeting?: Record<string, any> | null;
    schedule?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
    analyticsTargets?: Record<string, any> | null;
    timestamp: string;
    position?: number | null;
    context?: string | null;
};

