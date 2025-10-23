import AcquisitionPlanModel from '../models/AcquisitionPlanModel.js';

function extractHeroMetadata(plans) {
  for (const plan of plans) {
    const hero = plan.metadata?.hero;
    if (hero && typeof hero === 'object') {
      return hero;
    }
  }
  return null;
}

function extractPlanMeta(plans) {
  return plans.reduce(
    (acc, plan) => ({
      planComparisonTitle: acc.planComparisonTitle ?? plan.metadata?.planComparisonTitle ?? null,
      planComparisonDescription: acc.planComparisonDescription ?? plan.metadata?.planComparisonDescription ?? null
    }),
    { planComparisonTitle: null, planComparisonDescription: null }
  );
}

export default class AcquisitionService {
  static async listPlansWithAddons(connection) {
    const plans = await AcquisitionPlanModel.listPlans(connection);
    const addons = await AcquisitionPlanModel.listAddons(connection);
    const hero = extractHeroMetadata(plans);
    const planMeta = extractPlanMeta(plans);
    const planLookupByInternalId = new Map(plans.map((plan) => [plan.internalId, plan]));

    const serialisedPlans = plans.map((plan) => {
      const { metadata, internalId, ...rest } = plan;
      return rest;
    });

    const serialisedAddons = addons.map((addon) => {
      const { metadata, planInternalId, ...rest } = addon;
      const plan = planInternalId ? planLookupByInternalId.get(planInternalId) ?? null : null;
      return {
        ...rest,
        planSlug: plan?.slug ?? null,
        planId: plan?.id ?? null
      };
    });

    return {
      hero: hero ? { ...hero, ...planMeta } : { ...planMeta },
      plans: serialisedPlans,
      addons: serialisedAddons
    };
  }
}
