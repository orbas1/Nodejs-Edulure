# Logic Flow Update

- Homepage loads hero + personalised modules sequentially to maintain perceived performance.
- Explorer filters update query string enabling shareable search URLs.
- Profile editing uses optimistic updates with rollback if API fails.
- Community actions (join, post) trigger websockets to update chat/feed in real time.
- Settings changes log to audit service and display toast confirmation.
