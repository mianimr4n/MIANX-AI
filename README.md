# MIANX.AI

**Multi-Tenant AI-Native Business Operating System**

MIANX.AI is a domain-extensible, multi-tenant business operating system with pluggable business domains, AI-powered agents, role-based access control, workflow orchestration, integrations and subscription billing.

## Current Architecture

MIANX.AI follows a **Domain OS** model: a domain-agnostic core hosts independently registered business domains. Each domain can declare capabilities, permissions, routes and AI tools.

Core platform areas include:

- Multi-tenant organization isolation
- Supabase authentication and server-side RBAC
- Domain and module registry
- AI provider abstraction and agent runtime
- Workflow automation and jobs
- Integrations, API keys, OAuth and webhooks
- Subscription billing, Stripe Checkout, invoices and entitlements
- Audit logs, structured observability and health checks

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.3+ |
| Framework | Next.js 16 App Router |
| Language | TypeScript 5 strict mode |
| Production database | PostgreSQL via Prisma 6 |
| Local development database | SQLite via `prisma/schema.dev.prisma` |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix UI |
| Auth | Supabase Auth |
| AI | Vercel AI SDK with OpenAI, Anthropic and Google adapters |
| Validation | Zod 4 |
| Billing | Stripe Checkout + Stripe webhooks |

## Security Model

- Organization-scoped tenant context with Prisma query extensions.
- Server-side authentication and permission checks; frontend guards are not treated as authorization.
- Fail-closed RBAC and platform-admin checks.
- SSRF protection for outbound webhook URLs.
- Authenticated, organization-aware AI rate limiting.
- Production security headers and CSP.
- Stripe webhook HMAC verification with timing-safe comparison and freshness checks.
- No secrets committed to the repository.

## AI Safety

AI requests are provider-routed through server-side abstractions. Controls include input validation, token budgets, organization-aware rate limiting, provider allowlisting, PII redaction and audit logging. Provider credentials belong in environment/secret management, never in source control.

## Billing / Revenue

The revenue system is implemented but requires real environment verification before public launch:

- Free / Pro / Enterprise plans
- Stripe Checkout
- Stripe customer persistence
- Subscription state machine
- Stripe webhook handling and durable event idempotency
- Invoice and payment records
- Entitlement and usage checks
- Billing UI and cancellation flow

**Revenue status: IMPLEMENTED BUT NOT VERIFIED IN REAL STRIPE.** Production Stripe Price IDs, secrets, webhook configuration and an end-to-end test are still required.

## Repository Structure

```text
src/
├── ai/                    # AI SDK configuration, tools, providers
├── app/                   # Next.js App Router and API routes
├── components/            # UI components
├── core/                  # Authorization, tenancy, billing, domains, automation, observability
├── database/              # Prisma client and seeds
├── domains/               # Business domain implementations
├── hooks/                 # React hooks
├── lib/                   # Infrastructure utilities
├── providers/             # React providers
└── stores/                # Client state

prisma/                    # Production PostgreSQL and local SQLite schemas
scripts/                   # Test and utility scripts
docs/                      # Production, domain and audit documentation
tests/                     # Test infrastructure
.github/workflows/         # CI/CD
```

## Development

```bash
bun install
cp .env.example .env.local
bun run db:generate
bun run db:generate:dev
bun run db:push
bun run dev
```

Production database validation/migrations use the PostgreSQL schema and `DIRECT_URL`:

```bash
bun run db:validate
bun run db:migrate:deploy
bun run build
```

Tests:

```bash
bun test
bun run test:isolation
```

## Deployment

The repository contains a Docker + Caddy production deployment path using PostgreSQL and Redis. The deployment workflow performs database migration before startup and then verifies the configured live health URL.

The authoritative production target must be explicitly configured with its database, Supabase, Stripe, Redis and deployment secrets before public launch.

## Current Readiness

**Codebase:** substantially implemented and security-hardened.

**Public production:** NOT READY until real production infrastructure is verified.

**Revenue:** NOT READY until Stripe test-mode/live configuration and end-to-end payment flow are verified.

The canonical current audit and activation checklist is tracked in `docs/audits/PHASE-29-CEO-AUDIT.md` and GitHub issue #1.

---

*MIANX.AI is a proprietary software product. See [LICENSE](LICENSE) for terms.*
