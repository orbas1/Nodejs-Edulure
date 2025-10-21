import { httpClient } from './httpClient.js';

function ensureArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (!value) {
    return [];
  }
  return [value].filter(Boolean);
}

function unwrapPayload(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
    return payload.data;
  }
  return payload ?? {};
}

function normaliseKpi(metric, index) {
  const id = metric?.id ?? metric?.metric ?? `kpi-${index}`;
  const direction = metric?.direction ?? (metric?.change ?? 0) >= 0 ? 'up' : 'down';
  const change = Number.isFinite(metric?.change) ? metric.change : null;
  return {
    id,
    label: metric?.label ?? metric?.name ?? 'Metric',
    value: metric?.value ?? 0,
    unit: metric?.unit ?? null,
    change,
    direction,
    target: metric?.target ?? null,
    formatter: metric?.formatter ?? metric?.format ?? null,
    trend: ensureArray(metric?.trend ?? metric?.sparkline)
  };
}

function normaliseTimelineEntry(entry, index) {
  return {
    id: entry?.id ?? entry?.eventId ?? `timeline-${index}`,
    incidentId: entry?.incidentId ?? entry?.incidentUuid ?? null,
    timestamp: entry?.timestamp ?? entry?.occurredAt ?? entry?.createdAt ?? null,
    severity: entry?.severity ?? entry?.level ?? 'info',
    label: entry?.label ?? entry?.title ?? 'Timeline update',
    description: entry?.description ?? entry?.summary ?? entry?.message ?? null,
    actor: entry?.actor ?? entry?.author ?? null
  };
}

function normaliseIncident(incident, index) {
  return {
    id: incident?.id ?? incident?.incidentUuid ?? `incident-${index}`,
    reference: incident?.reference ?? incident?.ticket ?? `INC-${index}`,
    severity: incident?.severity ?? incident?.level ?? 'medium',
    summary: incident?.summary ?? incident?.description ?? null,
    owner: incident?.owner ?? incident?.assignee ?? null,
    status: incident?.status ?? 'investigating',
    openedAt: incident?.openedAt ?? incident?.createdAt ?? null,
    acknowledgedAt: incident?.acknowledgedAt ?? null,
    watchers: incident?.watchers ?? incident?.subscriberCount ?? 0,
    resolutionTargetAt: incident?.resolutionTargetAt ?? null,
    resolutionBreached: Boolean(incident?.resolutionBreached),
    recommendedActions: ensureArray(incident?.recommendedActions)
  };
}

function normaliseRelease(release, index) {
  return {
    id: release?.id ?? release?.releaseId ?? `release-${index}`,
    name: release?.name ?? release?.train ?? 'Release',
    version: release?.version ?? release?.tag ?? null,
    windowStart: release?.windowStart ?? release?.startAt ?? null,
    windowEnd: release?.windowEnd ?? release?.endAt ?? null,
    owner: release?.owner ?? release?.manager ?? null,
    status: release?.status ?? 'scheduled',
    risk: release?.risk ?? release?.riskLevel ?? 'medium',
    approvalsPending: release?.approvalsPending ?? 0,
    healthScore: release?.healthScore ?? null,
    checklist: ensureArray(release?.checklist ?? release?.gates)
  };
}

function normaliseAlert(alert, index) {
  return {
    id: alert?.id ?? alert?.alertId ?? `alert-${index}`,
    level: alert?.level ?? alert?.severity ?? 'info',
    title: alert?.title ?? alert?.name ?? 'Alert',
    description: alert?.description ?? alert?.message ?? null,
    link: alert?.link ?? alert?.url ?? null,
    createdAt: alert?.createdAt ?? alert?.timestamp ?? null
  };
}

function normaliseDependency(dep, index) {
  return {
    id: dep?.id ?? dep?.service ?? `dependency-${index}`,
    name: dep?.name ?? dep?.service ?? 'Dependency',
    status: dep?.status ?? 'operational',
    summary: dep?.summary ?? dep?.description ?? null,
    lastCheckedAt: dep?.lastCheckedAt ?? dep?.checkedAt ?? null
  };
}

function normaliseOperations(operations = {}) {
  return {
    backlog: operations.backlog ?? 0,
    ackMinutes: operations.ackMinutes ?? operations.meanTimeToAcknowledge ?? null,
    resolutionMinutes: operations.resolutionMinutes ?? operations.meanTimeToResolve ?? null,
    mttrMinutes: operations.mttrMinutes ?? operations.meanTimeToRestore ?? null,
    automationCoverage: operations.automationCoverage ?? null,
    onCall: operations.onCall ?? operations.oncall ?? null,
    readiness: operations.readiness ?? null,
    dependencies: ensureArray(operations.dependencies).map(normaliseDependency)
  };
}

