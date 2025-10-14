import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommunitiesService {
    /**
     * List community roles
     * @param communityId
     * @returns any Roles fetched
     * @throws ApiError
     */
    static getCommunitiesRoles(communityId) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/roles',
            path: {
                'communityId': communityId,
            },
        });
    }
    /**
     * Create community role
     * @param communityId
     * @param requestBody
     * @returns any Role created
     * @throws ApiError
     */
    static postCommunitiesRoles(communityId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/roles',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Assign community member role
     * @param communityId
     * @param userId
     * @param requestBody
     * @returns any Role updated
     * @throws ApiError
     */
    static patchCommunitiesMembersRole(communityId, userId, requestBody) {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/communities/{communityId}/members/{userId}/role',
            path: {
                'communityId': communityId,
                'userId': userId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List community paywall tiers
     * @param communityId
     * @param includeInactive
     * @returns any Paywall tiers fetched
     * @throws ApiError
     */
    static getCommunitiesPaywallTiers(communityId, includeInactive) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/paywall/tiers',
            path: {
                'communityId': communityId,
            },
            query: {
                'includeInactive': includeInactive,
            },
        });
    }
    /**
     * Create paywall tier
     * @param communityId
     * @param requestBody
     * @returns any Tier created
     * @throws ApiError
     */
    static postCommunitiesPaywallTiers(communityId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/paywall/tiers',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update paywall tier
     * @param communityId
     * @param tierId
     * @param requestBody
     * @returns any Tier updated
     * @throws ApiError
     */
    static patchCommunitiesPaywallTiers(communityId, tierId, requestBody) {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/communities/{communityId}/paywall/tiers/{tierId}',
            path: {
                'communityId': communityId,
                'tierId': tierId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Start subscription checkout
     * @param communityId
     * @param requestBody
     * @returns any Checkout started
     * @throws ApiError
     */
    static postCommunitiesPaywallCheckout(communityId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/paywall/checkout',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List my community subscriptions
     * @param communityId
     * @returns any Subscriptions fetched
     * @throws ApiError
     */
    static getCommunitiesSubscriptionsMe(communityId) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/subscriptions/me',
            path: {
                'communityId': communityId,
            },
        });
    }
    /**
     * Cancel community subscription
     * @param communityId
     * @param subscriptionId
     * @param requestBody
     * @returns any Subscription updated
     * @throws ApiError
     */
    static postCommunitiesSubscriptionsCancel(communityId, subscriptionId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/subscriptions/{subscriptionId}/cancel',
            path: {
                'communityId': communityId,
                'subscriptionId': subscriptionId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * List community affiliates
     * @param communityId
     * @param status
     * @returns any Affiliates fetched
     * @throws ApiError
     */
    static getCommunitiesAffiliates(communityId, status) {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/communities/{communityId}/affiliates',
            path: {
                'communityId': communityId,
            },
            query: {
                'status': status,
            },
        });
    }
    /**
     * Apply to community affiliate program
     * @param communityId
     * @param requestBody
     * @returns any Affiliate application created
     * @throws ApiError
     */
    static postCommunitiesAffiliatesApply(communityId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/affiliates/apply',
            path: {
                'communityId': communityId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Update community affiliate
     * @param communityId
     * @param affiliateId
     * @param requestBody
     * @returns any Affiliate updated
     * @throws ApiError
     */
    static patchCommunitiesAffiliates(communityId, affiliateId, requestBody) {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/communities/{communityId}/affiliates/{affiliateId}',
            path: {
                'communityId': communityId,
                'affiliateId': affiliateId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Record affiliate payout
     * @param communityId
     * @param affiliateId
     * @param requestBody
     * @returns any Payout recorded
     * @throws ApiError
     */
    static postCommunitiesAffiliatesPayouts(communityId, affiliateId, requestBody) {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/communities/{communityId}/affiliates/{affiliateId}/payouts',
            path: {
                'communityId': communityId,
                'affiliateId': affiliateId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
//# sourceMappingURL=CommunitiesService.js.map