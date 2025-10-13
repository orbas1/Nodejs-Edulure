# Edulure ads, live video, and messaging implementation gaps

The current monorepo does not include the infrastructure that would be required to
implement the requested changes:

## Ads placement across feed and search
- The React feed implementation (`frontend-reactjs/src/pages/Feed.jsx`) renders the
  community activity list without any ad inventory hooks or placement logic.
  Items are pulled exclusively from `/communities/feed` and `/communities/{id}/posts`
  through `fetchAggregatedFeed`/`fetchCommunityFeed`, so there is no place to inject
  campaign creatives or track impressions.
- The search experience consumes the explorer APIs but the returned payloads do not
  contain the `ads` collections that the backend exposes. Front-end view models and
  components would need to be extended to request `/api/ads/...` resources before
  ad slots can be surfaced.

## In-course video service
- There is no native player or streaming pipeline in the React codebase. Content
  ingestion only accepts a `video` type flag (`backend-nodejs/src/controllers/ContentController.js`)
  and stores metadata; it does not broker playback URLs, DRM policies, or transcoding jobs.
- No integration with a first-party video CDN or on-demand encoder exists, so courses
  cannot play "our own video service" without designing storage, transcoding, signed URL
  delivery, and player UI work.

## Socket.io powered messaging and live video
- The repository does not ship a Socket.io server. The backend depends on RESTful
  controllers (`backend-nodejs/src/controllers/DirectMessageController.js`) and data-access
  services; there are no websocket gateways to broadcast thread events or presence updates.
- Front-end packages do not install `socket.io-client`, and no runtime configuration exists
  for websocket endpoints. Building a live messaging or live video experience would require
  provisioning those services, adding authentication, presence, and retry logic.

## Inbox status
- Direct messages are persisted via REST handlers (`backend-nodejs/src/routes/chat.routes.js`),
  but without a websocket transport the inbox cannot receive real-time updates. The frontend
  also lacks views that render threads or messages from these endpoints, so the "inbox and
  messages" portion of the product is not wired up.

## Recommendation
Delivering the requested functionality requires a coordinated backend and frontend effort that is
currently outside the scope of the repository. The missing pieces include:

1. Designing ad inventory APIs and React components to request, render, and track ad units.
2. Implementing a first-party video delivery pipeline (storage, encoding, playback UI).
3. Standing up a Socket.io (or equivalent) signalling service plus client integrations.
4. Extending the UI to show messaging threads with optimistic updates and real-time events.

Until these foundational systems are built, it is not possible to "fix" the ad placements,
course video experience, or live messaging flows inside this codebase.
