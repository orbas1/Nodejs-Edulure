# Mobile App Backend Integration Updates

- Added `api_config.dart` to source the backend base URL from compile-time environment variables, enabling per-environment builds.
- Created `AuthService` and `ContentService` wrappers that authenticate, fetch assets, request viewer tokens, submit progress, and emit analytics against the new `/api/content` endpoints.
- Leveraged Dio interceptors to attach bearer tokens retrieved from `SessionManager`, ensuring all requests honour backend security policies.
