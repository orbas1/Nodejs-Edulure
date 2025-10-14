/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DirectMessageRequest = {
    messageType?: 'text' | 'system' | 'file';
    body: string;
    attachments?: Array<Record<string, any>>;
    metadata?: Record<string, any>;
};

