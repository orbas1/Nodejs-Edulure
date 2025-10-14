export type SocialPrivacySettings = {
    profileVisibility: 'public' | 'followers' | 'private';
    followApprovalRequired: boolean;
    messagePermission: 'anyone' | 'followers' | 'none';
    shareActivity: boolean;
    metadata?: Record<string, any>;
};
//# sourceMappingURL=SocialPrivacySettings.d.ts.map