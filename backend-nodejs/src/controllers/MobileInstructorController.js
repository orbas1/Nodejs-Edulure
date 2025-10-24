import InstructorActionService from '../services/InstructorActionService.js';

function requireUserId(req) {
  if (!req?.user?.id) {
    const error = new Error('Authentication required');
    error.status = 401;
    throw error;
  }
  return req.user.id;
}

export default class MobileInstructorController {
  static async list(req, res, next) {
    try {
      const userId = requireUserId(req);
      const actions = await InstructorActionService.list(userId);
      return res.json({ success: true, actions });
    } catch (error) {
      return next(error);
    }
  }

  static async enqueue(req, res, next) {
    try {
      const userId = requireUserId(req);
      const action = await InstructorActionService.enqueue(userId, req.body ?? {});
      return res.status(201).json({ success: true, action });
    } catch (error) {
      return next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const userId = requireUserId(req);
      const action = await InstructorActionService.update(
        userId,
        req.params.clientActionId,
        req.body ?? {}
      );
      return res.json({ success: true, action });
    } catch (error) {
      return next(error);
    }
  }

  static async clear(req, res, next) {
    try {
      const userId = requireUserId(req);
      await InstructorActionService.clear(userId, req.params.clientActionId);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }
}
