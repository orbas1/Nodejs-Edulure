/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GovernanceCommunication = {
    publicId: string;
    slug?: string;
    audience: string;
    channel: string;
    subject: string;
    body?: string;
    status: string;
    scheduleAt?: string | null;
    sentAt?: string | null;
    ownerEmail?: string;
    metrics?: Record<string, any>;
    attachments?: Array<Record<string, any>>;
    metadata?: Record<string, any>;
    deliveryProgress?: number | null;
    engagementRate?: number | null;
};

