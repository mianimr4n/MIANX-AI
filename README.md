# MIANX.AI

**Multi-Tenant AI-Native Business Operating System**

MIANX.AI is a domain-extensible, multi-tenant business operating system built with modern web technologies. It provides a core platform with pluggable business domains, AI-powered agents, role-based access control, and automated workflow orchestration.

## Architecture Overview

MIANX.AI follows a **Domain OS** model — a core platform that hosts independent business domains as modular plugins. Each domain declares its capabilities through a typed manifest, registers API routes, permissions, and AI tools.

```
┌─────────────────────────────────────────────────────┐
│                    MIANX.AI Core                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Tenancy  │ │   Auth   │ │  Domain  │             │
│  │ Isolation│ │  / RBAC  │ │  Engine  │             │
│  └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Billing  │ │   AI     │ │ Observ- │             │
│  │/Subs     │ │ Platform │ │ ability │             │
│  └──────────┘ └──────────┘ └──────────┘             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ Workflows│ │Integration│ │  Audit   │             │
│  └──────────┘ └──────────┘ └──────────┘             │
├─────────────────────────────────────────────────────┤
│              Domain Layer (Pluggable)                │
│  ┌─────────────────────────────────────────┐        │
│  │  Poultry Domain (reference implementation) │       │
│  │  Farms, Sheds, Flocks, Feed, Health, ...  │       │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Technology Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh/) 1.3+ |
| Framework | [Next.js](https://nextjs.org/) 16 (App Router, Standalone) |
| Language | TypeScript 5 (strict mode) |
| Database | [Prisma](https://www.prisma.io/) 6 with SQLite (extensible to PostgreSQL) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix UI |
| Auth | Supabase Auth (pluggable) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) 7 (OpenAI, Anthropic, Google) |
| State | Zustand, TanStack Query/Table |
| Validation | Zod 4 |

## Core Capabilities

### Multi-Tenancy
- Organization-scoped data isolation via Prisma query extension (`$allModels` + `$allOperations`)
- `AsyncLocalStorage`-based tenant context propagation
- 32 models with automatic `organizationId` filtering
- Cross-tenant query override throws `TenantContextError`

### Authorization (RBAC)
- Permission system: `domain.resource.action` format
- Wildcard matching (`*.*`, `*.view`, `organization.*`)
- Owner bypass (defense in depth)
- Fail-closed: missing authorization = automatic denial
- Role-based permission aggregation

### Domain Engine
- Manifest-based plugin architecture (`mianx-domain/v1` schema)
- Typed domain and module manifests with validation
- Permission, route, and dependency declarations
- Domain registration and activation per organization

### AI Platform
- Multi-provider support (OpenAI, Anthropic, Google) via Vercel AI SDK
- Per-organization AI usage tracking and daily limits
- Input validation (max 32K chars), token capping, monthly budget enforcement
- Agent runtime with domain-specific tool registration

### Observability
- Structured JSON logging with Pino-compatible format
- AI telemetry, SLO tracking, incident management
- Health check endpoint (`/api/observability/health`)
- Audit logging for compliance

## Repository Structure

```
src/
├── ai/                    # AI SDK configuration, tools, providers
├── app/                   # Next.js App Router
│   ├── api/              # 80 API routes (CRUD, AI, billing, etc.)
│   └── (pages)/          # Frontend pages
├── components/            # UI components (shadcn/ui, composite)
├── core/                  # Platform core (domain-agnostic)
│   ├── authorization/    # Auth context, permissions, RBAC middleware
│   ├── automation/       # Event bus, workflow engine, job queue
│   ├── billing/          # Subscriptions, invoices, entitlements
│   ├── domain/           # Manifest types, validator, registry
│   ├── integration/      # API keys, OAuth, webhooks
│   ├── observability/    # Logger, metrics, SLO, alerts, incidents
│   └── tenancy/          # Tenant context, Prisma extension, audit
├── database/              # Prisma client, seeds
├── domains/               # Business domain implementations
│   └── poultry/          # Reference domain (farms, flocks, sales, etc.)
├── hooks/                 # React hooks
├── lib/                   # Utilities (DB, env, supabase, helpers)
├── providers/             # React context providers
└── stores/                # Zustand state stores

prisma/                    # Database schema
scripts/                   # Test and utility scripts
docs/                      # Documentation
├── domains/poultry/       # Poultry domain docs (10 files)
└── production/            # Ops docs (env, backup, DR, go-live)
tests/                     # Infrastructure test scripts
.github/workflows/         # CI pipeline
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.3+
- A Supabase project (for auth) — optional in development mode

### Installation

```bash
git clone https://github.com/mianimr4n/MIANX-AI.git
cd MIANX-AI
bun install
```

### Environment Setup

```bash
cp .env.example .env.local
# Edit .env.local with your values
```

Required variables:
- `DATABASE_URL` — SQLite connection string (e.g., `file:./db/dev.db`)

Optional (for AI features):
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GOOGLE_GENERATIVE_AI_API_KEY`

See [`.env.example`](.env.example) for the complete list.

### Database Setup

```bash
# Generate Prisma client
bun run db:generate

# Push schema to database (development)
bun run db:push

# (Optional) Seed with sample data
bunx tsx src/database/seeds/seed.ts
```

### Running the Application

```bash
# Development
bun run dev

# Production build
bun run build
bun run start
```

The application starts at `http://localhost:3000`.

## Development Commands

```bash
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # Run ESLint
bunx tsc --noEmit   # TypeScript type checking
```

### Testing

```bash
# Core tenant isolation tests (56 test cases)
bun run scripts/test-tenant-isolation.ts

# Unit tests (Bun test runner)
bun test
```

### Prisma Commands

```bash
bun run db:generate   # Generate Prisma client
bun run db:push      # Push schema changes (dev)
bun run db:migrate   # Run migrations (production)
bun run db:reset     # Reset database (destructive)
```

## Docker

```bash
# Build
 docker build -t mianx-ai .

# Run
 docker run -p 3000:3000 -e DATABASE_URL='file:./db/prod.db' mianx-ai
```

The Dockerfile uses multi-stage builds with Bun, runs as non-root, and includes a health check.

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`) runs on push/PR to `main`:

1. Install dependencies (`bun install --frozen-lockfile`)
2. Generate Prisma client
3. ESLint
4. TypeScript type check (production mode)
5. Tenant isolation tests
6. Production build

## Security Model

- **Tenant Isolation**: Prisma extension auto-filters all queries by `organizationId`
- **Authentication**: Supabase Auth with JWT verification
- **Authorization**: Granular RBAC with `domain.resource.action` permissions
- **AI Safety**: Input length limits, token budgets, provider configuration guards
- **Production Hardening**: Dev-mode bypass headers blocked in production, security headers, CORS restrictions
- **Environment Validation**: Zod-validated env config; invalid config is fatal in production

## Documentation

- [Environment Security](docs/production/01-environment-security.md)
- [Backup & Recovery](docs/production/02-backup-recovery.md)
- [Disaster Recovery](docs/production/03-disaster-recovery.md)
- [Go-Live Checklist](docs/production/04-go-live-checklist.md)
- [Poultry Domain](docs/domains/poultry/01-domain-overview.md)

## Project Maturity

MIANX.AI has completed 11 development phases covering tenancy, authentication, authorization, domain engine, AI integration, observability, and production hardening. The platform is operational with one reference domain (Poultry) demonstrating the full domain extension model.

---

*MIANX.AI is a proprietary software product. See [LICENSE](LICENSE) for terms.*