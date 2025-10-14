/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CommunityAffiliate } from '../models/CommunityAffiliate';
import type { CommunityAffiliatePayout } from '../models/CommunityAffiliatePayout';
import type { CommunityPaywallTier } from '../models/CommunityPaywallTier';
import type { CommunityPaywallTierInput } from '../models/CommunityPaywallTierInput';
import type { CommunityPaywallTierUpdateInput } from '../models/CommunityPaywallTierUpdateInput';
import type { CommunityRoleAssignment } from '../models/CommunityRoleAssignment';
import type { CommunityRoleCollection } from '../models/CommunityRoleCollection';
import type { CommunityRoleDefinition } from '../models/CommunityRoleDefinition';
import type { CommunitySubscription } from '../models/CommunitySubscription';
import type { CommunitySubscriptionCheckoutResponse } from '../models/CommunitySubscriptionCheckoutResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CommunitiesService {
    /**
     * List community roles
     * @param communityId
     * @returns any Roles fetched
     * @throws ApiError
     */
    public static getCommunitiesRoles(
        communityId: string,
    ): CancelablePromise<{
        success: boolean;
        data: CommunityRoleCollection;
        message?: string;
    }> {
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
    public static postCommunitiesRoles(
        communityId: string,
        requestBody: {
            name: string;
            roleKey?: string;
            description?: string;
            permissions?: Record<string, any>;
            isDefaultAssignable?: boolean;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunityRoleDefinition;
        message?: string;
    }> {
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
    public static patchCommunitiesMembersRole(
        communityId: string,
        userId: number,
        requestBody: {
            roleKey: string;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunityRoleAssignment;
        message?: string;
    }> {
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
    public static getCommunitiesPaywallTiers(
        communityId: string,
        includeInactive?: boolean,
    ): CancelablePromise<{
        success: boolean;
        data: Array<CommunityPaywallTier>;
        message?: string;
    }> {
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
    public static postCommunitiesPaywallTiers(
        communityId: string,
        requestBody: CommunityPaywallTierInput,
    ): CancelablePromise<{
        success: boolean;
        data: CommunityPaywallTier;
        message?: string;
    }> {
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
    public static patchCommunitiesPaywallTiers(
        communityId: string,
        tierId: number,
        requestBody: CommunityPaywallTierUpdateInput,
    ): CancelablePromise<{
        success: boolean;
        data: CommunityPaywallTier;
        message?: string;
    }> {
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
    public static postCommunitiesPaywallCheckout(
        communityId: string,
        requestBody: {
            tierId: number;
            provider: string;
            couponCode?: string;
            tax?: Record<string, any>;
            receiptEmail?: string;
            affiliateCode?: string;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunitySubscriptionCheckoutResponse;
        message?: string;
    }> {
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
    public static getCommunitiesSubscriptionsMe(
        communityId: string,
    ): CancelablePromise<{
        success: boolean;
        data: Array<CommunitySubscription>;
        message?: string;
    }> {
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
    public static postCommunitiesSubscriptionsCancel(
        communityId: string,
        subscriptionId: string,
        requestBody?: {
            cancelAtPeriodEnd?: boolean;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunitySubscription;
        message?: string;
    }> {
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
    public static getCommunitiesAffiliates(
        communityId: string,
        status?: string,
    ): CancelablePromise<{
        success: boolean;
        data: Array<CommunityAffiliate>;
        message?: string;
    }> {
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
    public static postCommunitiesAffiliatesApply(
        communityId: string,
        requestBody?: {
            referralCode?: string;
            commissionRateBasisPoints?: number;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliate;
        message?: string;
    }> {
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
    public static patchCommunitiesAffiliates(
        communityId: string,
        affiliateId: number,
        requestBody: {
            status?: string;
            commissionRateBasisPoints?: number;
            referralCode?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliate;
        message?: string;
    }> {
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
    public static postCommunitiesAffiliatesPayouts(
        communityId: string,
        affiliateId: number,
        requestBody: {
            amountCents: number;
            status?: string;
            payoutReference?: string;
            scheduledAt?: string;
            processedAt?: string;
            failureReason?: string;
            metadata?: Record<string, any>;
        },
    ): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliatePayout;
        message?: string;
    }> {
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
