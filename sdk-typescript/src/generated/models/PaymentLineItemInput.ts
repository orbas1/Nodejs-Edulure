/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PaymentLineItemInput = {
    id?: string | null;
    name?: string | null;
    description?: string | null;
    /**
     * Unit price in cents.
     */
    unitAmount: number;
    quantity?: number;
    taxExempt?: boolean;
    metadata?: Record<string, any> | null;
};

