# Card Patterns

## General Structure
- 16px padding, 12px border radius, `--shadow-low` by default.
- Header area includes avatar or icon, title, and action menu.
- Body area supports text, charts, progress bars, and tags; footers hold CTA buttons or metadata.

## Course Card
- Hero thumbnail 16:9 ratio with overlay badge for status (Draft, Published, Scheduled).
- Title + author, rating stars, enrolment count, quick actions (Preview, Share, Promote).
- Progress bar when learner uses card to resume.

## Community Card
- Banner gradient background, community avatar, tier badges.
- Shows member count, active events, trending topic chips.
- CTA defaults to "Enter Hub" for members, "Join Community" for prospects.

## Asset Card (Deck/Ebook)
- File type icon, conversion status chip (Processing, Ready, Error).
- Displays version timeline button and quick share toggle.
- When in grid view, include storage usage indicator.

## People Card
- Avatar, follower count, expertise tags, mutual communities.
- Buttons: Follow/Unfollow, Message (if allowed), View Profile.

## Analytics Insight Card
- Metric value, delta indicator, spark-line; drop-down to change time frame.
- Quick link to analytics dashboard detail.

## States
- **Hover:** Elevate to `--shadow-mid`, accent border.
- **Selected:** Outline with `--accent-electric`, show checkmark for bulk actions.
- **Empty:** Display placeholder icon and CTA to create/import.
