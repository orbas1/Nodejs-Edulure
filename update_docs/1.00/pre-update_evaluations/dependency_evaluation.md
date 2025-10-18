# Dependency Evaluation – Version 1.00

## Functionality
- The backend brings in heavyweight SDKs (Stripe, PayPal, AWS S3, MeiliSearch, CloudConvert, ClamAV) without feature flagging the package-level usage. Environments missing these providers still pay cold-start cost and risk runtime `MODULE_NOT_FOUND` when optional binaries (ClamAV, ImageMagick) are absent from the host image.
- `sdk-typescript` is not wired into the workspace graph, yet the frontend relies on `file:../sdk-typescript`. Without a prebuild, `npm install` leaves the package unresolved, breaking API client imports. The monorepo should promote the SDK to a workspace or publish a registry build consumed via semantic versions.
- Flutter dependencies (Riverpod, Google Fonts, intl) are defined in `pubspec.yaml`, but there is no shared contract with the backend feature flag keys. Divergence is already visible: the mobile app expects `mobile.serviceSuite` while the backend feature flag manifest never exposes that key, signalling imminent drift.
- Multiple server scripts require system-level tooling (Knex CLI, pm2, Redis CLI) that are not declared as npm scripts or Docker image layers. Developers following README steps cannot execute migrations or workers without manually installing binaries.
- The analytics pipeline declares Kafka/Redpanda client libraries, but no broker configuration exists. Pulling these packages bloats the install footprint with no functional pay-off.
- Worker infrastructure depends on `bullmq` but the repo never installs Redis-compatible modules in Docker. Spinning up workers requires manual system prep, creating a brittle experience for anyone following documented steps.
- Video transcode fallbacks reference FFmpeg binaries, yet there is no licensing review or cross-platform distribution plan. Developers on Windows or Apple Silicon cannot execute the toolchain.
- Email rendering depends on MJML compilation, but the CLI is not pinned. Minor version bumps can break email templates unexpectedly because there are no snapshot tests.
- Infrastructure IaC directories list Terraform modules for providers, yet the modules are not versioned or vendored. Pulling from the registry at apply time can introduce breaking changes without review.

## Usability
- Node projects pin semver ranges (`^`) across the board. Combined with the lack of a lockfile update policy, fresh installs can introduce breaking changes (e.g., ESLint 9.x config changes, AWS SDK major updates) without code review, forcing firefighting during deployments.
- Multiple linting configs coexist (`eslint.config.js`, `eslint.config.mjs`, legacy `.eslintrc` snippets in docs). Developers must remember which entrypoint applies to which package, increasing onboarding friction and causing inconsistent lint results.
- The dependency graph mixes CommonJS-focused tooling (Knex CLI, Stripe scripts) with ESM packages, forcing `type: "module"` shims and `.cjs` copies of configuration. Build and debug tooling becomes harder to reason about, and editors mis-detect module formats.
- Frontend dependencies rely on `vite` plugins that assume modern browsers, yet polyfills are absent. Without a documented browser support matrix, QA cannot evaluate regressions for legacy devices.
- Flutter uses path dependencies for shared components but there is no script to `flutter pub get` across modules. Engineers must manually navigate directories, breaking the otherwise streamlined workspace story.
- Monorepo scripts assume npm, but some teams prefer pnpm or yarn. Without a canonical package manager, lockfiles diverge and developers accidentally mix ecosystems.
- Binary dependencies (Chrome for Playwright, Java for keytool, Firebase CLI) are not provisioned. QA cannot run end-to-end suites without hunting external installers.
- Environment setup docs omit Node/Flutter version managers. Teams can inadvertently use incompatible runtimes, causing subtle build failures.
- License compliance is unaddressed. No tooling generates SBOMs or audits GPL/AGPL encumbrances, which is required for enterprise deals.

