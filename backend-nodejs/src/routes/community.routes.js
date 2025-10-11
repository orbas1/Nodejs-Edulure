import { Router } from 'express';

import CommunityController from '../controllers/CommunityController.js';
import CommunityEngagementController from '../controllers/CommunityEngagementController.js';
import CommunityMonetizationController from '../controllers/CommunityMonetizationController.js';
import auth from '../middleware/auth.js';

const router = Router();

router.get('/', auth(), CommunityController.listForUser);
router.get('/feed', auth(), CommunityController.listUserFeed);
router.post('/', auth('instructor'), CommunityController.create);
router.get('/:communityId', auth(), CommunityController.getDetail);
router.get('/:communityId/posts', auth(), CommunityController.listFeed);
router.post('/:communityId/posts', auth(), CommunityController.createPost);
router.get('/:communityId/resources', auth(), CommunityController.listResources);
router.post('/:communityId/resources', auth(), CommunityController.createResource);

router.get('/:communityId/engagement/progress', auth(), CommunityEngagementController.getMyProgress);
router.post('/:communityId/engagement/points', auth('instructor'), CommunityEngagementController.awardPoints);
router.post(
  '/:communityId/engagement/streaks/check-in',
  auth(),
  CommunityEngagementController.recordCheckIn
);
router.get(
  '/:communityId/engagement/leaderboard',
  auth(),
  CommunityEngagementController.listLeaderboard
);
router.get('/:communityId/events', auth(), CommunityEngagementController.listEvents);
router.post('/:communityId/events', auth('instructor'), CommunityEngagementController.createEvent);
router.post(
  '/:communityId/events/:eventId/rsvp',
  auth(),
  CommunityEngagementController.rsvpEvent
);
router.post(
  '/:communityId/events/:eventId/reminders',
  auth(),
  CommunityEngagementController.scheduleReminder
);
router.get('/:communityId/calendar', auth(), CommunityEngagementController.getCalendar);

router.get('/:communityId/roles', auth('instructor'), CommunityMonetizationController.listRoles);
router.post('/:communityId/roles', auth('instructor'), CommunityMonetizationController.createRole);
router.patch(
  '/:communityId/members/:userId/role',
  auth('instructor'),
  CommunityMonetizationController.assignRole
);

router.get('/:communityId/paywall/tiers', auth(), CommunityMonetizationController.listTiers);
router.post('/:communityId/paywall/tiers', auth('instructor'), CommunityMonetizationController.createTier);
router.patch(
  '/:communityId/paywall/tiers/:tierId',
  auth('instructor'),
  CommunityMonetizationController.updateTier
);
router.post('/:communityId/paywall/checkout', auth(), CommunityMonetizationController.startCheckout);
router.get(
  '/:communityId/subscriptions/me',
  auth(),
  CommunityMonetizationController.listMySubscriptions
);
router.post(
  '/:communityId/subscriptions/:subscriptionId/cancel',
  auth(),
  CommunityMonetizationController.cancelSubscription
);

router.get('/:communityId/affiliates', auth('instructor'), CommunityMonetizationController.listAffiliates);
router.post('/:communityId/affiliates/apply', auth(), CommunityMonetizationController.applyAffiliate);
router.patch(
  '/:communityId/affiliates/:affiliateId',
  auth('instructor'),
  CommunityMonetizationController.updateAffiliate
);
router.post(
  '/:communityId/affiliates/:affiliateId/payouts',
  auth('instructor'),
  CommunityMonetizationController.recordPayout
);

export default router;
