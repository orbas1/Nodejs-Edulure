/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SocialPrivacySettings = {
    profileVisibility: 'public' | 'followers' | 'private';
    followApprovalRequired: boolean;
    messagePermission: 'anyone' | 'followers' | 'none';
    shareActivity: boolean;
    metadata?: Record<string, any>;
};