function normaliseExecutiveOverview(rawPayload = {}) {
  const payload = unwrapPayload(rawPayload);
  const kpis = ensureArray(payload.kpis).map(normaliseKpi);
  const incidentsRaw = payload.incidents ?? {};
  const releasesRaw = payload.releases ?? {};

  return {
    generatedAt: payload.generatedAt ?? payload.updatedAt ?? null,
    kpis,
    alerts: ensureArray(payload.alerts).map(normaliseAlert),
    incidents: {
      stats: incidentsRaw.stats ?? incidentsRaw.summary ?? {},
      active: ensureArray(incidentsRaw.active).map(normaliseIncident),
      timeline: ensureArray(incidentsRaw.timeline).map(normaliseTimelineEntry)
    },
    releases: {
      upcoming: ensureArray(releasesRaw.upcoming).map(normaliseRelease),
      history: ensureArray(releasesRaw.history).map(normaliseRelease),
      readiness: releasesRaw.readiness ?? releasesRaw.summary ?? {}
    },
    operations: normaliseOperations(payload.operations),
    sustainability: payload.sustainability ?? null
  };
}

function normaliseTenants(rawPayload = {}) {
  const payload = unwrapPayload(rawPayload);
  const tenants = ensureArray(payload.items ?? payload.tenants).map((tenant, index) => ({
    id: tenant?.id ?? tenant?.tenantId ?? `tenant-${index}`,
    name: tenant?.name ?? tenant?.label ?? tenant?.slug ?? 'Tenant',
    status: tenant?.status ?? tenant?.state ?? 'active',
    region: tenant?.region ?? tenant?.timezone ?? null
  }));

  return {
    items: tenants,
    defaultTenantId: payload.defaultTenantId ?? payload.default ?? tenants[0]?.id ?? null
  };
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalisePercentage(value, fallback = null) {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  if (Math.abs(numeric) > 1.0001) {
    return numeric / 100;
  }
  return numeric;
}

function normaliseMoney(amount, defaultCurrency = 'USD') {
  if (amount === null || amount === undefined) {
    return { amount: 0, currency: defaultCurrency };
  }

  if (typeof amount === 'number') {
    return { amount, currency: defaultCurrency };
  }

  if (typeof amount === 'string') {
    const numeric = Number(amount);
    return { amount: Number.isFinite(numeric) ? numeric : 0, currency: defaultCurrency };
  }

  const currency = amount.currency ?? amount.unit ?? defaultCurrency;
  const value = amount.value ?? amount.amount ?? amount.total ?? amount.net ?? amount.gross ?? 0;
  const numeric = Number(value);
  return {
    amount: Number.isFinite(numeric) ? numeric : 0,
    currency
  };
}

function normaliseSupportTicket(ticket, index) {
  const requester = ticket?.requester ?? ticket?.customer ?? {};
  const assignee = ticket?.assignee ?? ticket?.agent ?? null;
  return {
    id: ticket?.id ?? ticket?.ticketId ?? `ticket-${index}`,
    reference: ticket?.reference ?? ticket?.externalId ?? `SUP-${index}`,
    subject: ticket?.subject ?? ticket?.title ?? 'Support request',
    priority: ticket?.priority ?? ticket?.urgency ?? 'medium',
    status: ticket?.status ?? 'open',
    channel: ticket?.channel ?? ticket?.source ?? 'email',
    slaBreached: Boolean(ticket?.slaBreached ?? ticket?.breachedSla ?? false),
    waitingSince: ticket?.waitingSince ?? ticket?.createdAt ?? null,
    lastUpdated: ticket?.updatedAt ?? null,
    sentiment: ticket?.sentiment ?? null,
    unreadMessages: Number.isFinite(Number(ticket?.unreadMessages))
      ? Number(ticket?.unreadMessages)
      : 0,
    tags: ensureArray(ticket?.tags ?? ticket?.labels),
    requester: {
      id: requester?.id ?? requester?.userId ?? null,
      name: requester?.name ?? requester?.displayName ?? 'Customer',
      organisation: requester?.organisation ?? requester?.company ?? null,
      email: requester?.email ?? null
    },
    assignee: assignee
      ? {
          id: assignee?.id ?? assignee?.userId ?? null,
          name: assignee?.name ?? assignee?.displayName ?? 'Unassigned',
          email: assignee?.email ?? null
        }
      : null,
    escalationLevel: ticket?.escalationLevel ?? ticket?.tier ?? 'L1'
  };
}

function normaliseCommunication(communication, index) {
  return {
    id: communication?.id ?? communication?.announcementId ?? `broadcast-${index}`,
    title: communication?.title ?? communication?.subject ?? 'Announcement',
    channel: communication?.channel ?? communication?.medium ?? 'in-app',
    status: communication?.status ?? 'scheduled',
    audienceSize: Number.isFinite(Number(communication?.audienceSize))
      ? Number(communication?.audienceSize)
      : null,
    scheduledAt: communication?.scheduledAt ?? communication?.sendAt ?? null,
    createdAt: communication?.createdAt ?? null,
    author: communication?.author ?? communication?.createdBy ?? null
  };
}

function normaliseKnowledgeArticle(article, index) {
  return {
    id: article?.id ?? article?.articleId ?? `article-${index}`,
    title: article?.title ?? article?.name ?? 'Article',
    category: article?.category ?? article?.section ?? null,
    lastUpdated: article?.updatedAt ?? article?.lastReviewedAt ?? null,
    pendingReview: Boolean(article?.pendingReview ?? article?.needsReview ?? false),
    flaggedIssues: ensureArray(article?.flags).map((flag, flagIndex) => ({
      id: flag?.id ?? `flag-${index}-${flagIndex}`,
      type: flag?.type ?? 'issue',
      summary: flag?.summary ?? flag?.reason ?? 'Review requested'
    }))
  };
}

function normaliseNotificationPolicy(policy, index) {
  const channels = policy?.channels ?? policy?.delivery ?? {};
  return {
    id: policy?.id ?? policy?.policyId ?? `policy-${index}`,
    name: policy?.name ?? policy?.label ?? 'Notification policy',
    description: policy?.description ?? null,
    slaMinutes: Number.isFinite(Number(policy?.slaMinutes))
      ? Number(policy?.slaMinutes)
      : Number.isFinite(Number(policy?.responseMinutes))
      ? Number(policy?.responseMinutes)
      : null,
    channels: {
      email: Boolean(channels?.email ?? channels?.mail ?? false),
      sms: Boolean(channels?.sms ?? false),
      push: Boolean(channels?.push ?? channels?.mobile ?? false),
      inApp: Boolean(channels?.inApp ?? channels?.inbox ?? true)
    },
    escalationTargets: ensureArray(policy?.escalationTargets ?? policy?.escalations).map((target, targetIndex) => ({
      id: target?.id ?? target?.targetId ?? `target-${index}-${targetIndex}`,
      name: target?.name ?? target?.label ?? 'Escalation target',
      type: target?.type ?? 'team',
      contact: target?.contact ?? target?.email ?? null
    })),
    updatedAt: policy?.updatedAt ?? policy?.lastUpdatedAt ?? policy?.modifiedAt ?? null
  };
}

function normaliseSupportOverview(rawPayload = {}) {
  const payload = unwrapPayload(rawPayload);
  const queue = payload.queue ?? payload.tickets ?? {};
  const stats = queue.stats ?? {};
  const communications = payload.communications ?? {};
  const knowledgeBase = payload.knowledgeBase ?? payload.kb ?? {};
  const automation = payload.automation ?? payload.workflows ?? {};
  const settings = payload.settings ?? payload.preferences ?? {};
  const onboarding = payload.onboarding ?? payload.guides ?? {};

  return {
    generatedAt: payload.generatedAt ?? payload.updatedAt ?? null,
    queue: {
      stats: {
        open: toNumber(stats.open ?? stats.totalOpen ?? 0),
        breached: toNumber(stats.breached ?? stats.slaBreached ?? 0),
        awaitingAssignment: toNumber(stats.awaitingAssignment ?? stats.unassigned ?? 0),
        firstResponseMinutes: toNumber(stats.firstResponseMinutes ?? stats.firstResponseTargetMinutes ?? null, null),
        resolutionMinutes: toNumber(stats.resolutionMinutes ?? stats.resolutionTargetMinutes ?? null, null),
        slaAttainment: normalisePercentage(stats.slaAttainment ?? stats.sla, null),
        csat: normalisePercentage(stats.csat ?? stats.csatScore ?? stats.csatPercentage, null),
        nps: Number.isFinite(Number(stats.nps)) ? Number(stats.nps) : null
      },
      backlogTrend: ensureArray(queue.backlogTrend ?? queue.trend).map((point, index) => ({
        id: point?.id ?? `trend-${index}`,
        date: point?.date ?? point?.timestamp ?? null,
        open: toNumber(point?.open ?? point?.value ?? 0)
      })),
      items: ensureArray(queue.items ?? queue.openTickets).map(normaliseSupportTicket)
    },
    communications: {
      scheduled: ensureArray(communications.scheduled ?? communications.upcoming).map(normaliseCommunication),
      recent: ensureArray(communications.recent ?? communications.history).map(normaliseCommunication),
      playbooks: ensureArray(communications.playbooks).map((playbook, index) => ({
        id: playbook?.id ?? playbook?.playbookId ?? `playbook-${index}`,
        name: playbook?.name ?? playbook?.title ?? 'Playbook',
        description: playbook?.description ?? null,
        audience: playbook?.audience ?? null
      }))
    },
    knowledgeBase: {
      totalArticles: toNumber(knowledgeBase.totalArticles ?? knowledgeBase.total ?? 0),
      flaggedArticles: ensureArray(knowledgeBase.flagged ?? knowledgeBase.needsReview).map(normaliseKnowledgeArticle),
      drafts: ensureArray(knowledgeBase.drafts ?? knowledgeBase.pending).map(normaliseKnowledgeArticle)
    },
    automation: {
      workflows: ensureArray(automation.workflows).map((workflow, index) => ({
        id: workflow?.id ?? workflow?.workflowId ?? `workflow-${index}`,
        name: workflow?.name ?? workflow?.title ?? 'Workflow',
        status: workflow?.status ?? workflow?.state ?? 'active',
        successRate: normalisePercentage(workflow?.successRate ?? workflow?.success, null),
        lastRunAt: workflow?.lastRunAt ?? workflow?.lastExecutedAt ?? null
      })),
      health: automation.health ?? automation.summary ?? null
    },
    settings: {
      notificationPolicies: ensureArray(settings.notificationPolicies ?? settings.policies).map(
        normaliseNotificationPolicy
      ),
      channels: settings.channels ?? settings.communicationChannels ?? null,
      responseTargets: settings.responseTargets ?? settings.targets ?? null
    },
    onboarding: {
      checklists: ensureArray(onboarding.checklists ?? onboarding.tasks).map((item, index) => ({
        id: item?.id ?? item?.taskId ?? `checklist-${index}`,
        name: item?.name ?? item?.title ?? 'Onboarding task',
        progress: normalisePercentage(item?.progress ?? item?.completion, null),
        owner: item?.owner ?? null,
        updatedAt: item?.updatedAt ?? null
      })),
      playbooks: ensureArray(onboarding.playbooks ?? onboarding.guides).map((guide, index) => ({
        id: guide?.id ?? guide?.guideId ?? `guide-${index}`,
        name: guide?.name ?? guide?.title ?? 'Guide',
        link: guide?.link ?? guide?.url ?? null
      }))
    }
  };
}

function normaliseFinanceOverview(rawPayload = {}) {
  const payload = unwrapPayload(rawPayload);
  const revenueSummary = ensureArray(payload.revenue?.summary ?? payload.revenue?.metrics).map(normaliseKpi);
  const collectionsRaw = payload.revenue?.collections ?? {};
  const agingBuckets = ensureArray(collectionsRaw.aging ?? collectionsRaw.agingBuckets ?? []);
  const currency = collectionsRaw.currency ?? payload.revenue?.currency ?? 'USD';
  const totalOutstanding = toNumber(
    collectionsRaw.totalOutstanding ??
      agingBuckets.reduce((sum, bucket) => sum + toNumber(bucket.amount ?? bucket.value ?? 0), 0),
    0
  );

  const collections = {
    currency,
    totalOutstanding,
    autopaySuccessRate: normalisePercentage(collectionsRaw.autopaySuccessRate ?? collectionsRaw.autopayRate),
    disputeRate: normalisePercentage(collectionsRaw.disputeRate ?? collectionsRaw.chargebackRate),
    recoveredRate: normalisePercentage(collectionsRaw.recoveredRate ?? collectionsRaw.recoveryRate),
    agingBuckets: agingBuckets.map((bucket, index) => {
      const money = normaliseMoney(bucket.amount ?? bucket.value ?? bucket.total, currency);
      const invoiceCount = toNumber(bucket.invoiceCount ?? bucket.count ?? bucket.invoices ?? 0, 0);
      const bucketPercentage = normalisePercentage(
        bucket.percentage ?? bucket.percent ?? (totalOutstanding ? money.amount / totalOutstanding : 0),
        0
      );
      return {
        id: bucket.id ?? bucket.bucket ?? `aging-${index}`,
        label: bucket.label ?? bucket.bucket ?? bucket.range ?? 'Unassigned',
        amount: money.amount,
        currency: money.currency,
        percentage: bucketPercentage,
        invoiceCount,
        oldestInvoiceAt: bucket.oldestInvoiceAt ?? bucket.oldestDueAt ?? null
      };
    }),
    openInvoices: ensureArray(collectionsRaw.openInvoices ?? collectionsRaw.pendingInvoices).map((invoice, index) => {
      const money = normaliseMoney(invoice.amount ?? invoice.totalDue ?? invoice.balanceDue, currency);
      return {
        id: invoice.id ?? invoice.invoiceId ?? `invoice-${index}`,
        reference: invoice.reference ?? invoice.number ?? invoice.externalId ?? null,
        customer: invoice.customer ?? invoice.accountName ?? invoice.account ?? 'Customer',
        dueAt: invoice.dueAt ?? invoice.dueDate ?? invoice.dueOn ?? null,
        status: invoice.status ?? 'open',
        agingBucket: invoice.agingBucket ?? invoice.bucket ?? null,
        autopay: Boolean(invoice.autopay ?? invoice.autoCollect ?? invoice.autocollect),
        lastAttemptAt: invoice.lastAttemptAt ?? invoice.lastPaymentAttempt ?? null,
        paymentMethod: invoice.paymentMethod ?? invoice.paymentMethodType ?? null,
        amount: money.amount,
        currency: money.currency
      };
    })
  };

  const payoutsRaw = payload.payouts ?? {};
  const payoutQueue = ensureArray(payoutsRaw.queue ?? payoutsRaw.awaitingApproval).map((payout, index) => {
    const money = normaliseMoney(payout.netAmount ?? payout.amount ?? payout.total, payoutsRaw.currency ?? 'USD');
    return {
      id: payout.id ?? payout.payoutId ?? `payout-${index}`,
      reference: payout.reference ?? payout.batchReference ?? payout.transferId ?? null,
      programme: payout.programme ?? payout.program ?? payout.providerName ?? 'Programme',
      amount: money.amount,
      currency: money.currency,
      status: payout.status ?? 'pending',
      requestedBy: payout.requestedBy ?? payout.owner ?? payout.createdBy ?? null,
      submittedAt: payout.submittedAt ?? payout.createdAt ?? null,
      agingDays: payout.agingDays ?? payout.daysPending ?? null,
      riskScore: payout.riskScore ?? payout.risk?.score ?? null,
      riskFlags: ensureArray(payout.riskFlags ?? payout.risk?.flags),
      requiresManualReview: Boolean(payout.requiresManualReview ?? payout.manualReview ?? payout.complianceHold),
      complianceHoldReason: payout.complianceHoldReason ?? payout.holdReason ?? null,
      bankAccount: payout.bankAccount ?? payout.destination ?? payout.bankLast4 ?? null,
      estimatedSettlementAt: payout.estimatedSettlementAt ?? payout.expectedSettlement ?? null
    };
  });

  const payouts = {
    queue: payoutQueue,
    stats: {
      awaitingApproval: toNumber(payoutsRaw.stats?.awaitingApproval ?? payoutQueue.length, payoutQueue.length),
      flagged: toNumber(
        payoutsRaw.stats?.flagged ?? payoutQueue.filter((item) => item.requiresManualReview).length,
        0
      ),
      avgProcessingMinutes:
        payoutsRaw.stats?.avgProcessingMinutes ?? payoutsRaw.stats?.averageProcessingMinutes ?? null
    }
  };

  const ledgerRaw = payload.ledger ?? {};
  const ledgerCurrency = ledgerRaw.currency ?? 'USD';
  const settlements = ensureArray(ledgerRaw.settlements).map((settlement, index) => {
    const gross = normaliseMoney(settlement.gross ?? settlement.grossAmount, ledgerCurrency);
    const fees = normaliseMoney(settlement.fees ?? settlement.feeAmount ?? settlement.processingFees, ledgerCurrency);
    const net = normaliseMoney(settlement.net ?? settlement.netAmount, ledgerCurrency);
    return {
      id: settlement.id ?? settlement.batchId ?? `settlement-${index}`,
      processor: settlement.processor ?? settlement.provider ?? 'Processor',
      status: settlement.status ?? 'scheduled',
      depositedAt: settlement.depositedAt ?? settlement.arrivedAt ?? settlement.expectedAt ?? null,
      gross,
      fees,
      net
    };
  });

  const disputes = ensureArray(ledgerRaw.disputes).map((dispute, index) => {
    const amount = normaliseMoney(dispute.amount ?? dispute.transactionAmount, ledgerCurrency);
    return {
      id: dispute.id ?? dispute.disputeId ?? `dispute-${index}`,
      amount,
      reason: dispute.reason ?? dispute.code ?? 'unspecified',
      openedAt: dispute.openedAt ?? dispute.createdAt ?? null,
      dueAt: dispute.dueAt ?? dispute.responseDueAt ?? null,
      status: dispute.status ?? 'open',
      evidenceSubmitted: Boolean(dispute.evidenceSubmitted ?? dispute.evidence?.submitted ?? false),
      risk: dispute.risk ?? dispute.riskLevel ?? null
    };
  });

  const reconciliationRaw = ledgerRaw.reconciliation ?? {};
  const reconciliation = {
    lastRunAt: reconciliationRaw.lastRunAt ?? reconciliationRaw.lastCompletedAt ?? null,
    status: reconciliationRaw.status ?? 'pending',
    varianceBps: reconciliationRaw.varianceBps ?? reconciliationRaw.deltaBps ?? null,
    varianceAmount: normaliseMoney(reconciliationRaw.varianceAmount ?? reconciliationRaw.deltaAmount, ledgerCurrency),
    unresolvedItems: ensureArray(reconciliationRaw.unresolvedItems).map((item, index) => ({
      id: item.id ?? item.transactionId ?? `unresolved-${index}`,
      reference: item.reference ?? item.transactionId ?? item.invoiceId ?? null,
      amount: normaliseMoney(item.amount ?? item.transactionAmount, ledgerCurrency),
      type: item.type ?? 'transaction',
      openedAt: item.openedAt ?? item.detectedAt ?? null
    }))
  };

  const experimentsRaw = payload.experiments ?? {};
  const experiments = {
    active: ensureArray(experimentsRaw.active).map((experiment, index) => ({
      id: experiment.id ?? experiment.experimentId ?? `experiment-${index}`,
      name: experiment.name ?? experiment.title ?? 'Experiment',
      metric: experiment.metric ?? experiment.primaryMetric ?? null,
      lift: normalisePercentage(experiment.lift ?? experiment.uplift),
      confidence: normalisePercentage(experiment.confidence ?? experiment.significance),
      startedAt: experiment.startedAt ?? experiment.createdAt ?? null,
      owner: experiment.owner ?? experiment.lead ?? null,
      status: experiment.status ?? 'running',
      guardrailBreaches: ensureArray(experiment.guardrailBreaches ?? experiment.issues)
    })),
    toggles: ensureArray(experimentsRaw.toggles ?? experimentsRaw.flags).map((flag, index) => ({
      id: flag.id ?? flag.key ?? `flag-${index}`,
      key: flag.key ?? flag.id ?? `flag-${index}`,
      state: Boolean(flag.state ?? flag.enabled ?? false),
      description: flag.description ?? flag.summary ?? null,
      audience: flag.audience ?? flag.segment ?? 'global',
      lastChangedBy: flag.lastChangedBy ?? flag.updatedBy ?? null,
      lastChangedAt: flag.lastChangedAt ?? flag.updatedAt ?? null
    }))
  };

  const pricingRaw = payload.pricing ?? {};
  const pricing = {
    catalogues: ensureArray(pricingRaw.catalogues).map((catalogue, index) => {
      const catalogueCurrency = catalogue.currency ?? catalogue.defaultCurrency ?? 'USD';
      return {
        id: catalogue.id ?? catalogue.catalogueId ?? `catalogue-${index}`,
        name: catalogue.name ?? 'Catalogue',
        currency: catalogueCurrency,
        plans: ensureArray(catalogue.plans).map((plan, planIndex) => ({
          id: plan.id ?? plan.planId ?? `plan-${planIndex}`,
          name: plan.name ?? plan.product ?? 'Plan',
          cadence: plan.cadence ?? plan.interval ?? 'monthly',
          amount: normaliseMoney(plan.amount ?? plan.price ?? plan.unitAmount, catalogueCurrency).amount,
          currency: normaliseMoney(plan.amount ?? plan.price ?? plan.unitAmount, catalogueCurrency).currency,
          attachRate: normalisePercentage(plan.attachRate ?? plan.takeRate),
          activeSubscribers: toNumber(plan.activeSubscribers ?? plan.activeLearners ?? plan.activeCustomers ?? 0, 0),
          trialDays: toNumber(plan.trialDays ?? plan.trialPeriodDays ?? 0, 0),
          upgradePath: plan.upgradePath ?? null
        }))
      };
    }),
    guardrails: {
      minimumPriceCents: pricingRaw.guardrails?.minimumPriceCents ?? pricingRaw.guardrails?.minPriceCents ?? null,
      maximumDiscountPercent: normalisePercentage(
        pricingRaw.guardrails?.maximumDiscountPercent ?? pricingRaw.guardrails?.maxDiscount
      ),
      allowCustomInvoices: Boolean(
        pricingRaw.guardrails?.allowCustomInvoices ?? pricingRaw.guardrails?.customInvoices ?? false
      ),
      autoIndexByCpi: Boolean(pricingRaw.guardrails?.autoIndexByCpi ?? pricingRaw.guardrails?.cpiIndexing)
    },
    pendingApprovals: ensureArray(pricingRaw.pendingApprovals).map((approval, index) => ({
      id: approval.id ?? approval.requestId ?? `approval-${index}`,
      name: approval.name ?? approval.summary ?? 'Approval',
      requestedBy: approval.requestedBy ?? approval.submittedBy ?? null,
      submittedAt: approval.submittedAt ?? approval.createdAt ?? null,
      changeType: approval.changeType ?? approval.type ?? 'update'
    }))
  };

  return {
    generatedAt: payload.generatedAt ?? payload.updatedAt ?? null,
    revenue: {
      summary: revenueSummary,
      collections,
      breakdowns: {
        products: ensureArray(payload.revenue?.breakdowns?.products).map((product, index) => ({
          id: product.id ?? product.productId ?? `product-${index}`,
          name: product.name ?? product.product ?? 'Product',
          revenue: normaliseMoney(product.revenue ?? product.total, payload.revenue?.currency ?? 'USD'),
          growth: normalisePercentage(product.growth ?? product.trend)
        })),
        regions: ensureArray(payload.revenue?.breakdowns?.regions).map((region, index) => ({
          id: region.id ?? region.region ?? `region-${index}`,
          name: region.name ?? region.region ?? 'Region',
          revenue: normaliseMoney(region.revenue ?? region.total, payload.revenue?.currency ?? 'USD'),
          growth: normalisePercentage(region.growth ?? region.trend)
        }))
      }
    },
    payouts,
    ledger: {
      settlements,
      disputes,
      reconciliation
    },
    experiments,
    pricing
  };
}

export async function fetchExecutiveOverview({ token, tenantId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch the executive overview');
  }

  const response = await httpClient.get('/operator/executive/overview', {
    token,
    signal,
    params: tenantId ? { tenantId } : undefined,
    cache: {
      ttl: 60_000,
      tags: [`operator:executive:${tenantId ?? 'default'}`],
      varyByToken: true,
      varyByHeaders: ['Accept-Language']
    }
  });

  return normaliseExecutiveOverview(response);
}

export async function fetchExecutiveTenants({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch executive tenants');
  }

  const response = await httpClient.get('/operator/executive/tenants', {
    token,
    signal,
    cache: {
      ttl: 10 * 60_000,
      tags: ['operator:executive:tenants'],
      varyByToken: true
    }
  });

  return normaliseTenants(response);
}

export async function fetchFinanceOverview({ token, tenantId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch the finance overview');
  }

  const response = await httpClient.get('/operator/finance/overview', {
    token,
    signal,
    params: tenantId ? { tenantId } : undefined,
    cache: {
      ttl: 90_000,
      tags: [`operator:finance:${tenantId ?? 'default'}`],
      varyByToken: true,
      varyByHeaders: ['Accept-Language']
    }
  });

  return normaliseFinanceOverview(response);
}

export async function fetchFinanceTenants({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch finance tenants');
  }

  const response = await httpClient.get('/operator/finance/tenants', {
    token,
    signal,
    cache: {
      ttl: 10 * 60_000,
      tags: ['operator:finance:tenants'],
      varyByToken: true
    }
  });

  return normaliseTenants(response);
}

export async function fetchSupportOverview({ token, tenantId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch the support overview');
  }

  const response = await httpClient.get('/operator/support/overview', {
    token,
    signal,
    params: tenantId ? { tenantId } : undefined,
    cache: {
      ttl: 90_000,
      tags: [`operator:support:${tenantId ?? 'default'}`],
      varyByToken: true,
      varyByHeaders: ['Accept-Language']
    }
  });

  return normaliseSupportOverview(response);
}

export async function fetchSupportTenants({ token, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch support tenants');
  }

  const response = await httpClient.get('/operator/support/tenants', {
    token,
    signal,
    cache: {
      ttl: 10 * 60_000,
      tags: ['operator:support:tenants'],
      varyByToken: true
    }
  });

  return normaliseTenants(response);
}

function buildTenantParams(tenantId) {
  return tenantId ? { tenantId } : undefined;
}

export async function approveFinancePayout({ token, payoutId, tenantId, note } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to approve payouts');
  }
  if (!payoutId) {
    throw new Error('A payout identifier is required to approve a payout');
  }

  return httpClient.post(
    `/operator/finance/payouts/${encodeURIComponent(payoutId)}/approve`,
    note ? { note } : {},
    {
      token,
      params: buildTenantParams(tenantId),
      cache: { enabled: false },
      invalidateTags: [`operator:finance:${tenantId ?? 'default'}`]
    }
  );
}

