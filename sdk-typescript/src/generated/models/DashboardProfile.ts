/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DashboardProfile = {
    id: number;
    name: string;
    email: string;
    avatar: string;
    title: string;
    bio: string;
    stats: Array<{
        label: string;
        value: string;
    }>;
    feedHighlights: Array<{
        id: number;
        headline: string;
        time: string;
        tags: Array<string>;
        reactions: number;
        comments: number;
    }>;
};

