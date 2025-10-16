import IntegrationApiKeyInviteService from '../services/IntegrationApiKeyInviteService.js';

const inviteService = new IntegrationApiKeyInviteService();

function normaliseError(error, defaultStatus = 500, defaultMessage = 'Unexpected integration invite error') {
  if (!error) {
    return { status: defaultStatus, message: defaultMessage };
  }
  if (typeof error.status === 'number' && error.message) {
    return { status: error.status, message: error.message };
  }
  if (error instanceof Error) {
    return { status: error.status ?? defaultStatus, message: error.message || defaultMessage };
  }
  return { status: defaultStatus, message: defaultMessage };
}

export async function getInvitation(req, res, next) {
  const { token } = req.params;
  try {
    const details = await inviteService.getInvitationDetails(token);
    res.json({ success: true, data: details });
  } catch (error) {
    const { status, message } = normaliseError(error, 404, 'Invitation not found or expired');
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export async function submitInvitation(req, res, next) {
  const { token } = req.params;
  const { key, rotationIntervalDays, keyExpiresAt, actorEmail, actorName, reason } = req.body ?? {};
  try {
    const result = await inviteService.submitInvitation(token, {
      key,
      rotationIntervalDays,
      keyExpiresAt,
      actorEmail,
      actorName,
      reason
    });

    res.status(201).json({
      success: true,
      data: {
        invite: inviteService.sanitize(result.invite),
        apiKey: result.apiKey
      }
    });
  } catch (error) {
    const { status, message } = normaliseError(error, error.status ?? 400, error.message);
    if (status >= 500) {
      next(error);
      return;
    }
    res.status(status).json({ success: false, message });
  }
}

export default { getInvitation, submitInvitation };
