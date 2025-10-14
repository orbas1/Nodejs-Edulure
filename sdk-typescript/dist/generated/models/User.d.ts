export type User = {
    id: number;
    firstName: string;
    lastName?: string | null;
    email: string;
    role: 'user' | 'instructor' | 'admin';
    age?: number | null;
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
    } | null;
    /**
     * Indicates whether multi-factor authentication is enabled for the account.
     */
    twoFactorEnabled?: boolean;
    /**
     * Timestamp of initial multi-factor enrollment.
     */
    twoFactorEnrolledAt?: string | null;
    /**
     * Timestamp of the last successful multi-factor verification.
     */
    twoFactorLastVerifiedAt?: string | null;
    createdAt: string;
    updatedAt: string;
    emailVerifiedAt?: string | null;
    lastLoginAt?: string | null;
};
//# sourceMappingURL=User.d.ts.map