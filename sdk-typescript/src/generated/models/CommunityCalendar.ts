/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityCalendarEvent } from './CommunityCalendarEvent';
export type CommunityCalendar = {
    month: number;
    year: number;
    eventsByDate: Record<string, Array<CommunityCalendarEvent>>;
};

