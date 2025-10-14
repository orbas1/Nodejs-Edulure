/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Health probe
     * @returns StandardResponse API is healthy
     * @throws ApiError
     */
    public static getHealth(): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/health',
            errors: {
                503: `Downstream dependency failure`,
            },
        });
    }
    /**
     * Create Stripe or PayPal payment intent
     * @param requestBody
     * @returns any Payment intent created
     * @throws ApiError
     */
    public static postPayments(
        requestBody: PaymentIntentCreateRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentCreateResponse;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/payments',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                404: `Coupon not found or inactive`,
                409: `Coupon redemption limit reached`,
                422: `Validation error`,
                502: `Payment provider error`,
            },
        });
    }
    /**
     * Capture an approved PayPal order
     * @param paymentId
     * @returns any PayPal capture completed
     * @throws ApiError
     */
    public static postPaymentsPaypalCapture(
        paymentId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentRecord;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/payments/paypal/{paymentId}/capture',
            path: {
                'paymentId': paymentId,
            },
            errors: {
                400: `Capture not allowed for current status`,
                401: `Missing or invalid token`,
                404: `Payment intent not found`,
                502: `PayPal returned an error`,
            },
        });
    }
    /**
     * Issue a Stripe or PayPal refund
     * @param paymentId
     * @param requestBody
     * @returns any Refund accepted
     * @throws ApiError
     */
    public static postPaymentsRefunds(
        paymentId: string,
        requestBody?: PaymentRefundRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: PaymentIntentRecord;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/payments/{paymentId}/refunds',
            path: {
                'paymentId': paymentId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Payment intent not found`,
                422: `Invalid refund amount`,
                502: `Payment provider error`,
            },
        });
    }
    /**
     * Finance summary by currency
     * @param currency
     * @param startDate
     * @param endDate
     * @returns any Finance summary generated
     * @throws ApiError
     */
    public static getPaymentsReportsSummary(
        currency?: string,
        startDate?: string,
        endDate?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<PaymentSummaryEntry>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/payments/reports/summary',
            query: {
                'currency': currency,
                'startDate': startDate,
                'endDate': endDate,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                422: `Invalid filter parameters`,
            },
        });
    }
    /**
     * Retrieve coupon details
     * @param code
     * @returns any Coupon fetched
     * @throws ApiError
     */
    public static getPaymentsCoupons(
        code: string,
    ): CancelablePromise<(StandardResponse & {
        data?: CouponPublic;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/payments/coupons/{code}',
            path: {
                'code': code,
            },
            errors: {
                401: `Missing or invalid token`,
                404: `Coupon not found`,
                422: `Invalid coupon code`,
            },
        });
    }
    /**
     * Stripe webhook receiver
     * @param requestBody
     * @returns any Event processed
     * @throws ApiError
     */
    public static postPaymentsWebhooksStripe(
        requestBody: Record<string, any>,
    ): CancelablePromise<{
        received?: boolean;
    }> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/payments/webhooks/stripe',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Signature validation failed`,
                500: `Webhook processing error`,
            },
        });
    }
    /**
     * Register a new user
     * @param requestBody
     * @returns any Account created
     * @throws ApiError
     */
    public static postAuthRegister(
        requestBody: {
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
        },
    ): CancelablePromise<(StandardResponse & {
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
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                409: `Email already exists`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Authenticate user
     * @param requestBody
     * @returns any Authenticated
     * @throws ApiError
     */
    public static postAuthLogin(
        requestBody: {
            email: string;
            password: string;
            /**
             * 6-10 digit code generated by the user's authenticator application when multi-factor authentication is enabled.
             */
            twoFactorCode?: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
            tokens: AuthTokens;
            session: SessionEnvelope;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Invalid credentials or incorrect two-factor code`,
                403: `Email verification or multi-factor challenge required`,
                409: `Multi-factor configuration required before access`,
                422: `Validation error`,
                423: `Account locked`,
            },
        });
    }
    /**
     * Refresh session tokens
     * @param requestBody
     * @returns any Session refreshed
     * @throws ApiError
     */
    public static postAuthRefresh(
        requestBody: {
            refreshToken: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
            tokens: AuthTokens;
            session: SessionEnvelope;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/refresh',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Refresh token missing`,
                401: `Refresh token invalid or expired`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Revoke current session
     * @returns any Session revoked
     * @throws ApiError
     */
    public static postAuthLogout(): CancelablePromise<(StandardResponse & {
        data?: {
            revoked: boolean;
            reason?: string | null;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Revoke other active sessions
     * @param requestBody
     * @returns any Sessions revoked
     * @throws ApiError
     */
    public static postAuthLogoutAll(
        requestBody?: {
            /**
             * Also revoke the session used for this request
             */
            includeCurrent?: boolean;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            revokedCount: number;
            revokedSessionIds: Array<number>;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/logout-all',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Current user profile
     * @returns StandardResponse Profile retrieved
     * @throws ApiError
     */
    public static getUsersMe(): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users/me',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * List users
     * @param limit
     * @param offset
     * @returns StandardResponse Users returned
     * @throws ApiError
     */
    public static getUsers(
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/users',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Learner dashboard aggregate
     * @returns any Dashboard snapshot
     * @throws ApiError
     */
    public static getDashboardMe(): CancelablePromise<(StandardResponse & {
        data?: DashboardResponse;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/dashboard/me',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Communities for current user
     * @returns StandardResponse Communities retrieved
     * @throws ApiError
     */
    public static getCommunities(): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Create community
     * @param requestBody
     * @returns StandardResponse Community created
     * @throws ApiError
     */
    public static postCommunities(
        requestBody: {
            name: string;
            description?: string;
            coverImageUrl?: string;
            visibility?: 'public' | 'private';
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                409: `Community slug already exists`,
            },
        });
    }
    /**
     * Aggregated community feed
     * @param page
     * @param perPage
     * @param postType
     * @param visibility
     * @returns any Feed retrieved
     * @throws ApiError
     */
    public static getCommunitiesFeed(
        page: number = 1,
        perPage: number = 10,
        postType?: 'update' | 'event' | 'resource' | 'classroom' | 'poll',
        visibility?: 'public' | 'members' | 'admins',
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityPost>;
        meta?: {
            pagination?: {
                page?: number;
                perPage?: number;
                total?: number;
                pageCount?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/feed',
            query: {
                'page': page,
                'perPage': perPage,
                'postType': postType,
                'visibility': visibility,
            },
            errors: {
                401: `Missing or invalid token`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Community detail
     * @param communityId
     * @returns any Community detail retrieved
     * @throws ApiError
     */
    public static getCommunities1(
        communityId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityDetail;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}',
            path: {
                'communityId': communityId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community is private`,
                404: `Community not found`,
            },
        });
    }
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
    public static getCommunitiesPosts(
        communityId: string,
        page: number = 1,
        perPage: number = 10,
        channelId?: number,
        postType?: 'update' | 'event' | 'resource' | 'classroom' | 'poll',
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityPost>;
        meta?: {
            pagination?: {
                page?: number;
                perPage?: number;
                total?: number;
                pageCount?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/posts',
            path: {
                'communityId': communityId,
            },
            query: {
                'page': page,
                'perPage': perPage,
                'channelId': channelId,
                'postType': postType,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community is private`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Create community post
     * @param communityId
     * @param requestBody
     * @returns any Post created
     * @throws ApiError
     */
    public static postCommunitiesPosts(
        communityId: string,
        requestBody: {
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
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityPost;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/posts',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Community resources
     * @param communityId
     * @param limit
     * @param offset
     * @param resourceType
     * @returns any Resources retrieved
     * @throws ApiError
     */
    public static getCommunitiesResources(
        communityId: string,
        limit: number = 10,
        offset?: number,
        resourceType?: 'content_asset' | 'external_link' | 'document' | 'classroom_session',
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityResource>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/resources',
            path: {
                'communityId': communityId,
            },
            query: {
                'limit': limit,
                'offset': offset,
                'resourceType': resourceType,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community is private`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Create community resource
     * @param communityId
     * @param requestBody
     * @returns any Resource created
     * @throws ApiError
     */
    public static postCommunitiesResources(
        communityId: string,
        requestBody: {
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
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityResource;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/resources',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * List community chat channels
     * @param communityId
     * @returns any Chat channels fetched
     * @throws ApiError
     */
    public static getCommunitiesChatChannels(
        communityId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityChatChannelSummary>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/chat/channels',
            path: {
                'communityId': communityId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community access denied`,
                404: `Community not found`,
            },
        });
    }
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
    public static getCommunitiesChatChannelsMessages(
        communityId: string,
        channelId: string,
        limit: number = 50,
        before?: string,
        after?: string,
        threadRootId?: number,
        includeHidden: boolean = false,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityChatMessageExtended>;
        meta?: {
            pagination?: {
                limit?: number;
                before?: string;
                after?: string;
                count?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/chat/channels/{channelId}/messages',
            path: {
                'communityId': communityId,
                'channelId': channelId,
            },
            query: {
                'limit': limit,
                'before': before,
                'after': after,
                'threadRootId': threadRootId,
                'includeHidden': includeHidden,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Channel access denied`,
                404: `Channel not found`,
            },
        });
    }
    /**
     * Post channel message
     * @param communityId
     * @param channelId
     * @param requestBody
     * @returns any Message created
     * @throws ApiError
     */
    public static postCommunitiesChatChannelsMessages(
        communityId: string,
        channelId: string,
        requestBody: CreateCommunityChatMessageRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityChatMessage;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/chat/channels/{channelId}/messages',
            path: {
                'communityId': communityId,
                'channelId': channelId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Channel access denied`,
                404: `Channel not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Mark channel as read
     * @param communityId
     * @param channelId
     * @param requestBody
     * @returns any Read receipt stored
     * @throws ApiError
     */
    public static postCommunitiesChatChannelsRead(
        communityId: string,
        channelId: string,
        requestBody: CommunityChatReadReceiptRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityChannelMembership;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/chat/channels/{channelId}/read',
            path: {
                'communityId': communityId,
                'channelId': channelId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Channel access denied`,
                404: `Channel not found`,
            },
        });
    }
    /**
     * Add message reaction
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Reaction added
     * @throws ApiError
     */
    public static postCommunitiesChatChannelsMessagesReactions(
        communityId: string,
        channelId: string,
        messageId: string,
        requestBody: CommunityChatReactionRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityChatReactionSummary;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/chat/channels/{channelId}/messages/{messageId}/reactions',
            path: {
                'communityId': communityId,
                'channelId': channelId,
                'messageId': messageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Channel access denied`,
                404: `Message not found`,
            },
        });
    }
    /**
     * Remove message reaction
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Reaction removed
     * @throws ApiError
     */
    public static deleteCommunitiesChatChannelsMessagesReactions(
        communityId: string,
        channelId: string,
        messageId: string,
        requestBody: CommunityChatReactionRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityChatReactionSummary;
    })> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/communities/{communityId}/chat/channels/{channelId}/messages/{messageId}/reactions',
            path: {
                'communityId': communityId,
                'channelId': channelId,
                'messageId': messageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Channel access denied`,
                404: `Message not found`,
            },
        });
    }
    /**
     * Moderate a community message
     * @param communityId
     * @param channelId
     * @param messageId
     * @param requestBody
     * @returns any Moderation applied
     * @throws ApiError
     */
    public static postCommunitiesChatChannelsMessagesModerate(
        communityId: string,
        channelId: string,
        messageId: string,
        requestBody: CommunityChatModerationRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityChatModerationResult;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/chat/channels/{channelId}/messages/{messageId}/moderate',
            path: {
                'communityId': communityId,
                'channelId': channelId,
                'messageId': messageId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Message not found`,
            },
        });
    }
    /**
     * List active presence sessions
     * @param communityId
     * @returns any Presence fetched
     * @throws ApiError
     */
    public static getCommunitiesChatPresence(
        communityId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<PresenceSession>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/chat/presence',
            path: {
                'communityId': communityId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community access denied`,
                404: `Community not found`,
            },
        });
    }
    /**
     * Update presence state
     * @param communityId
     * @param requestBody
     * @returns any Presence updated
     * @throws ApiError
     */
    public static postCommunitiesChatPresence(
        communityId: string,
        requestBody: PresenceUpdateRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: PresenceSession;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/chat/presence',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Member engagement progress
     * @param communityId
     * @returns any Engagement progress retrieved
     * @throws ApiError
     */
    public static getCommunitiesEngagementProgress(
        communityId: string,
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityEngagementProgress;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/engagement/progress',
            path: {
                'communityId': communityId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Community is private`,
                404: `Community not found`,
            },
        });
    }
    /**
     * Award community points
     * @param communityId
     * @param requestBody
     * @returns any Points awarded
     * @throws ApiError
     */
    public static postCommunitiesEngagementPoints(
        communityId: string,
        requestBody: {
            userId: number;
            points: number;
            reason?: string;
            source?: string;
            referenceId?: string;
            metadata?: Record<string, any>;
            contributesToStreak?: boolean;
            activityAt?: string;
            timezone?: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityPointAwardResult;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/engagement/points',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Record streak activity
     * @param communityId
     * @param requestBody
     * @returns any Streak updated
     * @throws ApiError
     */
    public static postCommunitiesEngagementStreaksCheckIn(
        communityId: string,
        requestBody?: {
            activityAt?: string;
            timezone?: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityStreak;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/engagement/streaks/check-in',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                404: `Community not found`,
            },
        });
    }
    /**
     * Community leaderboard
     * @param communityId
     * @param type
     * @param limit
     * @param offset
     * @returns any Leaderboard calculated
     * @throws ApiError
     */
    public static getCommunitiesEngagementLeaderboard(
        communityId: string,
        type: 'points' | 'lifetime' | 'streak' | 'attendance' = 'points',
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityLeaderboardEntry>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/engagement/leaderboard',
            path: {
                'communityId': communityId,
            },
            query: {
                'type': type,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                404: `Community not found`,
            },
        });
    }
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
    public static getCommunitiesEvents(
        communityId: string,
        from?: string,
        to?: string,
        limit: number = 50,
        offset?: number,
        status?: 'scheduled' | 'cancelled' | 'completed',
        visibility?: 'members' | 'admins' | 'owners',
        order?: 'asc' | 'desc',
    ): CancelablePromise<(StandardResponse & {
        data?: Array<CommunityEventDetail>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/events',
            path: {
                'communityId': communityId,
            },
            query: {
                'from': from,
                'to': to,
                'limit': limit,
                'offset': offset,
                'status': status,
                'visibility': visibility,
                'order': order,
            },
            errors: {
                401: `Missing or invalid token`,
                404: `Community not found`,
            },
        });
    }
    /**
     * Create community event
     * @param communityId
     * @param requestBody
     * @returns any Event created
     * @throws ApiError
     */
    public static postCommunitiesEvents(
        communityId: string,
        requestBody: {
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
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityEventDetail;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/events',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Community not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * RSVP to community event
     * @param communityId
     * @param eventId
     * @param requestBody
     * @returns any RSVP stored
     * @throws ApiError
     */
    public static postCommunitiesEventsRsvp(
        communityId: string,
        eventId: string,
        requestBody: {
            status?: 'going' | 'interested' | 'waitlisted' | 'declined' | 'checked_in';
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityEventParticipant;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/events/{eventId}/rsvp',
            path: {
                'communityId': communityId,
                'eventId': eventId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                404: `Event not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Schedule event reminder
     * @param communityId
     * @param eventId
     * @param requestBody
     * @returns any Reminder scheduled
     * @throws ApiError
     */
    public static postCommunitiesEventsReminders(
        communityId: string,
        eventId: string,
        requestBody: {
            remindAt: string;
            channel?: 'email' | 'push' | 'sms';
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityEventReminder;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/events/{eventId}/reminders',
            path: {
                'communityId': communityId,
                'eventId': eventId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                404: `Event not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Community calendar
     * @param communityId
     * @param month
     * @param year
     * @param visibility
     * @returns any Calendar compiled
     * @throws ApiError
     */
    public static getCommunitiesCalendar(
        communityId: string,
        month?: number,
        year?: number,
        visibility?: 'members' | 'admins' | 'owners',
    ): CancelablePromise<(StandardResponse & {
        data?: CommunityCalendar;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/calendar',
            path: {
                'communityId': communityId,
            },
            query: {
                'month': month,
                'year': year,
                'visibility': visibility,
            },
            errors: {
                401: `Missing or invalid token`,
                404: `Community not found`,
            },
        });
    }
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
    public static getContentAssets(
        page: number = 1,
        pageSize: number = 20,
        status?: string,
        type?: string,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/content/assets',
            query: {
                'page': page,
                'pageSize': pageSize,
                'status': status,
                'type': type,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Instructor or admin permissions required`,
            },
        });
    }
    /**
     * Create signed upload session
     * @param requestBody
     * @returns StandardResponse Upload session created
     * @throws ApiError
     */
    public static postContentAssetsUploadSession(
        requestBody: {
            type: string;
            filename: string;
            mimeType: string;
            size: number;
            checksum?: string;
            visibility?: string;
        },
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/content/assets/upload-session',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Confirm upload and queue ingestion
     * @param assetId
     * @param requestBody
     * @returns StandardResponse Asset queued
     * @throws ApiError
     */
    public static postContentAssetsIngest(
        assetId: string,
        requestBody: {
            checksum?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/content/assets/{assetId}/ingest',
            path: {
                'assetId': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Retrieve content asset
     * @param assetId
     * @returns StandardResponse Asset detail
     * @throws ApiError
     */
    public static getContentAssets1(
        assetId: string,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/content/assets/{assetId}',
            path: {
                'assetId': assetId,
            },
            errors: {
                404: `Asset not found`,
            },
        });
    }
    /**
     * Generate viewer token
     * @param assetId
     * @returns StandardResponse Viewer token issued
     * @throws ApiError
     */
    public static getContentAssetsViewerToken(
        assetId: string,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/content/assets/{assetId}/viewer-token',
            path: {
                'assetId': assetId,
            },
            errors: {
                403: `Access denied`,
                404: `Asset not found`,
            },
        });
    }
    /**
     * Retrieve ebook progress
     * @param assetId
     * @returns StandardResponse Progress retrieved
     * @throws ApiError
     */
    public static getContentAssetsProgress(
        assetId: string,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/content/assets/{assetId}/progress',
            path: {
                'assetId': assetId,
            },
            errors: {
                404: `Asset not found`,
            },
        });
    }
    /**
     * Update ebook progress
     * @param assetId
     * @param requestBody
     * @returns any Progress stored
     * @throws ApiError
     */
    public static postContentAssetsProgress(
        assetId: string,
        requestBody: {
            progressPercent?: number;
            lastLocation?: string | null;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/content/assets/{assetId}/progress',
            path: {
                'assetId': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Asset not found`,
            },
        });
    }
    /**
     * Record asset event
     * @param assetId
     * @param requestBody
     * @returns any Event captured
     * @throws ApiError
     */
    public static postContentAssetsEvents(
        assetId: string,
        requestBody: {
            eventType: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/content/assets/{assetId}/events',
            path: {
                'assetId': assetId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Asset not found`,
            },
        });
    }
    /**
     * Content analytics
     * @param assetId
     * @returns StandardResponse Analytics payload
     * @throws ApiError
     */
    public static getContentAssetsAnalytics(
        assetId: string,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/content/assets/{assetId}/analytics',
            path: {
                'assetId': assetId,
            },
            errors: {
                403: `Insufficient permissions`,
                404: `Asset not found`,
            },
        });
    }
    /**
     * Confirm email ownership
     * @param requestBody
     * @returns any Email verified
     * @throws ApiError
     */
    public static postAuthVerifyEmail(
        requestBody: {
            /**
             * Verification token received via email
             */
            token: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            user: User;
            verification: VerificationStatus;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/verify-email',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                410: `Token expired or already used`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Resend verification email
     * @param requestBody
     * @returns any Resend processed
     * @throws ApiError
     */
    public static postAuthResendVerification(
        requestBody: {
            email: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: {
            delivered: boolean;
            expiresAt: string | null;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/auth/resend-verification',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation error`,
                429: `Too many requests`,
            },
        });
    }
    /**
     * List direct message threads
     * @param limit
     * @param offset
     * @returns any Threads fetched
     * @throws ApiError
     */
    public static getChatThreads(
        limit: number = 20,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<DirectMessageThreadSummary>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                count?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/chat/threads',
            query: {
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Create or reuse a direct message thread
     * @param requestBody
     * @returns any Thread ready
     * @throws ApiError
     */
    public static postChatThreads(
        requestBody: DirectMessageThreadRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: DirectMessageThreadCreationResult;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/chat/threads',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                404: `Participant not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * List messages in a direct message thread
     * @param threadId
     * @param limit
     * @param before
     * @param after
     * @returns any Messages fetched
     * @throws ApiError
     */
    public static getChatThreadsMessages(
        threadId: string,
        limit: number = 50,
        before?: string,
        after?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<DirectMessage>;
        meta?: {
            pagination?: {
                limit?: number;
                before?: string;
                after?: string;
                count?: number;
            };
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/chat/threads/{threadId}/messages',
            path: {
                'threadId': threadId,
            },
            query: {
                'limit': limit,
                'before': before,
                'after': after,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Thread access denied`,
                404: `Thread not found`,
            },
        });
    }
    /**
     * Send a direct message
     * @param threadId
     * @param requestBody
     * @returns any Message sent
     * @throws ApiError
     */
    public static postChatThreadsMessages(
        threadId: string,
        requestBody: DirectMessageRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: DirectMessage;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/chat/threads/{threadId}/messages',
            path: {
                'threadId': threadId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Thread access denied`,
                404: `Thread not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Mark a thread as read
     * @param threadId
     * @param requestBody
     * @returns any Thread read receipt stored
     * @throws ApiError
     */
    public static postChatThreadsRead(
        threadId: string,
        requestBody: DirectMessageReadRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: DirectMessageReadReceipt;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/chat/threads/{threadId}/read',
            path: {
                'threadId': threadId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Thread access denied`,
                404: `Thread not found`,
            },
        });
    }
    /**
     * Followers for current user
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Followers retrieved
     * @throws ApiError
     */
    public static getSocialFollowers(
        limit?: number,
        offset?: number,
        status?: 'pending' | 'accepted' | 'declined',
        search?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/followers',
            query: {
                'limit': limit,
                'offset': offset,
                'status': status,
                'search': search,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
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
    public static getSocialUsersFollowers(
        userId: number,
        limit?: number,
        offset?: number,
        status?: 'pending' | 'accepted' | 'declined',
        search?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/users/{userId}/followers',
            path: {
                'userId': userId,
            },
            query: {
                'limit': limit,
                'offset': offset,
                'status': status,
                'search': search,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Accounts the current user follows
     * @param limit Maximum records to return
     * @param offset
     * @param status
     * @param search
     * @returns any Following retrieved
     * @throws ApiError
     */
    public static getSocialFollowing(
        limit?: number,
        offset?: number,
        status?: 'pending' | 'accepted' | 'declined',
        search?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/following',
            query: {
                'limit': limit,
                'offset': offset,
                'status': status,
                'search': search,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
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
    public static getSocialUsersFollowing(
        userId: number,
        limit?: number,
        offset?: number,
        status?: 'pending' | 'accepted' | 'declined',
        search?: string,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<FollowListItem>;
        meta?: {
            pagination?: {
                limit?: number;
                offset?: number;
                total?: number;
            };
            viewerContext?: FollowViewerContext;
        };
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/users/{userId}/following',
            path: {
                'userId': userId,
            },
            query: {
                'limit': limit,
                'offset': offset,
                'status': status,
                'search': search,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Recommended accounts to follow
     * @param limit
     * @returns any Recommendations generated
     * @throws ApiError
     */
    public static getSocialRecommendations(
        limit?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<FollowRecommendationItem>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/recommendations',
            query: {
                'limit': limit,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Follow a user
     * @param userId
     * @param requestBody
     * @returns any Follow relationship processed
     * @throws ApiError
     */
    public static postSocialFollows(
        userId: number,
        requestBody?: FollowRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/social/follows/{userId}',
            path: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Unfollow a user
     * @param userId
     * @returns StandardResponse Follow removed
     * @throws ApiError
     */
    public static deleteSocialFollows(
        userId: number,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/social/follows/{userId}',
            path: {
                'userId': userId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Approve pending follow
     * @param userId
     * @param followerId
     * @returns any Follow request approved
     * @throws ApiError
     */
    public static postSocialUsersFollowersApprove(
        userId: number,
        followerId: number,
    ): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/social/users/{userId}/followers/{followerId}/approve',
            path: {
                'userId': userId,
                'followerId': followerId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Decline pending follow
     * @param userId
     * @param followerId
     * @returns any Follow request declined
     * @throws ApiError
     */
    public static postSocialUsersFollowersDecline(
        userId: number,
        followerId: number,
    ): CancelablePromise<(StandardResponse & {
        data?: FollowRelationship;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/social/users/{userId}/followers/{followerId}/decline',
            path: {
                'userId': userId,
                'followerId': followerId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Mute notifications from a user
     * @param userId
     * @param requestBody
     * @returns any Mute applied
     * @throws ApiError
     */
    public static postSocialMutes(
        userId: number,
        requestBody?: MuteRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: {
            userId?: number;
            mutedUserId?: number;
            mutedUntil?: string | null;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/social/mutes/{userId}',
            path: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Remove mute for a user
     * @param userId
     * @returns StandardResponse Mute removed
     * @throws ApiError
     */
    public static deleteSocialMutes(
        userId: number,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/social/mutes/{userId}',
            path: {
                'userId': userId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Block a user
     * @param userId
     * @param requestBody
     * @returns any User blocked
     * @throws ApiError
     */
    public static postSocialBlocks(
        userId: number,
        requestBody?: BlockRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: {
            userId?: number;
            blockedUserId?: number;
            blockedAt?: string;
        };
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/social/blocks/{userId}',
            path: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Unblock a user
     * @param userId
     * @returns StandardResponse User unblocked
     * @throws ApiError
     */
    public static deleteSocialBlocks(
        userId: number,
    ): CancelablePromise<StandardResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/social/blocks/{userId}',
            path: {
                'userId': userId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Get privacy settings for current user
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    public static getSocialPrivacy(): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/privacy',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Update privacy settings for current user
     * @param requestBody
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    public static putSocialPrivacy(
        requestBody: SocialPrivacySettings,
    ): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/social/privacy',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Get privacy settings for specific user
     * @param userId
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    public static getSocialUsersPrivacy(
        userId: number,
    ): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/social/users/{userId}/privacy',
            path: {
                'userId': userId,
            },
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Update privacy settings for specific user
     * @param userId
     * @param requestBody
     * @returns any Privacy settings retrieved
     * @throws ApiError
     */
    public static putSocialUsersPrivacy(
        userId: number,
        requestBody: SocialPrivacySettings,
    ): CancelablePromise<(StandardResponse & {
        data?: SocialPrivacySettings;
    })> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/social/users/{userId}/privacy',
            path: {
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Identity verification summary
     * @returns any Operation successful
     * @throws ApiError
     */
    public static getVerificationMe(): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/verification/me',
            errors: {
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Request presigned upload for verification documents
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    public static postVerificationMeUploadRequests(
        requestBody: {
            documentType: string;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: VerificationUploadResponse;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/verification/me/upload-requests',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid upload request`,
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Attach uploaded verification document metadata
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    public static postVerificationMeDocuments(
        requestBody: {
            documentType: string;
            storageBucket: string;
            storageKey: string;
            fileName: string;
            mimeType: string;
            sizeBytes: number;
            checksumSha256: string;
        },
    ): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/verification/me/documents',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid document payload`,
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Submit verification for manual review
     * @returns any Operation successful
     * @throws ApiError
     */
    public static postVerificationMeSubmit(): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/verification/me/submit',
            errors: {
                400: `Verification is not ready for review`,
                401: `Missing or invalid token`,
            },
        });
    }
    /**
     * Administrative verification overview
     * @returns any Operation successful
     * @throws ApiError
     */
    public static getVerificationAdminOverview(): CancelablePromise<(StandardResponse & {
        data?: VerificationAdminOverview;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/verification/admin/overview',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Review verification submission
     * @param verificationId Verification record identifier
     * @param requestBody
     * @returns any Operation successful
     * @throws ApiError
     */
    public static postVerificationReview(
        verificationId: number,
        requestBody: VerificationReviewRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: VerificationSummary;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/verification/{verificationId}/review',
            path: {
                'verificationId': verificationId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid review payload`,
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Verification record not found`,
            },
        });
    }
    /**
     * Verification audit trail
     * @param verificationId Verification record identifier
     * @returns any Operation successful
     * @throws ApiError
     */
    public static getVerificationAudit(
        verificationId: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<VerificationAuditEntry>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/verification/{verificationId}/audit',
            path: {
                'verificationId': verificationId,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Verification record not found`,
            },
        });
    }
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
    public static getEbooks(
        search?: string,
        categories?: string,
        tags?: string,
        languages?: string,
        minPrice?: number,
        maxPrice?: number,
        limit?: number,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: Array<EbookListing>;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ebooks',
            query: {
                'search': search,
                'categories': categories,
                'tags': tags,
                'languages': languages,
                'minPrice': minPrice,
                'maxPrice': maxPrice,
                'limit': limit,
                'offset': offset,
            },
        });
    }
    /**
     * Create ebook listing
     * @param requestBody
     * @returns any Ebook listing created
     * @throws ApiError
     */
    public static postEbooks(
        requestBody: EbookCreateRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ebooks',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Asset not found`,
                409: `Listing already exists`,
                422: `Validation error`,
            },
        });
    }
    /**
     * List instructor ebook catalogue
     * @param status
     * @param search
     * @param limit
     * @param offset
     * @returns any Ebook catalogue fetched
     * @throws ApiError
     */
    public static getEbooksCatalogue(
        status?: string,
        search?: string,
        limit?: number,
        offset?: number,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookCatalogueResponse;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ebooks/catalogue',
            query: {
                'status': status,
                'search': search,
                'limit': limit,
                'offset': offset,
            },
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
            },
        });
    }
    /**
     * Update ebook listing
     * @param ebookId
     * @param requestBody
     * @returns any Ebook listing updated
     * @throws ApiError
     */
    public static patchEbooks(
        ebookId: string,
        requestBody: EbookUpdateRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/ebooks/{ebookId}',
            path: {
                'ebookId': ebookId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Ebook not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Update ebook publication state
     * @param ebookId
     * @param requestBody
     * @returns any Ebook state updated
     * @throws ApiError
     */
    public static postEbooksState(
        ebookId: string,
        requestBody: EbookStateRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ebooks/{ebookId}/state',
            path: {
                'ebookId': ebookId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Ebook not found`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Create ebook purchase intent
     * @param ebookId
     * @param requestBody
     * @returns any Purchase intent created
     * @throws ApiError
     */
    public static postEbooksPurchaseIntent(
        ebookId: string,
        requestBody: EbookPurchaseIntentRequest,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookPurchaseIntentResponse;
    })> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/ebooks/{ebookId}/purchase-intent',
            path: {
                'ebookId': ebookId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Missing or invalid token`,
                403: `Insufficient permissions`,
                404: `Ebook not found`,
                409: `Ebook unavailable`,
                422: `Validation error`,
            },
        });
    }
    /**
     * Retrieve ebook details
     * @param slug
     * @returns any Ebook fetched
     * @throws ApiError
     */
    public static getEbooksSlug(
        slug: string,
    ): CancelablePromise<(StandardResponse & {
        data?: EbookListing;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/ebooks/slug/{slug}',
            path: {
                'slug': slug,
            },
            errors: {
                404: `Ebook not found`,
            },
        });
    }
    /**
     * Capability manifest and service health
     * Returns aggregated readiness, incident, and capability exposure data so clients can render service health indicators and gate features consistently.
     * @returns any Capability manifest generated successfully.
     * @throws ApiError
     */
    public static getRuntimeCapabilityManifest(): CancelablePromise<(StandardResponse & {
        data?: CapabilityManifest;
    })> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/runtime/manifest',
            errors: {
                500: `Capability manifest could not be generated.`,
            },
        });
    }
}
