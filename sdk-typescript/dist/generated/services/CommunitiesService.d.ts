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
export declare class CommunitiesService {
    /**
     * List community roles
     * @param communityId
     * @returns any Roles fetched
     * @throws ApiError
     */
    static getCommunitiesRoles(communityId: string): CancelablePromise<{
        success: boolean;
        data: CommunityRoleCollection;
        message?: string;
    }>;
    /**
     * Create community role
     * @param communityId
     * @param requestBody
     * @returns any Role created
     * @throws ApiError
     */
    static postCommunitiesRoles(communityId: string, requestBody: {
        name: string;
        roleKey?: string;
        description?: string;
        permissions?: Record<string, any>;
        isDefaultAssignable?: boolean;
    }): CancelablePromise<{
        success: boolean;
        data: CommunityRoleDefinition;
        message?: string;
    }>;
    /**
     * Assign community member role
     * @param communityId
     * @param userId
     * @param requestBody
     * @returns any Role updated
     * @throws ApiError
     */
    static patchCommunitiesMembersRole(communityId: string, userId: number, requestBody: {
        roleKey: string;
    }): CancelablePromise<{
        success: boolean;
        data: CommunityRoleAssignment;
        message?: string;
    }>;
    /**
     * List community paywall tiers
     * @param communityId
     * @param includeInactive
     * @returns any Paywall tiers fetched
     * @throws ApiError
     */
    static getCommunitiesPaywallTiers(communityId: string, includeInactive?: boolean): CancelablePromise<{
        success: boolean;
        data: Array<CommunityPaywallTier>;
        message?: string;
    }>;
    /**
     * Create paywall tier
     * @param communityId
     * @param requestBody
     * @returns any Tier created
     * @throws ApiError
     */
    static postCommunitiesPaywallTiers(communityId: string, requestBody: CommunityPaywallTierInput): CancelablePromise<{
        success: boolean;
        data: CommunityPaywallTier;
        message?: string;
    }>;
    /**
     * Update paywall tier
     * @param communityId
     * @param tierId
     * @param requestBody
     * @returns any Tier updated
     * @throws ApiError
     */
    static patchCommunitiesPaywallTiers(communityId: string, tierId: number, requestBody: CommunityPaywallTierUpdateInput): CancelablePromise<{
        success: boolean;
        data: CommunityPaywallTier;
        message?: string;
    }>;
    /**
     * Start subscription checkout
     * @param communityId
     * @param requestBody
     * @returns any Checkout started
     * @throws ApiError
     */
    static postCommunitiesPaywallCheckout(communityId: string, requestBody: {
        tierId: number;
        provider: string;
        couponCode?: string;
        tax?: Record<string, any>;
        receiptEmail?: string;
        affiliateCode?: string;
    }): CancelablePromise<{
        success: boolean;
        data: CommunitySubscriptionCheckoutResponse;
        message?: string;
    }>;
    /**
     * List my community subscriptions
     * @param communityId
     * @returns any Subscriptions fetched
     * @throws ApiError
     */
    static getCommunitiesSubscriptionsMe(communityId: string): CancelablePromise<{
        success: boolean;
        data: Array<CommunitySubscription>;
        message?: string;
    }>;
    /**
     * Cancel community subscription
     * @param communityId
     * @param subscriptionId
     * @param requestBody
     * @returns any Subscription updated
     * @throws ApiError
     */
    static postCommunitiesSubscriptionsCancel(communityId: string, subscriptionId: string, requestBody?: {
        cancelAtPeriodEnd?: boolean;
    }): CancelablePromise<{
        success: boolean;
        data: CommunitySubscription;
        message?: string;
    }>;
    /**
     * List community affiliates
     * @param communityId
     * @param status
     * @returns any Affiliates fetched
     * @throws ApiError
     */
    static getCommunitiesAffiliates(communityId: string, status?: string): CancelablePromise<{
        success: boolean;
        data: Array<CommunityAffiliate>;
        message?: string;
    }>;
    /**
     * Apply to community affiliate program
     * @param communityId
     * @param requestBody
     * @returns any Affiliate application created
     * @throws ApiError
     */
    static postCommunitiesAffiliatesApply(communityId: string, requestBody?: {
        referralCode?: string;
        commissionRateBasisPoints?: number;
        metadata?: Record<string, any>;
    }): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliate;
        message?: string;
    }>;
    /**
     * Update community affiliate
     * @param communityId
     * @param affiliateId
     * @param requestBody
     * @returns any Affiliate updated
     * @throws ApiError
     */
    static patchCommunitiesAffiliates(communityId: string, affiliateId: number, requestBody: {
        status?: string;
        commissionRateBasisPoints?: number;
        referralCode?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliate;
        message?: string;
    }>;
    /**
     * Record affiliate payout
     * @param communityId
     * @param affiliateId
     * @param requestBody
     * @returns any Payout recorded
     * @throws ApiError
     */
    static postCommunitiesAffiliatesPayouts(communityId: string, affiliateId: number, requestBody: {
        amountCents: number;
        status?: string;
        payoutReference?: string;
        scheduledAt?: string;
        processedAt?: string;
        failureReason?: string;
        metadata?: Record<string, any>;
    }): CancelablePromise<{
        success: boolean;
        data: CommunityAffiliatePayout;
        message?: string;
    }>;
}
//# sourceMappingURL=CommunitiesService.d.ts.map