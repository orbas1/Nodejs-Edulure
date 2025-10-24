export type ReleaseChecklistItem = {
    slug: string;
    category: 'quality' | 'security' | 'observability' | 'compliance' | 'change_management';
    title: string;
    description: string;
    autoEvaluated: boolean;
    weight: number;
    defaultOwnerEmail?: string | null;
    successCriteria: Record<string, any>;
};
//# sourceMappingURL=ReleaseChecklistItem.d.ts.map