## Errors
- Security scripts (`npm audit --audit-level=moderate`) are wired but never executed in CI. Stale `package-lock.json` files mean known vulnerabilities linger; for example, the frontend lockfile references `axios@1.6.8`, which contains a request smuggling advisory patched in 1.7.x, and backend still references `jsonwebtoken@^9.0.2` without algorithm hardening.
- Backend jobs depend on native binaries (ClamAV daemon, ImageMagick for CloudConvert fallbacks) that are not declared in `scripts/install-db.js` or documentation. Missing system packages produce opaque ENOENT crashes and force trial-and-error setup.
- The Flutter module lacks a `flutter pub outdated` baseline; outdated transitive packages (e.g., `riverpod_annotation`) may introduce analyzer warnings or runtime regressions when Flutter stable updates. Crash logs will point to outdated code paths, wasting debugging cycles.
- TypeScript build caches rely on incremental compilation but `tsconfig` references missing `types` packages. Build failures manifest as cryptic `Cannot find type definition file` errors during CI runs.
- Yarn berry configuration files remain from a previous migration attempt while npm workspaces are active. Tooling occasionally tries to read `.yarnrc.yml`, causing confusing warnings.
- Package publishing automation is missing. SDK updates require manual tagging and npm publish steps, which is error-prone and delays hotfixes.
- Duplicate dependency declarations exist between root and package-level `package.json` files, leading to hoisting confusion and inconsistent runtime versions.
- Flutter build scripts ignore `--fatal-warnings`, so deprecation notices accumulate until a breaking change lands in the stable channel.
- Git hooks are referenced (`husky`) but not installed because the bootstrap script is disabled. Pre-commit lint/test enforcement is therefore absent.

## Integration
- No mechanism keeps dependency versions aligned across services. HTTP clients (frontend axios, SDK fetch, Flutter dio) configure different base URLs, headers, and interceptors, leading to inconsistent telemetry and auth flows when services evolve.
- The TypeScript SDK is generated from OpenAPI specs but there is no watch hook to regenerate when backend specs change. Developers often consume stale models, leading to runtime `unknown` properties or missing enum members and breaking GraphQL/REST parity.
- Backend scripts assume a shared `node_modules` root, yet with workspaces each package has its own tree. `scripts/run-data-retention.js` imports services using relative paths without bundling, so `npm run` from the repo root fails because dependencies are unresolved.
- Mobile relies on Firebase packages that require gradle/cocoapods alignment. There is no documented version matrix, and the repository omits the generated `Podfile.lock`, making reproducible builds improbable.
- Infrastructure providers (AWS SDK v3, Google Cloud) are bundled even though only a subset of services are used. Without tree-shaking, bundle sizes and cold starts increase noticeably.
- The analytics SDK expects environment variables that conflict with backend names. Without a harmonised configuration schema, integration attempts will continue to fail.
- Browser extensions and LMS integrations promised in briefs require SCORM/LTI packages, yet none are included. The dependency backlog does not align with roadmap commitments.
- Build pipelines do not cache dependencies effectively. CI installs from scratch every run, inflating feedback loops and cloud spend.
- Continuous delivery pipelines are absent; dependency updates require manual PRs. Without Renovate/Dependabot, cross-package integration never happens proactively, so version mismatches persist for months.

## Security
- Several dependencies require frequent rotation (Stripe, AWS SDK, Firebase). There is no Renovate/Dependabot configuration or Snyk/GitHub Advisory integration to automate updates, drastically increasing exposure windows for CVEs.
- The backend keeps `jsonwebtoken@^9.0.2` but continues to rely on legacy HS512 flows; upgrading to JOSE or at least enabling algorithm whitelists would mitigate key-confusion attacks. The package is configured insecurely.
- Socket.IO client/server versions differ (`socket.io@4.7.5` on the backend, `socket.io-client@4.8.1` on the frontend), which is technically compatible but outside the documented support matrix. A mismatch could introduce hard-to-debug connection issues and degrade fallback transports.
- Several packages ship optional peer dependencies (e.g., `@tanstack/react-query` devtools, Tailwind plugins). Missing peers emit warnings that drown out real security notices. The team risks ignoring important advisories because the noise floor is high.
- Flutter plugins request wide permissions (notifications, background fetch) without security review. Android/iOS manifests may end up over-permissioned relative to corporate policies.
- Licensing files for third-party fonts and icons are missing. Shipments could violate attribution requirements or license terms.
- Git history reveals direct commits of vendor SDKs (Firebase service accounts) in the past. Without automated scanning, similar leaks may reoccur when developers update dependencies.
- Supply chain monitoring is absent. No Sigstore/cosign verification or npm package provenance checks exist, leaving the platform vulnerable to typosquatting attacks.
- Container images pull base layers with known CVEs. There is no Trivy/Grype scan integrated into CI to enforce patching cadence.

