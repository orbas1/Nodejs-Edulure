import type { AuthTokens } from '../models/AuthTokens';
import type { BlockRequest } from '../models/BlockRequest';
import type { CapabilityManifest } from '../models/CapabilityManifest';
import type { CommunityCalendar } from '../models/CommunityCalendar';
import type { CommunityChannelMembership } from '../models/CommunityChannelMembership';
import type { CommunityChatChannelSummary } from '../models/CommunityChatChannelSummary';
import type { CommunityChatMessage } from '../models/CommunityChatMessage';
import type { CommunityChatMessageExtended } from '../models/CommunityChatMessageExtended';
import type { CommunityChatModerationRequest } from '../models/CommunityChatModerationRequest';
import type { CommunityChatModerationResult } from '../models/CommunityChatModerationResult';
import type { CommunityChatReactionRequest } from '../models/CommunityChatReactionRequest';
import type { CommunityChatReactionSummary } from '../models/CommunityChatReactionSummary';
import type { CommunityChatReadReceiptRequest } from '../models/CommunityChatReadReceiptRequest';
import type { CommunityDetail } from '../models/CommunityDetail';
import type { CommunityEngagementProgress } from '../models/CommunityEngagementProgress';
import type { CommunityEventDetail } from '../models/CommunityEventDetail';
import type { CommunityEventParticipant } from '../models/CommunityEventParticipant';
import type { CommunityEventReminder } from '../models/CommunityEventReminder';
import type { CommunityLeaderboardEntry } from '../models/CommunityLeaderboardEntry';
import type { CommunityPointAwardResult } from '../models/CommunityPointAwardResult';
import type { CommunityPost } from '../models/CommunityPost';
import type { CommunityResource } from '../models/CommunityResource';
import type { CommunityStreak } from '../models/CommunityStreak';
import type { CouponPublic } from '../models/CouponPublic';
import type { CreateCommunityChatMessageRequest } from '../models/CreateCommunityChatMessageRequest';
import type { CreationRecommendationResponse } from '../models/CreationRecommendationResponse';
import type { DashboardResponse } from '../models/DashboardResponse';
import type { DirectMessage } from '../models/DirectMessage';
import type { DirectMessageReadReceipt } from '../models/DirectMessageReadReceipt';
import type { DirectMessageReadRequest } from '../models/DirectMessageReadRequest';
import type { DirectMessageRequest } from '../models/DirectMessageRequest';
import type { DirectMessageThreadCreationResult } from '../models/DirectMessageThreadCreationResult';
import type { DirectMessageThreadRequest } from '../models/DirectMessageThreadRequest';
import type { DirectMessageThreadSummary } from '../models/DirectMessageThreadSummary';
import type { EbookCatalogueResponse } from '../models/EbookCatalogueResponse';
import type { EbookCreateRequest } from '../models/EbookCreateRequest';
import type { EbookListing } from '../models/EbookListing';
import type { EbookPurchaseIntentRequest } from '../models/EbookPurchaseIntentRequest';
import type { EbookPurchaseIntentResponse } from '../models/EbookPurchaseIntentResponse';
import type { EbookStateRequest } from '../models/EbookStateRequest';
import type { EbookUpdateRequest } from '../models/EbookUpdateRequest';
import type { FeedAnalyticsResponse } from '../models/FeedAnalyticsResponse';
import type { FeedPlacementsResponse } from '../models/FeedPlacementsResponse';
import type { FeedSnapshotResponse } from '../models/FeedSnapshotResponse';
import type { FollowListItem } from '../models/FollowListItem';
import type { FollowRecommendationItem } from '../models/FollowRecommendationItem';
import type { FollowRelationship } from '../models/FollowRelationship';
import type { FollowRequest } from '../models/FollowRequest';
import type { FollowViewerContext } from '../models/FollowViewerContext';
import type { MuteRequest } from '../models/MuteRequest';
import type { PaymentIntentCreateRequest } from '../models/PaymentIntentCreateRequest';
import type { PaymentIntentCreateResponse } from '../models/PaymentIntentCreateResponse';
import type { PaymentIntentRecord } from '../models/PaymentIntentRecord';
import type { PaymentRefundRequest } from '../models/PaymentRefundRequest';
import type { PaymentSummaryEntry } from '../models/PaymentSummaryEntry';
import type { PresenceSession } from '../models/PresenceSession';
import type { PresenceUpdateRequest } from '../models/PresenceUpdateRequest';
import type { SessionEnvelope } from '../models/SessionEnvelope';
import type { SocialPrivacySettings } from '../models/SocialPrivacySettings';
import type { StandardResponse } from '../models/StandardResponse';
import type { User } from '../models/User';
import type { VerificationAdminOverview } from '../models/VerificationAdminOverview';
import type { VerificationAuditEntry } from '../models/VerificationAuditEntry';
import type { VerificationReviewRequest } from '../models/VerificationReviewRequest';
import type { VerificationStatus } from '../models/VerificationStatus';
import type { VerificationSummary } from '../models/VerificationSummary';
import type { VerificationUploadResponse } from '../models/VerificationUploadResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
export declare class DefaultService {
    /**
     * Health probe
     * @returns StandardResponse API is healthy
     * @throws ApiError
     */
    static getHealth(): CancelablePromise<StandardResponse>;
    /**
     * Create Stripe or PayPal payment intent
     * @param requestBody
     * @returns any Payment intent created
     * @throws ApiError
     */
    static postPayments(requestBody: PaymentIntentCreateRequest): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentCreateResponse;
    })>;
    /**
     * Capture an approved PayPal order
     * @param paymentId
     * @returns any PayPal capture completed
     * @throws ApiError
     */
    static postPaymentsPaypalCapture(paymentId: string): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentRecord;
    })>;
    /**
     * Issue a Stripe or PayPal refund
     * @param paymentId
     * @param requestBody
     * @returns any Refund accepted
     * @throws ApiError
     */
    static postPaymentsRefunds(paymentId: string, requestBody?: PaymentRefundRequest): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentRecord;
    })>;
    /**
     * Finance summary by currency
     * @param currency
     * @param startDate
     * @param endDate
     * @returns any Finance summary generated
     * @throws ApiError
     */
    static getPaymentsReportsSummary(currency?: string, startDate?: string, endDate?: string): CancelablePromise<(StandardResponse & {
        data?: Array<PaymentSummaryEntry>;
    })>;
    /**
     * Retrieve coupon details
     * @param code
     * @returns any Coupon fetched
     * @throws ApiError
     */
    static getPaymentsCoupons(code: string): CancelablePromise<(StandardResponse & {
        data?: CouponPublic;
    })>;
    /**
     * Stripe webhook receiver
     * @param requestBody
     * @returns any Event processed
     * @throws ApiError
     */
    static postPaymentsWebhooksStripe(requestBody: Record<string, any>): CancelablePromise<{
        received?: boolean;
    }>;
    /**
     * Register a new user
     * @param requestBody
     * @returns any Account created
     * @throws ApiError
     */
    static postAuthRegister(requestBody: {
        firstName: string;
        lastName?: string;
        email: string;
        /**
         * Minimum 12 characters with upper, lower, number, and symbol
         */
        password: string;
        role?: 'user' | 'instructor' | 'admin';
        age?: number;
        address?: {
            /**
             * Primary street address line
             */
            streetAddress?: string;
            /**
             * Additional street or unit information
             */
            addressLine2?: string;
            /**
             * Town or village
             */
            town?: string;
            /**
             * City or municipality
             */
            city?: string;
            /**
             * Country or territory
             */
            country?: string;
            /**
             * Postal or ZIP code
             */
            postcode?: string;
        };
        twoFactor?: {
            /**
             * Enable multi-factor authentication during registration.
             */
            enabled?: boolean;
        };
    }): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
            /**
             * Multi-factor enrollment details for the new account.
             */
            twoFactor?: {
                /**
                 * Indicates whether multi-factor authentication was enabled during registration.
                 */
                readonly enabled?: boolean;
                /**
                 * True when the selected role requires multi-factor authentication.
                 */
                readonly enforced?: boolean;
                /**
                 * Base32 secret for configuring an authenticator app. Returned only when MFA is enabled.
                 */
                readonly secret?: string;
                /**
                 * otpauth:// URI used for QR code generation.
                 */
                readonly otpauthUrl?: string;
                /**
                 * Issuer label presented in authenticator applications.
                 */
                readonly issuer?: string;
            };
        };
    })>;
    /**
     * Authenticate user
     * @param requestBody
     * @returns any Authenticated
     * @throws ApiError
     */
    static postAuthLogin(requestBody: {
        email: string;
        password: string;
        /**
         * 6-10 digit code generated by the user's authenticator application when multi-factor authentication is enabled.
         */
        twoFactorCode?: string;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
            tokens: AuthTokens;
            session: SessionEnvelope;
        };
    })>;
    /**
     * Refresh session tokens
     * @param requestBody
     * @returns any Session refreshed
     * @throws ApiError
     */
    static postAuthRefresh(requestBody: {
        refreshToken: string;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
            tokens: AuthTokens;
            session: SessionEnvelope;
        };
    })>;
    /**
     * Revoke current session
     * @returns any Session revoked
     * @throws ApiError
     */
    static postAuthLogout(): CancelablePromise<(StandardResponse & {
        data?: {
            revoked: boolean;
            reason?: string | null;
        };
    })>;
    /**
     * Revoke other active sessions
     * @param requestBody
     * @returns any Sessions revoked
     * @throws ApiError
     */
    static postAuthLogoutAll(requestBody?: {
        /**
         * Also revoke the session used for this request
         */
        includeCurrent?: boolean;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            revokedCount: number;
            revokedSessionIds: Array<number>;
        };
    })>;
    /**
     * Current user profile
     * @returns StandardResponse Profile retrieved
     * @throws ApiError
     */
    static getUsersMe(): CancelablePromise<StandardResponse>;
    /**
     * List users
     * @param limit
     * @param offset
     * @returns StandardResponse Users returned
     * @throws ApiError
     */
    static getUsers(limit?: number, offset?: number): CancelablePromise<StandardResponse>;
    /**
     * Learner dashboard aggregate
     * @returns any Dashboard snapshot
     * @throws ApiError
     */
    static getDashboardMe(): CancelablePromise<(StandardResponse & {
        data?: DashboardResponse;
    })>;
    /**
     * Communities for current user
     * @returns StandardResponse Communities retrieved
     * @throws ApiError
     */
    static getCommunities(): CancelablePromise<StandardResponse>;
    /**
     * Create community
     * @param requestBody
     * @returns StandardResponse Community created
     * @throws ApiError
     */
    static postCommunities(requestBody: {
        name: string;
        description?: string;
        coverImageUrl?: string;
        visibility?: 'public' | 'private';
        metadata?: Record<string, any>;
    }): CancelablePromise<StandardResponse>;
    /**
     * Aggregated community feed
     * @param page
     * @param perPage
     * @param postType
     * @param visibility
     * @returns any Feed retrieved
     * @throws ApiError
     */
    static getCommunitiesFeed(page?: number, perPage?: number, postType?: 'update' | 'event' | 'resource' | 'classroom' | 'poll', visibility?: 'public' | 'members' | 'admins'): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityPost>;
        meta?: {
            pagination?: {
                page?: number;
                perPage?: number;
                total?: number;
                pageCount?: number;
            };
        };
    })>;
    /**
     * Community detail
     * @param communityId
     * @returns any Community detail retrieved
     * @throws ApiError
     */
    static getCommunities1(communityId: string): CancelablePromise<(StandardResponse & {
        data?: CommunityDetail;
    })>;
    /**
     * Community feed
     * @param communityId
     * @param page
     * @param perPage
     * @param channelId
     * @param postType
     * @returns any Community feed retrieved
     * @throws ApiError
     */
    static getCommunitiesPosts(communityId: string, page?: number, perPage?: number, channelId?: number, postType?: 'update' | 'event' | 'resource' | 'classroom' | 'poll'): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityPost>;
        meta?: {
            pagination?: {
                page?: number;
                perPage?: number;
                total?: number;
                pageCount?: number;
            };
        };
    })>;
    /**
     * Create community post
     * @param communityId
     * @param requestBody
     * @returns any Post created
     * @throws ApiError
     */
    static postCommunitiesPosts(communityId: string, requestBody: {
        channelId?: number;
        postType?: 'update' | 'event' | 'resource' | 'classroom' | 'poll';
        title?: string;
        body: string;
        tags?: Array<string>;
        visibility?: 'public' | 'members' | 'admins';
        status?: 'draft' | 'scheduled' | 'published';
        scheduledAt?: string;
        publishedAt?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityPost;
    })>;
    /**
     * Community resources
     * @param communityId
     * @param limit
     * @param offset
     * @param resourceType
     * @returns any Resources retrieved
     * @throws ApiError
     */
    static getCommunitiesResources(communityId: string, limit?: number, offset?: number, resourceType?: 'content_asset' | 'external_link' | 'document' | 'classroom_session'): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityResource>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
        };
    })>;
    /**
     * Create community resource
     * @param communityId
     * @param requestBody
     * @returns any Resource created
     * @throws ApiError
     */
    static postCommunitiesResources(communityId: string, requestBody: {
        title: string;
        description?: string;
        resourceType: 'content_asset' | 'external_link' | 'document' | 'classroom_session';
        assetId?: number;
        linkUrl?: string;
        classroomReference?: string;
        tags?: Array<string>;
        visibility?: 'members' | 'admins';
        status?: 'draft' | 'published';
        publishedAt?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityResource;
    })>;
    /**
     * List community chat channels
     * @param communityId
     * @returns any Chat channels fetched
     * @throws ApiError
     */
    static getCommunitiesChatChannels(communityId: string): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityChatChannelSummary>;
    })>;
    /**
     * List channel messages
     * @param communityId
     * @param channelId
     * @param limit
     * @param before
     * @param after
     * @param threadRootId
     * @param includeHidden Set to true to include moderator-hidden messages alongside visible posts.
     * @returns any Messages fetched
     * @throws ApiError
     */
    static getCommunitiesChatChannelsMessages(communityId: string, channelId: string, limit?: number, before?: string, after?: string, threadRootId?: number, includeHidden?: boolean): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityChatMessageExtended>;
        meta?: {
            pagination?: {
                limit?: number;
                before?: string;
                after?: string;
                count?: number;
            };
        };
    })>;
    /**
     * Post channel message
     * @param communityId
     * @param channelId
     * @param requestBody
     * @returns any Message created
     * @throws ApiError
     */
    static postCommunitiesChatChannelsMessages(communityId: string, channelId: string, requestBody: CreateCommunityChatMessageRequest): CancelablePromise<(StandardResponse & {
        data?: CommunityChatMessage;
    })>;
    /**
     * Mark channel as read
     * @param communityId
     * @param channelId
     * @param requestBody
     * @returns any Read receipt stored
     * @throws ApiError
     */
    static postCommunitiesChatChannelsRead(communityId: string, channelId: string, requestBody: CommunityChatReadReceiptRequest): CancelablePromise<(StandardResponse & {
        data?: CommunityChannelMembership;
    })>;
    /**
     * Add message reaction
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Reaction added
     * @throws ApiError
     */
    static postCommunitiesChatChannelsMessagesReactions(communityId: string, channelId: string, messageId: string, requestBody: CommunityChatReactionRequest): CancelablePromise<(StandardResponse & {
        data?: CommunityChatReactionSummary;
    })>;
    /**
     * Remove message reaction
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Reaction removed
     * @throws ApiError
     */
    static deleteCommunitiesChatChannelsMessagesReactions(communityId: string, channelId: string, messageId: string, requestBody: CommunityChatReactionRequest): CancelablePromise<(StandardResponse & {
        data?: CommunityChatReactionSummary;
    })>;
    /**
     * Moderate a community message
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Moderation applied
     * @throws ApiError
     */
    static postCommunitiesChatChannelsMessagesModerate(communityId: string, channelId: string, messageId: string, requestBody: CommunityChatModerationRequest): CancelablePromise<(StandardResponse & {
        data?: CommunityChatModerationResult;
    })>;
    /**
     * List active presence sessions
     * @param communityId
     * @returns any Presence fetched
     * @throws ApiError
     */
    static getCommunitiesChatPresence(communityId: string): CancelablePromise<(StandardResponse & {
        data?: Array<PresenceSession>;
    })>;
    /**
     * Update presence state
     * @param communityId
     * @param requestBody
     * @returns any Presence updated
     * @throws ApiError
     */
    static postCommunitiesChatPresence(communityId: string, requestBody: PresenceUpdateRequest): CancelablePromise<(StandardResponse & {
        data?: PresenceSession;
    })>;
    /**
     * Member engagement progress
     * @param communityId
     * @returns any Engagement progress retrieved
     * @throws ApiError
     */
    static getCommunitiesEngagementProgress(communityId: string): CancelablePromise<(StandardResponse & {
        data?: CommunityEngagementProgress;
    })>;
    /**
     * Award community points
     * @param communityId
     * @param requestBody
     * @returns any Points awarded
     * @throws ApiError
     */
    static postCommunitiesEngagementPoints(communityId: string, requestBody: {
        userId: number;
        points: number;
        reason?: string;
        source?: string;
        referenceId?: string;
        metadata?: Record<string, any>;
        contributesToStreak?: boolean;
        activityAt?: string;
        timezone?: string;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityPointAwardResult;
    })>;
    /**
     * Record streak activity
     * @param communityId
     * @param requestBody
     * @returns any Streak updated
     * @throws ApiError
     */
    static postCommunitiesEngagementStreaksCheckIn(communityId: string, requestBody?: {
        activityAt?: string;
        timezone?: string;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityStreak;
    })>;
    /**
     * Community leaderboard
     * @param communityId
     * @param type
     * @param limit
     * @param offset
     * @returns any Leaderboard calculated
     * @throws ApiError
     */
    static getCommunitiesEngagementLeaderboard(communityId: string, type?: 'points' | 'lifetime' | 'streak' | 'attendance', limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityLeaderboardEntry>;
    })>;
    /**
     * List community events
     * @param communityId
     * @param from
     * @param to
     * @param limit
     * @param offset
     * @param status
     * @param visibility
     * @param order
     * @returns any Community events returned
     * @throws ApiError
     */
    static getCommunitiesEvents(communityId: string, from?: string, to?: string, limit?: number, offset?: number, status?: 'scheduled' | 'cancelled' | 'completed', visibility?: 'members' | 'admins' | 'owners', order?: 'asc' | 'desc'): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityEventDetail>;
    })>;
    /**
     * Create community event
     * @param communityId
     * @param requestBody
     * @returns any Event created
     * @throws ApiError
     */
    static postCommunitiesEvents(communityId: string, requestBody: {
        title: string;
        slug?: string;
        summary?: string;
        description?: string;
        startAt: string;
        endAt: string;
        timezone?: string;
        visibility?: 'members' | 'admins' | 'owners';
        attendanceLimit?: number;
        requiresRsvp?: boolean;
        isOnline?: boolean;
        meetingUrl?: string;
        locationName?: string;
        locationAddress?: string;
        locationLatitude?: number;
        locationLongitude?: number;
        coverImageUrl?: string;
        recurrenceRule?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityEventDetail;
    })>;
    /**
     * RSVP to community event
     * @param communityId
     * @param eventId
     * @param requestBody
     * @returns any RSVP stored
     * @throws ApiError
     */
    static postCommunitiesEventsRsvp(communityId: string, eventId: string, requestBody: {
        status?: 'going' | 'interested' | 'waitlisted' | 'declined' | 'checked_in';
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityEventParticipant;
    })>;
    /**
     * Schedule event reminder
     * @param communityId
     * @param eventId
     * @param requestBody
     * @returns any Reminder scheduled
     * @throws ApiError
     */
    static postCommunitiesEventsReminders(communityId: string, eventId: string, requestBody: {
        remindAt: string;
        channel?: 'email' | 'push' | 'sms';
        metadata?: Record<string, any>;
    }): CancelablePromise<(StandardResponse & {
        data?: CommunityEventReminder;
    })>;
    /**
     * Community calendar
     * @param communityId
     * @param month
     * @param year
     * @param visibility
     * @returns any Calendar compiled
     * @throws ApiError
     */
    static getCommunitiesCalendar(communityId: string, month?: number, year?: number, visibility?: 'members' | 'admins' | 'owners'): CancelablePromise<(StandardResponse & {
        data?: CommunityCalendar;
    })>;
    /**
     * List content assets
     * Requires instructor or admin Learnspace access.
     * @param page
     * @param pageSize
     * @param status
     * @param type
     * @returns StandardResponse Assets returned
     * @throws ApiError
     */
    static getContentAssets(page?: number, pageSize?: number, status?: string, type?: string): CancelablePromise<StandardResponse>;
    /**
     * Create signed upload session
     * @param requestBody
     * @returns StandardResponse Upload session created
     * @throws ApiError
     */
    static postContentAssetsUploadSession(requestBody: {
        type: string;
        filename: string;
        mimeType: string;
        size: number;
        checksum?: string;
        visibility?: string;
    }): CancelablePromise<StandardResponse>;
    /**
     * Confirm upload and queue ingestion
     * @param assetId
     * @param requestBody
     * @returns StandardResponse Asset queued
     * @throws ApiError
     */
    static postContentAssetsIngest(assetId: string, requestBody: {
        checksum?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<StandardResponse>;
    /**
     * Retrieve content asset
     * @param assetId
     * @returns StandardResponse Asset detail
     * @throws ApiError
     */
    static getContentAssets1(assetId: string): CancelablePromise<StandardResponse>;
    /**
     * Generate viewer token
     * @param assetId
     * @returns StandardResponse Viewer token issued
     * @throws ApiError
     */
    static getContentAssetsViewerToken(assetId: string): CancelablePromise<StandardResponse>;
    /**
     * Retrieve ebook progress
     * @param assetId
     * @returns StandardResponse Progress retrieved
     * @throws ApiError
     */
    static getContentAssetsProgress(assetId: string): CancelablePromise<StandardResponse>;
    /**
     * Update ebook progress
     * @param assetId
     * @param requestBody
     * @returns any Progress stored
     * @throws ApiError
     */
    static postContentAssetsProgress(assetId: string, requestBody: {
        progressPercent?: number;
        lastLocation?: string | null;
    }): CancelablePromise<any>;
    /**
     * Record asset event
     * @param assetId
     * @param requestBody
     * @returns any Event captured
     * @throws ApiError
     */
    static postContentAssetsEvents(assetId: string, requestBody: {
        eventType: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<any>;
    /**
     * Content analytics
     * @param assetId
     * @returns StandardResponse Analytics payload
     * @throws ApiError
     */
    static getContentAssetsAnalytics(assetId: string): CancelablePromise<StandardResponse>;
    /**
     * Confirm email ownership
     * @param requestBody
     * @returns any Email verified
     * @throws ApiError
     */
    static postAuthVerifyEmail(requestBody: {
        /**
         * Verification token received via email
         */
        token: string;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
        };
    })>;
    /**
     * Resend verification email
     * @param requestBody
     * @returns any Resend processed
     * @throws ApiError
     */
    static postAuthResendVerification(requestBody: {
        email: string;
    }): CancelablePromise<(StandardResponse & {
        data?: {
            delivered: boolean;
            expiresAt: string | null;
        };
    })>;
    /**
     * List direct message threads
     * @param limit
     * @param offset
     * @returns any Threads fetched
     * @throws ApiError
     */
    static getChatThreads(limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: Array<DirectMessageThreadSummary>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                count?: number;
            };
        };
    })>;
    /**
     * Create or reuse a direct message thread
     * @param requestBody
     * @returns any Thread ready
     * @throws ApiError
     */
    static postChatThreads(requestBody: DirectMessageThreadRequest): CancelablePromise<(StandardResponse & {
        data?: DirectMessageThreadCreationResult;
    })>;
    /**
     * List messages in a direct message thread
     * @param threadId
     * @param limit
     * @param before
     * @param after
     * @returns any Messages fetched
     * @throws ApiError
     */
    static getChatThreadsMessages(threadId: string, limit?: number, before?: string, after?: string): CancelablePromise<(StandardResponse & {
        data?: Array<DirectMessage>;
        meta?: {
            pagination?: {
                limit?: number;
                before?: string;
                after?: string;
                count?: number;
            };
        };
    })>;
    /**
     * Send a direct message
     * @param threadId
     * @param requestBody
     * @returns any Message sent
     * @throws ApiError
     */
    static postChatThreadsMessages(threadId: string, requestBody: DirectMessageRequest): CancelablePromise<(StandardResponse & {
        data?: DirectMessage;
    })>;
    /**
     * Mark a thread as read
     * @param threadId
     * @param requestBody
     * @returns any Thread read receipt stored
     * @throws ApiError
     */
    static postChatThreadsRead(threadId: string, requestBody: DirectMessageReadRequest): CancelablePromise<(StandardResponse & {
        data?: DirectMessageReadReceipt;
    })>;
    /**
     * Followers for current user
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Followers retrieved
     * @throws ApiError
     */
    static getSocialFollowers(limit?: number, offset?: number, status?: 'pending' | 'accepted' | 'declined', search?: string): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })>;
    /**
     * Followers for specified user
     * @param userId
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Followers retrieved
     * @throws ApiError
     */
    static getSocialUsersFollowers(userId: number, limit?: number, offset?: number, status?: 'pending' | 'accepted' | 'declined', search?: string): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })>;
    /**
     * Accounts the current user follows
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Following retrieved
     * @throws ApiError
     */
    static getSocialFollowing(limit?: number, offset?: number, status?: 'pending' | 'accepted' | 'declined', search?: string): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })>;
    /**
     * Accounts a specific user follows
     * @param userId
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Following retrieved
     * @throws ApiError
     */
    static getSocialUsersFollowing(userId: number, limit?: number, offset?: number, status?: 'pending' | 'accepted' | 'declined', search?: string): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })>;
    /**
     * Recommended accounts to follow
     * @param limit
     * @returns any Recommendations generated
     * @throws ApiError
     */
    static getSocialRecommendations(limit?: number): CancelablePromise<(StandardResponse & {
        data?: Array<FollowRecommendationItem>;
    })>;
    /**
     * Follow a user
     * @param userId
     * @param requestBody
     * @returns any Follow relationship processed
     * @throws ApiError
     */
    static postSocialFollows(userId: number, requestBody?: FollowRequest): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })>;
    /**
     * Unfollow a user
     * @param userId
     * @returns StandardResponse Follow removed
     * @throws ApiError
     */
    static deleteSocialFollows(userId: number): CancelablePromise<StandardResponse>;
    /**
     * Approve pending follow
     * @param userId
     * @param followerId
     * @returns any Follow request approved
     * @throws ApiError
     */
    static postSocialUsersFollowersApprove(userId: number, followerId: number): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })>;
    /**
     * Decline pending follow
     * @param userId
     * @param followerId
     * @returns any Follow request declined
     * @throws ApiError
     */
    static postSocialUsersFollowersDecline(userId: number, followerId: number): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })>;
    /**
     * Mute notifications from a user
     * @param userId
     * @param requestBody
     * @returns any Mute applied
     * @throws ApiError
     */
    static postSocialMutes(userId: number, requestBody?: MuteRequest): CancelablePromise<(StandardResponse & {
        data?: {
            userId?: number;
            mutedUserId?: number;
            mutedUntil?: string | null;
        };
    })>;
    /**
     * Remove mute for a user
     * @param userId
     * @returns StandardResponse Mute removed
     * @throws ApiError
     */
    static deleteSocialMutes(userId: number): CancelablePromise<StandardResponse>;
    /**
     * Block a user
     * @param userId
     * @param requestBody
     * @returns any User blocked
     * @throws ApiError
     */
    static postSocialBlocks(userId: number, requestBody?: BlockRequest): CancelablePromise<(StandardResponse & {
        data?: {
            userId?: number;
            blockedUserId?: number;
            blockedAt?: string;
        };
    })>;
    /**
     * Unblock a user
     * @param userId
     * @returns StandardResponse User unblocked
     * @throws ApiError
     */
    static deleteSocialBlocks(userId: number): CancelablePromise<StandardResponse>;
    /**
     * Get privacy settings for current user
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    static getSocialPrivacy(): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })>;
    /**
     * Update privacy settings for current user
     * @param requestBody
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    static putSocialPrivacy(requestBody: SocialPrivacySettings): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })>;
    /**
     * Get privacy settings for specific user
     * @param userId
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    static getSocialUsersPrivacy(userId: number): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })>;
    /**
     * Update privacy settings for specific user
     * @param userId
     * @param requestBody
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    static putSocialUsersPrivacy(userId: number, requestBody: SocialPrivacySettings): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })>;
    /**
     * Retrieve aggregated live feed snapshot
     * Returns a paginated feed composed of community posts, inline ad placements, and optional analytics highlights.
     * @param context Feed context to aggregate.
     * @param community Community slug or ID when retrieving a community feed.
     * @param page
     * @param perPage
     * @param includeAnalytics
     * @param includeHighlights
     * @param range
     * @param search
     * @param postType
     * @returns FeedSnapshotResponse Feed snapshot generated
     * @throws ApiError
     */
    static getFeed(context?: 'global' | 'community', community?: string, page?: number, perPage?: number, includeAnalytics?: boolean, includeHighlights?: boolean, range?: '7d' | '30d' | '90d' | '180d' | '365d', search?: string, postType?: string): CancelablePromise<FeedSnapshotResponse>;
    /**
     * Compute feed analytics
     * Returns engagement and ad performance analytics for the requested feed context.
     * @param context
     * @param community
     * @param range
     * @param search
     * @param postType
     * @returns FeedAnalyticsResponse Feed analytics generated
     * @throws ApiError
     */
    static getFeedAnalytics(context?: 'global' | 'community', community?: string, range?: '7d' | '30d' | '90d' | '180d' | '365d', search?: string, postType?: string): CancelablePromise<FeedAnalyticsResponse>;
    /**
     * Resolve eligible ad placements
     * Returns ad placements ranked for the supplied feed context.
     * @param context
     * @param limit
     * @param keywords Comma separated keyword hints to improve targeting matches.
     * @returns FeedPlacementsResponse Eligible placements resolved
     * @throws ApiError
     */
    static getFeedPlacements(context?: 'global_feed' | 'community_feed' | 'search' | 'course_live', limit?: number, keywords?: string): CancelablePromise<FeedPlacementsResponse>;
    /**
     * Identity verification summary
     * @returns any Operation successful
     * @throws ApiError
     */
    static getVerificationMe(): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })>;
    /**
     * Request presigned upload for verification documents
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    static postVerificationMeUploadRequests(requestBody: {
        documentType: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
    }): CancelablePromise<(StandardResponse & {
        data?: VerificationUploadResponse;
    })>;
    /**
     * Attach uploaded verification document metadata
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    static postVerificationMeDocuments(requestBody: {
        documentType: string;
        storageBucket: string;
        storageKey: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        checksumSha256: string;
    }): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })>;
    /**
     * Submit verification for manual review
     * @returns any Operation successful
     * @throws ApiError
     */
    static postVerificationMeSubmit(): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })>;
    /**
     * Administrative verification overview
     * @returns any Operation successful
     * @throws ApiError
     */
    static getVerificationAdminOverview(): CancelablePromise<(StandardResponse & {
        data?: VerificationAdminOverview;
    })>;
    /**
     * Review verification submission
     * @param verificationId Verification record identifier
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    static postVerificationReview(verificationId: number, requestBody: VerificationReviewRequest): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })>;
    /**
     * Verification audit trail
     * @param verificationId Verification record identifier
     * @returns any Operation successful
     * @throws ApiError
     */
    static getVerificationAudit(verificationId: number): CancelablePromise<(StandardResponse & {
        data?: Array<VerificationAuditEntry>;
    })>;
    /**
     * List published ebooks
     * @param search
     * @param categories Comma separated list of categories
     * @param tags Comma separated list of tags
     * @param languages Comma separated ISO language codes
     * @param minPrice
     * @param maxPrice
     * @param limit
     * @param offset
     * @returns any Marketplace catalogue fetched
     * @throws ApiError
     */
    static getEbooks(search?: string, categories?: string, tags?: string, languages?: string, minPrice?: number, maxPrice?: number, limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: Array<EbookListing>;
    })>;
    /**
     * Create ebook listing
     * @param requestBody
     * @returns any Ebook listing created
     * @throws ApiError
     */
    static postEbooks(requestBody: EbookCreateRequest): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })>;
    /**
     * List instructor ebook catalogue
     * @param status
     * @param search
     * @param limit
     * @param offset
     * @returns any Ebook catalogue fetched
     * @throws ApiError
     */
    static getEbooksCatalogue(status?: string, search?: string, limit?: number, offset?: number): CancelablePromise<(StandardResponse & {
        data?: EbookCatalogueResponse;
    })>;
    /**
     * Update ebook listing
     * @param ebookId
     * @param requestBody
     * @returns any Ebook listing updated
     * @throws ApiError
     */
    static patchEbooks(ebookId: string, requestBody: EbookUpdateRequest): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })>;
    /**
     * Update ebook publication state
     * @param ebookId
     * @param requestBody
     * @returns any Ebook state updated
     * @throws ApiError
     */
    static postEbooksState(ebookId: string, requestBody: EbookStateRequest): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })>;
    /**
     * Create ebook purchase intent
     * @param ebookId
     * @param requestBody
     * @returns any Purchase intent created
     * @throws ApiError
     */
    static postEbooksPurchaseIntent(ebookId: string, requestBody: EbookPurchaseIntentRequest): CancelablePromise<(StandardResponse & {
        data?: EbookPurchaseIntentResponse;
    })>;
    /**
     * Retrieve ebook details
     * @param slug
     * @returns any Ebook fetched
     * @throws ApiError
     */
    static getEbooksSlug(slug: string): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })>;
    /**
     * Capability manifest and service health
     * Returns aggregated readiness, incident, and capability exposure data so clients can render service health indicators and gate features consistently.
     * @returns any Capability manifest generated successfully.
     * @throws ApiError
     */
    static getRuntimeCapabilityManifest(): CancelablePromise<(StandardResponse & {
        data?: CapabilityManifest;
    })>;
    /**
     * Fetch creation studio recommendations
     * Returns prioritised actions for instructors based on project lifecycle, marketing coverage, and recency signals. Evaluations are gated by the `creation.recommendations` feature flag.
     * @param limit Maximum number of recommendations to return (default 5).
     * @param includeHistory When true, include recent generation metadata for observability.
     * @param ownerId Admin-only override to evaluate recommendations for a specific instructor.
     * @returns CreationRecommendationResponse Recommendations generated
     * @throws ApiError
     */
    static getCreationRecommendations(limit?: number, includeHistory?: boolean, ownerId?: number): CancelablePromise<CreationRecommendationResponse>;
}
//# sourceMappingURL=DefaultService.d.ts.map