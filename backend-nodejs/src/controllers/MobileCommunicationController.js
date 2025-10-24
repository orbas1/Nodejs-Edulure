import MobileCommunicationService from '../services/MobileCommunicationService.js';

function requireUserId(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user.id;
}

export default class MobileCommunicationController {
  static async inbox(req, res, next) {
    try {
      const userId = requireUserId(req);
      const snapshot = await MobileCommunicationService.getInbox(userId);
      return res.json({ success: true, threads: snapshot.threads, tickets: snapshot.tickets });
    } catch (error) {
      return next(error);
    }
  }

  static async sendMessage(req, res, next) {
    try {
      const userId = requireUserId(req);
      const message = await MobileCommunicationService.sendMessage(userId, req.params.threadId, req.body ?? {});
      return res.status(201).json({ success: true, message });
    } catch (error) {
      return next(error);
    }
  }

  static async markRead(req, res, next) {
    try {
      const userId = requireUserId(req);
      const readAt = req.body?.readAt ? new Date(req.body.readAt) : new Date();
      await MobileCommunicationService.markThreadRead(userId, req.params.threadId, readAt);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
