# MIANX.AI — Phase 29 CEO Audit & Remediation

**Date:** 2026-08-30  
**Repository:** `mianimr4n/MIANX-AI`  
**Branch:** `main`

## Executive Verdict

**Status: NOT READY FOR PUBLIC PRODUCTION**

The repository is actively maintained and the core SaaS architecture is substantially implemented. During this review, several previously fixed security and launch issues were found to have regressed on `main`; those regressions were remediated directly in GitHub.

Production launch is still blocked by external infrastructure/configuration that cannot be safely fabricated:

1. Production database migration/state must be verified against the real database.
2. Supabase production credentials/auth configuration must be verified.
3. Stripe secret/webhook credentials and real Stripe Price IDs must be configured.
4. A real production deployment must be verified end-to-end.
5. Distributed Redis requires the Redis client dependency/configuration to be verified; single-instance in-memory limiting remains the documented fallback.
6. Financial `Float` fields remain in the production Prisma schema and require a controlled Decimal migration before treating billing as financially production-grade.

## Verified Repository State

- Default branch: `main`
- Repository is public.
- Latest remediation commits were written directly to `main` through the connected GitHub integration.
- No open GitHub issues were returned for this repository at audit time.
- No obvious live Stripe/OpenAI/Supabase secrets were returned by targeted repository searches.

## Remediations Completed in This Phase

### P0 / Security

- Removed the Caddy `XTransformPort` query-driven localhost reverse-proxy SSRF vector.
- Removed internal phase/environment/preflight variable disclosure from public `/api/health`.
- Production PostgreSQL and Redis containers are now internal-only instead of exposing database ports publicly.
- Redis now requires `REDIS_PASSWORD` and the application receives an authenticated Redis URL.
- Added authenticated organization-aware AI rate limiting after tenant resolution.
- Kept AI input length and token-budget protections.

### Billing / Revenue

- Hardened Stripe Checkout input validation.
- Ensured a valid subscription foreign key exists before creating a pending payment record.
- Reworked Stripe webhook processing around the existing Event table as a durable event inbox using the Stripe event ID as the event primary key.
- Stripe webhook timestamps and HMAC signatures remain verified.
- Stripe subscription period dates are retrieved from Stripe when available rather than assuming a 30-day period.
- Invoice numbers now derive from the Stripe invoice ID and are upserted using the existing organization/invoice-number uniqueness constraint.
- Pending payment records can be marked succeeded when Stripe supplies a payment intent.

### Deployment / CI

- CI now supplies both `DATABASE_URL` and `DIRECT_URL` for Prisma production validation.
- Deployment workflow now migrates before startup and verifies the real deployment URL rather than checking the GitHub runner's localhost.
- Production Caddy configuration now defines HTTPS for `app.mianx.ai` and redirects the root domains to the app domain.
- Docker Compose no longer publishes PostgreSQL/Redis ports to the public host.

### Customer Journey

- `/signup` now opens the signup mode instead of silently opening normal login.
- Login now honors `?mode=signup`.
- Added a password recovery page using Supabase reset links.
- Added a password reset completion page.
- Pricing CTAs now route to signup; Enterprise routes to Contact Sales.
- Removed additional domain-specific marketing labels where generic platform language is more appropriate.

## Important Existing Strengths

- Phase 28 fixed the first-organization chicken-and-egg bug by allowing organization bootstrap without an existing `X-Organization-Id`.
- Server-side admin authorization uses `requirePlatformAdmin`.
- Tenant context is enforced for organization-scoped routes through the existing authorization/tenancy architecture.
- SSRF protection exists for outbound webhook URLs.
- Middleware uses Node.js runtime to avoid the earlier `node:dns/promises` Edge deployment failure.
- Stripe webhook signature verification uses timing-safe comparison and freshness checks.
- The repository contains a production PostgreSQL schema plus a separate SQLite development schema.
- Poultry is implemented as a reference domain rather than embedded in core tenancy logic.

## Remaining P0/P1 Work

### P0 — Must be verified before public launch

- Real production deployment and DNS/HTTPS verification.
- Real production database connectivity and `prisma migrate deploy` success.
- Supabase signup/login/session/reset flow in production.
- Cross-tenant authorization tests against a real production-like database.
- Stripe Checkout → payment → webhook → subscription → invoice → entitlement with Stripe test mode.

### P1 — Financial correctness

The current production Prisma schema still contains monetary `Float` fields in Plan, Invoice and Payment, plus monetary fields in the Poultry reference domain. These should be migrated to PostgreSQL `Decimal`/`NUMERIC` with application arithmetic updated to use exact decimal operations before declaring revenue production-ready.

### P1 — Rate limiting

The repository has a Redis-backed rate-limit abstraction, but `ioredis` is loaded dynamically and is not listed as a normal dependency in `package.json`. With no Redis client available it falls back to in-memory limiting. This is acceptable for a single-instance alpha but is not sufficient evidence for a horizontally scaled production deployment.

### P1 — Deployment architecture consistency

The repository contains both a Docker/Caddy VPS deployment path and a `vercel.json` file. The documented production architecture is Docker + managed PostgreSQL + Caddy, while GitHub currently reports a Vercel status check. These paths should be explicitly reconciled so there is one authoritative production deployment system.

## Revenue Readiness

**Revenue code: IMPLEMENTED BUT NOT VERIFIED IN REAL STRIPE.**

Present:
- Free / Pro / Enterprise plans
- Stripe Checkout route
- Stripe customer persistence
- Subscription state machine
- Stripe webhook endpoint
- Invoice generation
- Payment records
- Entitlement checks
- Billing UI and cancellation flow

Still required:
- Stripe production/test credentials
- Real Stripe Products/Prices
- Price IDs in plan metadata
- Webhook endpoint configured in Stripe
- End-to-end payment test
- Decimal financial migration

## Quality Evidence

Repository source inspection confirms the presence of the CI quality pipeline, tenant isolation tests, Prisma validation, TypeScript checks, ESLint, and production build steps. This GitHub-only audit cannot truthfully replace running the current HEAD in a local runtime; therefore current test counts from previous sessions are not re-certified here.

## GitHub Delivery

All remediation commits in this phase were written directly to the repository's `main` branch through the connected GitHub integration. This removes the previous local-PAT-only delivery bottleneck for these commits.

## CEO Decision

**Do not announce public production launch yet.**

The project has moved materially forward: critical regressions were corrected, the first-organization flow is fixed, billing/webhook handling is hardened, deployment configuration is safer, and the customer authentication path is more complete.

The highest-value next step is no longer another broad audit. It is **real environment activation and verification**:

`Production DB → Supabase → Stripe Test Mode → Deploy → Live E2E → Stripe payment test → Public Beta`
