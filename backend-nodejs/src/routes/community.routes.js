import CommunityController from '../controllers/CommunityController.js';
import CommunityEngagementController from '../controllers/CommunityEngagementController.js';
import CommunityChatController from '../controllers/CommunityChatController.js';
import CommunityMonetizationController from '../controllers/CommunityMonetizationController.js';
import CommunityMemberAdminController from '../controllers/CommunityMemberAdminController.js';
import CommunityOperationsController from '../controllers/CommunityOperationsController.js';
import CommunityProgrammingController from '../controllers/CommunityProgrammingController.js';
import auth from '../middleware/auth.js';
import { createApiRouter } from './routerFactory.js';

const router = createApiRouter();

router.get('/', auth(), CommunityController.listForUser);
router.get('/feed', auth(), CommunityController.listUserFeed);
router.post('/', auth('instructor'), CommunityController.create);
router.put('/:communityId', auth('instructor'), CommunityController.update);
router.get('/:communityId', auth(), CommunityController.getDetail);
router.get('/:communityId/posts', auth(), CommunityController.listFeed);
router.post('/:communityId/posts', auth(), CommunityController.createPost);
router.put('/:communityId/posts/:postId', auth('instructor'), CommunityController.updatePost);
router.post('/:communityId/join', auth(), CommunityController.join);
router.post('/:communityId/leave', auth(), CommunityController.leave);
router.post('/:communityId/posts/:postId/moderate', auth(), CommunityController.moderatePost);
router.delete('/:communityId/posts/:postId', auth(), CommunityController.removePost);
router.post('/:communityId/posts/:postId/reactions', auth(), CommunityController.reactToPost);
router.delete('/:communityId/posts/:postId/reactions', auth(), CommunityController.removeReaction);
router.get('/:communityId/sponsorships', auth(), CommunityController.listSponsorshipPlacements);
router.put('/:communityId/sponsorships', auth(), CommunityController.updateSponsorshipPlacements);
router.get('/:communityId/resources', auth(), CommunityController.listResources);
router.post('/:communityId/resources', auth(), CommunityController.createResource);
router.put('/:communityId/resources/:resourceId', auth(), CommunityController.updateResource);
router.delete('/:communityId/resources/:resourceId', auth(), CommunityController.deleteResource);

router.get('/:communityId/webinars', auth(), CommunityProgrammingController.listWebinars);
router.post('/:communityId/webinars', auth(), CommunityProgrammingController.createWebinar);
router.put('/:communityId/webinars/:webinarId', auth(), CommunityProgrammingController.updateWebinar);
router.delete('/:communityId/webinars/:webinarId', auth(), CommunityProgrammingController.deleteWebinar);

router.get('/:communityId/podcasts', auth(), CommunityProgrammingController.listPodcastEpisodes);
router.post('/:communityId/podcasts', auth(), CommunityProgrammingController.createPodcastEpisode);
router.put('/:communityId/podcasts/:episodeId', auth(), CommunityProgrammingController.updatePodcastEpisode);
router.delete('/:communityId/podcasts/:episodeId', auth(), CommunityProgrammingController.deletePodcastEpisode);

router.get(
  '/:communityId/growth/experiments',
  auth(),
  CommunityProgrammingController.listGrowthExperiments
);
router.post(
  '/:communityId/growth/experiments',
  auth(),
  CommunityProgrammingController.createGrowthExperiment
);
router.put(
  '/:communityId/growth/experiments/:experimentId',
  auth(),
  CommunityProgrammingController.updateGrowthExperiment
);
router.delete(
  '/:communityId/growth/experiments/:experimentId',
  auth(),
  CommunityProgrammingController.deleteGrowthExperiment
);

router.get('/:communityId/members', auth('instructor'), CommunityMemberAdminController.list);
router.post('/:communityId/members', auth('instructor'), CommunityMemberAdminController.create);
router.patch('/:communityId/members/:userId', auth('instructor'), CommunityMemberAdminController.update);
router.delete('/:communityId/members/:userId', auth('instructor'), CommunityMemberAdminController.remove);

router.get('/:communityId/chat/channels', auth(), CommunityChatController.listChannels);
router.post('/:communityId/chat/channels', auth(), CommunityChatController.createChannel);
router.put('/:communityId/chat/channels/:channelId', auth(), CommunityChatController.updateChannel);
router.delete('/:communityId/chat/channels/:channelId', auth(), CommunityChatController.deleteChannel);
router.get(
  '/:communityId/chat/channels/:channelId/members',
  auth(),
  CommunityChatController.listChannelMembers
);
router.post(
  '/:communityId/chat/channels/:channelId/members',
  auth(),
  CommunityChatController.upsertChannelMember
);
router.delete(
  '/:communityId/chat/channels/:channelId/members/:userId',
  auth(),
  CommunityChatController.removeChannelMember
);
router.get(
  '/:communityId/chat/channels/:channelId/messages',
  auth(),
  CommunityChatController.listMessages
);
router.post(
  '/:communityId/chat/channels/:channelId/messages',
  auth(),
  CommunityChatController.postMessage
);
router.post(
  '/:communityId/chat/channels/:channelId/read',
  auth(),
  CommunityChatController.acknowledgeRead
);
router.post(
  '/:communityId/chat/channels/:channelId/messages/:messageId/reactions',
  auth(),
  CommunityChatController.addReaction
);
router.delete(
  '/:communityId/chat/channels/:channelId/messages/:messageId/reactions',
  auth(),
  CommunityChatController.removeReaction
);
router.post(
  '/:communityId/chat/channels/:channelId/messages/:messageId/moderate',
  auth(),
  CommunityChatController.moderateMessage
);
router.get('/:communityId/chat/presence', auth(), CommunityChatController.listPresence);
router.post('/:communityId/chat/presence', auth(), CommunityChatController.updatePresence);

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
router.get(
  '/:communityId/monetization/summary',
  auth('instructor'),
  CommunityMonetizationController.revenueSummary
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
router.get(
  '/:communityId/subscriptions',
  auth('instructor'),
  CommunityMonetizationController.listSubscriptions
);
router.patch(
  '/:communityId/subscriptions/:subscriptionId',
  auth('instructor'),
  CommunityMonetizationController.updateSubscription
);
router.post(
  '/:communityId/live/donations',
  auth(),
  CommunityMonetizationController.createDonation
);

router.post(
  '/:communityId/operations/runbooks',
  auth(),
  CommunityOperationsController.publishRunbook
);
router.post(
  '/:communityId/operations/escalations/:caseId/acknowledge',
  auth(),
  CommunityOperationsController.acknowledgeEscalation
);
router.post(
  '/:communityId/operations/events',
  auth(),
  CommunityOperationsController.scheduleEvent
);
router.patch(
  '/:communityId/operations/paywall/tiers/:tierId',
  auth('instructor'),
  CommunityOperationsController.manageTier
);
router.get(
  '/:communityId/operations/safety',
  auth('instructor'),
  CommunityOperationsController.listIncidents
);
router.post(
  '/:communityId/operations/safety/:caseId/resolve',
  auth(),
  CommunityOperationsController.resolveIncident
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
