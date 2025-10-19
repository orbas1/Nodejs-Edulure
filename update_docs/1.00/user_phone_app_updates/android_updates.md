# Android Specific Updates

- No Gradle or manifest changes were required; the new provider transition features reuse existing permissions. QA should clear the `provider_transition_announcements` Hive box between runs to avoid asserting against stale offline data.
