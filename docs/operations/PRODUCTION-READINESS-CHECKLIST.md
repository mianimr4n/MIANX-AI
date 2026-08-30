# MIANX.AI — Production Readiness Checklist

**Purpose:** Single operational gate for production launch. Source code alone is never sufficient evidence for launch.

## 1. Deployment

- [ ] One authoritative production deployment path selected and documented.
- [ ] Production image/build is reproducible.
- [ ] CI runs typecheck, lint, tests, Prisma validation and build.
- [ ] Deployment runs database migrations before serving new application code.
- [ ] Rollback procedure tested on a non-production environment.
- [ ] Previous known-good application image/commit is retained for rollback.

## 2. Database

- [ ] `DATABASE_URL` points to the production pooled/runtime connection.
- [ ] `DIRECT_URL` points to the production direct migration connection.
- [ ] `prisma migrate deploy` succeeds against the production database.
- [ ] Financial schema migration is applied and verified.
- [ ] Backups are enabled.
- [ ] Backup retention target is documented.
- [ ] Restore test has been performed and recorded.
- [ ] Database connection limits and pool settings are appropriate for deployment scale.

## 3. Redis / Distributed Controls

- [ ] Production `REDIS_URL` is configured.
- [ ] Redis authentication is enabled.
- [ ] Redis is not publicly exposed.
- [ ] Application fails closed when configured Redis is unavailable for distributed rate limiting.
- [ ] Redis persistence/recovery expectations are documented.
- [ ] Rate-limit behavior is verified across more than one application instance if horizontally scaled.

## 4. Authentication & Authorization

- [ ] Supabase production project is configured.
- [ ] Production Supabase URL and public key are configured.
- [ ] Service-role key is stored only as a server secret.
- [ ] Login/signup/password recovery tested with real accounts.
- [ ] Organization onboarding tested for a first-time user.
- [ ] RBAC tested for allowed and denied actions.
- [ ] Admin access tested with a real platform-admin account.
- [ ] Cross-tenant IDOR tests pass.

## 5. Security

- [ ] Production CSP/security headers verified on the live domain.
- [ ] Public health endpoint exposes no sensitive configuration.
- [ ] Webhook signatures and freshness checks verified.
- [ ] Webhook SSRF protections verified.
- [ ] Secrets are absent from repository history and build artifacts.
- [ ] Authentication, authorization and tenant isolation regression suites pass.
- [ ] Rate limiting is active on AI and other abuse-sensitive endpoints.

## 6. Billing & Revenue

- [ ] Stripe production account approved and enabled.
- [ ] Products/prices created and their IDs configured.
- [ ] `STRIPE_SECRET_KEY` configured server-side.
- [ ] `STRIPE_WEBHOOK_SECRET` configured server-side.
- [ ] Public Stripe key configured where required by the UI.
- [ ] Webhook endpoint is reachable over HTTPS.
- [ ] Checkout succeeds in Stripe test mode.
- [ ] `checkout.session.completed` activates the correct organization subscription.
- [ ] Replayed webhook does not duplicate subscription/invoice/payment records.
- [ ] Invoice/payment records reconcile with Stripe amounts.
- [ ] Upgrade, cancellation and failed-payment paths are tested.
- [ ] Refund policy and customer-facing billing terms are approved.

## 7. Observability & Incident Response

- [ ] Application error logging is enabled without secrets/PII leakage.
- [ ] Deployment health checks are monitored.
- [ ] Database/Redis availability is monitored.
- [ ] Critical application errors have alerting.
- [ ] Incident owner and escalation path are documented.
- [ ] Recovery/DR procedure is documented.
- [ ] Audit logs are retained according to policy.
- [ ] Data retention/deletion policy is documented.

## 8. Domain / Legal / Customer Readiness

- [ ] Production DNS is configured.
- [ ] TLS certificate is valid and auto-renewal is verified.
- [ ] `NEXT_PUBLIC_APP_URL` matches the canonical public domain.
- [ ] Privacy Policy published.
- [ ] Terms of Service published.
- [ ] Refund/cancellation policy published.
- [ ] Support/contact ownership confirmed.

## Launch Decision

### PRIVATE ALPHA
Allowed when engineering gates pass but live production/revenue evidence is incomplete.

### PUBLIC BETA
Requires live authentication, tenant isolation, database migration, monitoring, rollback and security evidence.

### REVENUE READY
Requires all PUBLIC BETA gates plus a successful real Stripe test flow, webhook reconciliation and approved billing/legal terms.

### PUBLIC LAUNCH
Requires REVENUE READY plus verified backups/restore, incident response, rollback and operational ownership.

**Rule:** An unchecked item is not assumed complete. Record evidence or leave it open.
