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
//# sourceMappingURL=ObservabilitySloIndicator.d.ts.map