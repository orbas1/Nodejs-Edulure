import NavigationAnnexRepository from '../repositories/NavigationAnnexRepository.js';
import strategyBriefing from '../data/navigationStrategyBriefing.json' assert { type: 'json' };

export default class StrategyBriefingService {
  static async describe({ role } = {}) {
    const annex = await NavigationAnnexRepository.describe({ role });
    return {
      ...strategyBriefing,
      annex
    };
  }
}
