import MobileCommunicationService from '../services/MobileCommunicationService.js';

function requireUserId(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user.id;
}

export default class MobileSupportController {
  static async createTicket(req, res, next) {
    try {
      const userId = requireUserId(req);
      const ticket = await MobileCommunicationService.createSupportTicket(userId, req.body ?? {});
      return res.status(201).json({ success: true, ticket });
    } catch (error) {
      return next(error);
    }
  }
}