export async function holdFinancePayout({ token, payoutId, tenantId, reason } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to hold payouts');
  }
  if (!payoutId) {
    throw new Error('A payout identifier is required to hold a payout');
  }

  return httpClient.post(
    `/operator/finance/payouts/${encodeURIComponent(payoutId)}/hold`,
    reason ? { reason } : {},
    {
      token,
      params: buildTenantParams(tenantId),
      cache: { enabled: false },
      invalidateTags: [`operator:finance:${tenantId ?? 'default'}`]
    }
  );
}

export async function settleFinanceInvoice({ token, invoiceId, tenantId, metadata } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to settle invoices');
  }
  if (!invoiceId) {
    throw new Error('An invoice identifier is required to settle an invoice');
  }

  return httpClient.post(
    `/operator/finance/invoices/${encodeURIComponent(invoiceId)}/settle`,
    metadata ?? {},
    {
      token,
      params: buildTenantParams(tenantId),
      cache: { enabled: false },
      invalidateTags: [`operator:finance:${tenantId ?? 'default'}`]
    }
  );
}

export async function stopFinanceExperiment({ token, experimentId, tenantId } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to manage experiments');
  }
  if (!experimentId) {
    throw new Error('An experiment identifier is required to stop an experiment');
  }

  return httpClient.post(
    `/operator/finance/experiments/${encodeURIComponent(experimentId)}/stop`,
    {},
    {
      token,
      params: buildTenantParams(tenantId),
      cache: { enabled: false },
      invalidateTags: [`operator:finance:${tenantId ?? 'default'}`]
    }
  );
}

