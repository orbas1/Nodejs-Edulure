/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityEventMap } from './CommunityEventMap';
export type CommunityCalendarEvent = {
    id: number;
    title: string;
    startAt: string;
    endAt: string;
    timezone: string;
    visibility: string;
    status: string;
    map?: CommunityEventMap;
};

