import NavigationAnnexRepository from '../repositories/NavigationAnnexRepository.js';

export default class NavigationAnnexService {
  static async describeAnnex({ role } = {}) {
    return NavigationAnnexRepository.describe({ role });
  }
}