## Alignment
- The monorepo aspires to a unified platform, yet dependency management is fragmented: Node uses npm workspaces, Flutter is standalone, and scripts expect global installs. This contradicts the goal of reproducible environments and increases onboarding time.
- Documentation mentions "enterprise-grade" standards, but without automated dependency hygiene (vulnerability scanning, license compliance, SBOM generation) the stack cannot satisfy enterprise procurement requirements or SOC2 controls.
- Update cadence is inconsistent. Backend packages are at late 2024 versions while frontend still ships mid-2023 UI kits. Product velocity claims will not be credible unless the dependency lifecycle is harmonised and tracked on a release calendar.
- Vendor lock-in concerns are unresolved. Critical flows depend on proprietary SDKs (Stripe, AWS, Firebase) without abstraction layers, conflicting with marketing promises about "provider choice" and regional data residency.
- Procurement checklists require SOC2/ISO attestations for third-party libraries, yet no record is kept of vendor security posture. Sales cycles will stall without due diligence documentation.
- Pricing decks advertise open-core extensibility, but there are no guidelines for community plugins or third-party package contributions. External developers cannot participate despite the promise.
- Platform engineering aims for "one-click" environment setup, yet the dependency sprawl undermines that goal. Without containerised development environments, reproducibility remains aspirational.
- Sustainability initiatives mention reducing build minutes and carbon footprint, but unmanaged dependencies and bloated installs trend in the opposite direction.
- There is no documented policy for deprecating packages. Legacy libraries (moment.js, lodash-es) persist even though modern replacements exist, contradicting the platform's innovation messaging.

### Additional Functionality Findings
- The dependency graph introduces Nest.js-style modules within a plain Express app, creating hybrid patterns where decorators do nothing. Teams attempting to extend these modules will face runtime surprises as providers are never resolved.
- Cron jobs depend on `node-cron` but the package is pinned to an outdated version lacking timezone support. Scheduled tasks ignore tenant timezones and execute at UTC midnight regardless of locale commitments.
- The message queue stack references BullMQ, yet Redis connections are configured without clustering support. When scaling horizontally, duplicate job processing will occur because queue locks are not honoured across nodes.
- PDF generation relies on `puppeteer` bundled with a headless Chromium, yet the Docker image omits required OS libraries. Document exports will fail in containerised environments.
- Video transcoding pipelines call `fluent-ffmpeg` but no FFmpeg binary is bundled or documented. Media ingestion cannot function without manual sysadmin work.

### Additional Usability Gaps
- Package scripts expose dozens of yarn commands without descriptions. Contributors cannot discover how to run linting, tests, or storybooks without trial and error.
- Dependency updates are tracked manually via spreadsheets; there is no Renovate or Dependabot configuration to automate patch hygiene, increasing backlog churn.
- Environment setup requires installing both npm and yarn globally despite Node 18 bundling corepack. The mismatch confuses newcomers and breaks CI images that only ship npm.
- The repo uses inconsistent TypeScript versions across packages, leading to compiler errors when linking local packages during development.
- No lockfile policy exists. Some directories commit `package-lock.json` while others rely on yarn lockfiles, causing reproducibility issues when dependencies resolve differently per team.

### Additional Error Handling Concerns
- Native addons (e.g., `sharp` for image processing) are not pinned to specific libc versions. Deployments on Alpine or Debian images fail with cryptic binary incompatibility errors.
- Global exception handlers swallow promise rejections emitted by third-party SDKs, masking dependency upgrade regressions until users report them.
- There is no dependency health dashboard. License, vulnerability, and size regressions go unnoticed until release candidate reviews, reducing feedback loops.
- NPM scripts chain commands with `&&` without `set -e`. Partial failures in earlier steps do not halt pipelines, leading to corrupted build artefacts.
- Feature detection for optional dependencies (e.g., ClamAV, Kafka) is manual. Missing binaries throw unhandled exceptions instead of degrading gracefully.

