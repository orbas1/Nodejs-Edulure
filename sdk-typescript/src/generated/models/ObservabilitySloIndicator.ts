/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ObservabilitySloIndicator = {
    type: 'http';
    routePattern: string;
    routePatternFlags?: string;
    methodWhitelist?: Array<string>;
    excludeRoutePatterns?: Array<string>;
    treat4xxAsFailures?: boolean;
    failureStatusCodes?: Array<number>;
    successStatusCodes?: Array<number>;
};

