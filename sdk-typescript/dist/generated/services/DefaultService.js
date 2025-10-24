import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Health probe
     * @returns StandardResponse API is healthy
     * @throws ApiError
     */
    static getHealth() {
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
    static postPayments(requestBody) {
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
    static postPaymentsPaypalCapture(paymentId) {
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
    static postPaymentsRefunds(paymentId, requestBody) {
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
    static getPaymentsReportsSummary(currency, startDate, endDate) {
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
    static getPaymentsCoupons(code) {
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
    static postPaymentsWebhooksStripe(requestBody) {
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
    static postAuthRegister(requestBody) {
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
    static postAuthLogin(requestBody) {
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
    static postAuthRefresh(requestBody) {
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
    static postAuthLogout() {
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
    static postAuthLogoutAll(requestBody) {
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
    static getUsersMe() {
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
    static getUsers(limit = 20, offset) {
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
    static getDashboardMe() {
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
    static getCommunities() {
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
    static postCommunities(requestBody) {
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
    static getCommunitiesFeed(page = 1, perPage = 10, postType, visibility) {
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
    static getCommunities1(communityId) {
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
    static getCommunitiesPosts(communityId, page = 1, perPage = 10, channelId, postType) {
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
    static postCommunitiesPosts(communityId, requestBody) {
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
    static getCommunitiesResources(communityId, limit = 10, offset, resourceType) {
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
    static postCommunitiesResources(communityId, requestBody) {
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
    static getCommunitiesChatChannels(communityId) {
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
    static getCommunitiesChatChannelsMessages(communityId, channelId, limit = 50, before, after, threadRootId, includeHidden = false) {
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
    static postCommunitiesChatChannelsMessages(communityId, channelId, requestBody) {
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
    static postCommunitiesChatChannelsRead(communityId, channelId, requestBody) {
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
    static postCommunitiesChatChannelsMessagesReactions(communityId, channelId, messageId, requestBody) {
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
    static deleteCommunitiesChatChannelsMessagesReactions(communityId, channelId, messageId, requestBody) {
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
    static postCommunitiesChatChannelsMessagesModerate(communityId, channelId, messageId, requestBody) {
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
    static getCommunitiesChatPresence(communityId) {
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
    static postCommunitiesChatPresence(communityId, requestBody) {
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
    static getCommunitiesEngagementProgress(communityId) {
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
    static postCommunitiesEngagementPoints(communityId, requestBody) {
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
    static postCommunitiesEngagementStreaksCheckIn(communityId, requestBody) {
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
    static getCommunitiesEngagementLeaderboard(communityId, type = 'points', limit = 20, offset) {
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
    static getCommunitiesEvents(communityId, from, to, limit = 50, offset, status, visibility, order) {
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
    static postCommunitiesEvents(communityId, requestBody) {
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
    static postCommunitiesEventsRsvp(communityId, eventId, requestBody) {
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
    static postCommunitiesEventsReminders(communityId, eventId, requestBody) {
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
    static getCommunitiesCalendar(communityId, month, year, visibility) {
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
    static getContentAssets(page = 1, pageSize = 20, status, type) {
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
    static postContentAssetsUploadSession(requestBody) {
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
    static postContentAssetsIngest(assetId, requestBody) {
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
    static getContentAssets1(assetId) {
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
    static getContentAssetsViewerToken(assetId) {
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
    static getContentAssetsProgress(assetId) {
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
    static postContentAssetsProgress(assetId, requestBody) {
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
    static postContentAssetsEvents(assetId, requestBody) {
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
    static getContentAssetsAnalytics(assetId) {
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
    static postAuthVerifyEmail(requestBody) {
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
    static postAuthResendVerification(requestBody) {
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
    static getChatThreads(limit = 20, offset) {
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
    static postChatThreads(requestBody) {
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
    static getChatThreadsMessages(threadId, limit = 50, before, after) {
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
    static postChatThreadsMessages(threadId, requestBody) {
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
    static postChatThreadsRead(threadId, requestBody) {
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
    static getSocialFollowers(limit, offset, status, search) {
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
    static getSocialUsersFollowers(userId, limit, offset, status, search) {
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
    static getSocialFollowing(limit, offset, status, search) {
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
    static getSocialUsersFollowing(userId, limit, offset, status, search) {
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
    static getSocialRecommendations(limit) {
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
    static postSocialFollows(userId, requestBody) {
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
    static deleteSocialFollows(userId) {
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
    static postSocialUsersFollowersApprove(userId, followerId) {
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
    static postSocialUsersFollowersDecline(userId, followerId) {
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
    static postSocialMutes(userId, requestBody) {
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
    static deleteSocialMutes(userId) {
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
    static postSocialBlocks(userId, requestBody) {
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
    static deleteSocialBlocks(userId) {
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
    static getSocialPrivacy() {
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
    static putSocialPrivacy(requestBody) {
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
    static getSocialUsersPrivacy(userId) {
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
    static putSocialUsersPrivacy(userId, requestBody) {
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
    static getFeed(context = 'global', community, page = 1, perPage = 20, includeAnalytics = true, includeHighlights = true, range = '30d', search, postType) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/feed',
            query: {
                'context': context,
                'community': community,
                'page': page,
                'perPage': perPage,
                'includeAnalytics': includeAnalytics,
                'includeHighlights': includeHighlights,
                'range': range,
                'search': search,
                'postType': postType,
            },
            errors: {
                401: `Authentication required`,
                403: `Feed capability disabled`,
            },
        });
    }
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
    static getFeedAnalytics(context = 'global', community, range = '30d', search, postType) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/feed/analytics',
            query: {
                'context': context,
                'community': community,
                'range': range,
                'search': search,
                'postType': postType,
            },
            errors: {
                401: `Authentication required`,
                403: `Feed capability disabled`,
            },
        });
    }
    /**
     * Resolve eligible ad placements
     * Returns ad placements ranked for the supplied feed context.
     * @param context
     * @param limit
     * @param keywords Comma separated keyword hints to improve targeting matches.
     * @returns FeedPlacementsResponse Eligible placements resolved
     * @throws ApiError
     */
    static getFeedPlacements(context = 'global_feed', limit = 3, keywords) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/feed/placements',
            query: {
                'context': context,
                'limit': limit,
                'keywords': keywords,
            },
            errors: {
                401: `Authentication required`,
            },
        });
    }
    /**
     * Identity verification summary
     * @returns any Operation successful
     * @throws ApiError
     */
    static getVerificationMe() {
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
    static postVerificationMeUploadRequests(requestBody) {
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
    static postVerificationMeDocuments(requestBody) {
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
    static postVerificationMeSubmit() {
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
    static getVerificationAdminOverview() {
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
    static postVerificationReview(verificationId, requestBody) {
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
    static getVerificationAudit(verificationId) {
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
    static getEbooks(search, categories, tags, languages, minPrice, maxPrice, limit, offset) {
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
    static postEbooks(requestBody) {
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
    static getEbooksCatalogue(status, search, limit, offset) {
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
    static patchEbooks(ebookId, requestBody) {
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
    static postEbooksState(ebookId, requestBody) {
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
    static postEbooksPurchaseIntent(ebookId, requestBody) {
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
    static getEbooksSlug(slug) {
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
    static getRuntimeCapabilityManifest() {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/runtime/manifest',
            errors: {
                500: `Capability manifest could not be generated.`,
            },
        });
    }
    /**
     * Fetch creation studio recommendations
     * Returns prioritised actions for instructors based on project lifecycle, marketing coverage, and recency signals. Evaluations are gated by the `creation.recommendations` feature flag.
     * @param limit Maximum number of recommendations to return (default 5).
     * @param includeHistory When true, include recent generation metadata for observability.
     * @param ownerId Admin-only override to evaluate recommendations for a specific instructor.
     * @returns CreationRecommendationResponse Recommendations generated
     * @throws ApiError
     */
    static getCreationRecommendations(limit, includeHistory, ownerId) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/creation/recommendations',
            query: {
                'limit': limit,
                'includeHistory': includeHistory,
                'ownerId': ownerId,
            },
            errors: {
                401: `Unauthorised`,
                403: `Insufficient permissions`,
                422: `Validation error`,
            },
        });
    }
}
//# sourceMappingURL=DefaultService.js.map