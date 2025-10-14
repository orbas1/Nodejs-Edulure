import type { ExplorerAnalyticsAdsSummary } from './ExplorerAnalyticsAdsSummary';
import type { ExplorerAnalyticsAlert } from './ExplorerAnalyticsAlert';
import type { ExplorerAnalyticsEntityBreakdown } from './ExplorerAnalyticsEntityBreakdown';
import type { ExplorerAnalyticsExperiment } from './ExplorerAnalyticsExperiment';
import type { ExplorerAnalyticsForecastEntry } from './ExplorerAnalyticsForecastEntry';
import type { ExplorerAnalyticsQueryMetric } from './ExplorerAnalyticsQueryMetric';
import type { ExplorerAnalyticsRange } from './ExplorerAnalyticsRange';
import type { ExplorerAnalyticsTimeseriesPoint } from './ExplorerAnalyticsTimeseriesPoint';
import type { ExplorerAnalyticsTotals } from './ExplorerAnalyticsTotals';
export type ExplorerAnalyticsSummary = {
    range: ExplorerAnalyticsRange;
    totals: ExplorerAnalyticsTotals;
    entityBreakdown: Array<ExplorerAnalyticsEntityBreakdown>;
    timeseries: Array<ExplorerAnalyticsTimeseriesPoint>;
    topQueries: Array<ExplorerAnalyticsQueryMetric>;
    zeroResultQueries?: Array<ExplorerAnalyticsQueryMetric>;
    ads: ExplorerAnalyticsAdsSummary;
    experiments?: Array<ExplorerAnalyticsExperiment>;
    forecasts: {
        searchVolume?: Array<ExplorerAnalyticsForecastEntry>;
        clickThroughRate?: Array<ExplorerAnalyticsForecastEntry>;
    };
    alerts: Array<ExplorerAnalyticsAlert>;
};
//# sourceMappingURL=ExplorerAnalyticsSummary.d.ts.map