export async function fetchOperationsDigest({ token, tenantId, signal } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to fetch operations digest');
  }

  const response = await httpClient.get('/operator/operations/digest', {
    token,
    signal,
    params: buildTenantParams(tenantId),
    cache: {
      ttl: 60_000,
      tags: [`operator:operations:${tenantId ?? 'default'}`],
      varyByToken: true,
      varyByHeaders: ['Accept-Language']
    }
  });

  return response?.data ?? response;
}

export async function acknowledgeOperationsIncident({ token, tenantId, incidentId, note } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to acknowledge incidents');
  }
  if (!incidentId) {
    throw new Error('An incident identifier is required to acknowledge an incident');
  }

  return httpClient.post(
    `/operator/operations/incidents/${encodeURIComponent(incidentId)}/acknowledge`,
    note ? { note } : {},
    {
      token,
      params: buildTenantParams(tenantId),
      cache: { enabled: false },
      invalidateTags: [`operator:operations:${tenantId ?? 'default'}`]
    }
  );
}

export async function assignSupportTicket({ token, tenantId, ticketId, assigneeId } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to assign support tickets');
  }
  if (!ticketId) {
    throw new Error('A ticket identifier is required to assign a ticket');
  }

  return httpClient.patch(
    `/operator/support/tenants/${encodeURIComponent(tenantId ?? 'default')}/tickets/${encodeURIComponent(ticketId)}/assign`,
    assigneeId ? { assigneeId } : {},
    {
      token,
      cache: { enabled: false },
      invalidateTags: [`operator:support:${tenantId ?? 'default'}`]
    }
  );
}