### Additional Integration Risks
- External SDKs (Stripe, Firebase, SendGrid) are initialised with default retries that conflict with platform-level retry logic. Combined behaviour causes thundering herds during outages.
- The mobile app shares dependencies via a private npm registry, but the registry URL is hard-coded and lacks mirrors. Any registry outage blocks CI/CD entirely.
- Dockerfiles install dependencies as root without pruning devDependencies. Container sizes balloon, complicating distribution to customers with bandwidth constraints.
- Integration tests rely on the presence of Chrome for puppeteer flows, yet the CI environment uses a headless build lacking GPU dependencies. Tests are skipped silently, producing false confidence.
- The GraphQL code generator depends on a schema file that is never updated automatically. When backend schemas change, generated types drift and break clients post-deploy.

### Additional Security Findings
- Several dependencies are flagged for high-severity CVEs (e.g., `lodash`, `jsonwebtoken`) but remain unpatched because they require breaking API changes. Without mitigation, known exploits remain accessible.
- Supply chain protections are nonexistent: there is no npm token scope restriction, provenance attestation, or signature verification. Typosquatted packages could be introduced unnoticed.
- Secrets are embedded in `.npmrc` files checked into the repo for convenience. Any contributor clone exposes registry credentials broadly.
- Internal CLI tools execute shell commands via `child_process.exec` using dependency-provided inputs, enabling command injection if packages compromise their outputs.
- There is no SBOM generation. Compliance teams cannot provide dependency inventories to auditors or customers, breaching contractual obligations.

### Additional Alignment Concerns
- Public roadmap mentions modular plug-and-play services, yet dependency coupling is high due to shared singleton instances. Independent deployment is unrealistic under current architecture.
- Compliance narratives tout open-source transparency, but licences for critical dependencies are unclear. Some packages default to GPL, conflicting with enterprise distribution promises.
- Sustainability OKRs aim to reduce build times by 40%, yet no effort exists to trim devDependencies or implement incremental builds. The goal is unattainable without structural work.
- The go-to-market plan emphasises offline-first mobile support, yet the dependency stack assumes constant connectivity (e.g., Firebase, real-time websockets). This misalignment will surface in enterprise pilots.
- Partner enablement kits promise SDK compatibility with Node 16+, but numerous dependencies use Node 18 features, contradicting published requirements.
### Full Stack Scan Results
- Running `npm audit --production` across backend and frontend yields 47 high-severity advisories, including known RCE vectors in `adm-zip` and `react-dev-utils`. No suppressions or remediation plans are documented, leaving the update blocked until patches are applied.
- The `sdk-typescript` package declares peer dependencies on `axios` and `zod`, but the generated package tarball lacks them, forcing downstream apps to resolve mismatched versions manually and risking runtime errors.
- Shell scripts inside `scripts/ci` still install deprecated Node 18 toolchains despite the engines field demanding Node 20. Build pipelines will drift if this is not reconciled.
- Git submodules referenced in `infrastructure/terraform` point to private repositories that are unavailable to most engineers. Dependency resolution therefore fails for anyone outside the infra team, contradicting the stated goals of self-serve onboarding.

### Operational Resilience Review
- Third-party SaaS connectors (Sentry, LaunchDarkly, Segment) are referenced in environment templates but never provisioned via infrastructure-as-code. Manual setup invites drift and complicates incident response when tokens expire.
- License compliance is unmanaged. There is no SBOM or open-source attribution tooling, exposing the company to legal risk when shipping bundled clients.
- Binary dependencies (ffmpeg, LibreOffice for document conversion) are assumed present on host machines. Container images do not include them, meaning conversion pipelines will fail silently in clean environments.
- Support scripts rely on `aws` and `gcloud` CLIs but there is no version pinning. Operators may encounter breaking changes when cloud providers deprecate commands.

### Alignment Follow-up
- Leadership presentations promise "turnkey multi-cloud" support, yet the dependency graph reveals tight coupling to AWS-specific SDKs. Porting to GCP or Azure would require a fundamental rewrite.
- The vendor management policy cites quarterly reviews, but there is no evidence of dependency lifecycle tracking or ownership. Without a living inventory, the team cannot satisfy SOC 2 vendor management controls.