export async function escalateSupportTicket({ token, tenantId, ticketId, reason, target } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to escalate support tickets');
  }
  if (!ticketId) {
    throw new Error('A ticket identifier is required to escalate a ticket');
  }

  return httpClient.patch(
    `/operator/support/tenants/${encodeURIComponent(tenantId ?? 'default')}/tickets/${encodeURIComponent(ticketId)}/escalate`,
    {
      ...(reason ? { reason } : {}),
      ...(target ? { target } : {})
    },
    {
      token,
      cache: { enabled: false },
      invalidateTags: [`operator:support:${tenantId ?? 'default'}`]
    }
  );
}

export async function resolveSupportTicket({ token, tenantId, ticketId, resolution } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to resolve support tickets');
  }
  if (!ticketId) {
    throw new Error('A ticket identifier is required to resolve a ticket');
  }

  return httpClient.patch(
    `/operator/support/tenants/${encodeURIComponent(tenantId ?? 'default')}/tickets/${encodeURIComponent(ticketId)}/resolve`,
    resolution ? { resolution } : {},
    {
      token,
      cache: { enabled: false },
      invalidateTags: [`operator:support:${tenantId ?? 'default'}`]
    }
  );
}

export async function scheduleSupportBroadcast({ token, tenantId, payload } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to schedule broadcasts');
  }

  return httpClient.post(
    `/operator/support/tenants/${encodeURIComponent(tenantId ?? 'default')}/communications/broadcasts`,
    payload ?? {},
    {
      token,
      cache: { enabled: false },
      invalidateTags: [`operator:support:${tenantId ?? 'default'}`]
    }
  );
}

export async function updateSupportNotificationPolicy({ token, tenantId, policyId, updates } = {}) {
  if (!token) {
    throw new Error('Authentication token is required to update notification policies');
  }
  if (!policyId) {
    throw new Error('A policy identifier is required to update a notification policy');
  }

  return httpClient.put(
    `/operator/support/tenants/${encodeURIComponent(tenantId ?? 'default')}/notification-policies/${encodeURIComponent(policyId)}`,
    updates ?? {},
    {
      token,
      cache: { enabled: false },
      invalidateTags: [`operator:support:${tenantId ?? 'default'}`]
    }
  );
}

export const operatorDashboardApi = {
  fetchExecutiveOverview,
  fetchExecutiveTenants,
  fetchFinanceOverview,
  fetchFinanceTenants,
  fetchSupportOverview,
  fetchSupportTenants,
  approveFinancePayout,
  holdFinancePayout,
  settleFinanceInvoice,
  stopFinanceExperiment,
  assignSupportTicket,
  escalateSupportTicket,
  resolveSupportTicket,
  scheduleSupportBroadcast,
  updateSupportNotificationPolicy,
  fetchOperationsDigest,
  acknowledgeOperationsIncident
};

export default operatorDashboardApi;
