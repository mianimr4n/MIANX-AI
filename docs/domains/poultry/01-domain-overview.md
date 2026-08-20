# Poultry OS - Domain Overview

> Mianx Poultry OS v1.0.0 | First production domain of MIANX.AI

## Domain Goals

- **Validate multi-domain architecture** — Poultry OS proves the manifest-based domain registration pattern works end-to-end.
- **End-to-end poultry management** — Cover the full operational lifecycle: farms, sheds, flocks, feed, health, production, procurement, and sales.
- **AI-native operations** — 4 domain-specific AI agents with 8 scoped tools provide real-time insights.
- **Zero core contamination** — No poultry-specific logic exists inside Core code; all domain logic is self-contained.

## Architecture Diagram

```
                         MIANX.AI Platform Core
  ┌──────────────────────────────────────────────────────────────┐
  │  Auth (Supabase)  │  RBAC  │  Billing  │  Events  │  AI    │
  │  withAuth/withAuthParams middleware                 │
  └──────────┬───────────────────────────────────┬───────────────┘
             │           Domain Manifest Registry │
  ┌──────────▼───────────────────────────────────▼───────────────┐
  │              POULTRY OS DOMAIN (slug: poultry)                │
  │                                                               │
  │  ┌─────────┐ ┌───────┐ ┌────────┐ ┌──────┐ ┌────────────┐  │
  │  │  Farm   │ │ Shed  │ │ Flock  │ │ Feed │ │   Health   │  │
  │  └────┬────┘ └───┬───┘ └───┬────┘ └──┬───┘ └─────┬──────┘  │
  │       │          │         │         │            │          │
  │       └──────────┴────┬────┴─────────┴────────────┘          │
  │                        │                                       │
  │  ┌──────────┐ ┌───────┐┌┴────────┐ ┌──────┐                  │
  │  │Production│ │Sales  ││Procure. │ │ AI   │  4 Agents       │
  │  └──────────┘ └───────┘└─────────┘ │Tools │  8 Tools        │
  │                                     └──────┘                  │
  └──────────────────────────────────────────────────────────────┘
             │
  ┌──────────▼──────────┐
  │   SQLite (Prisma)    │
  │   10 Poultry Models  │
  └─────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma ORM |
| Auth | Supabase Auth + withAuth/withAuthParams middleware |
| RBAC | Permission-key based (poultry.* namespace) |
| Tenant Isolation | organizationId on every query |
| API Responses | apiEnvelope (data + meta + timestamp) |
| Validation | Server-side validators (validation.ts) |
| AI | OpenAI (gpt-4o-mini), Anthropic (claude-sonnet-4) |
| UI | Tailwind CSS 4, shadcn/ui |

## Module Dependency Graph

```
farm (entry) → shed → flock → feed
                                    → health
                                    → production
                    procurement (standalone)
                    sales (standalone, references customers)
```

## Module List

| # | Slug | Name | Description |
|---|------|------|-------------|
| 1 | farm | Farm Management | Farm locations, capacity, status |
| 2 | shed | Shed Management | Shed types, capacity, environment |
| 3 | flock | Flock Management | Flock lifecycle, growth, weight |
| 4 | feed | Feed Tracking | Consumption, conversion, costs |
| 5 | health | Health Records | Vaccinations, treatments, mortality |
| 6 | production | Production Metrics | Egg production, body weight, FCR |
| 7 | procurement | Procurement | Chicks, feed, medicine, equipment |
| 8 | sales | Sales | Transactions, customers, revenue |

## Domain Configuration Fields

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| poultry.default_flock_cycle_days | number | 42 | Default cycle length for broiler flocks |
| poultry.weight_unit | select | kg | Unit for weight measurements (kg/lb) |
| poultry.feed_unit | select | kg | Unit for feed quantities (kg/lb/tons) |
| poultry.mortality_threshold_percent | number | 5 | Alert when daily mortality exceeds this % |

## Key Files

| File | Purpose |
|------|---------|
| `src/domains/poultry/manifest.ts` | Domain manifest (modules, permissions, routes, config) |
| `src/domains/poultry/validation.ts` | Input validation for all write endpoints |
| `src/domains/poultry/agents/registry.ts` | 4 AI agent definitions |
| `src/domains/poultry/agents/tools.ts` | 8 AI tool implementations |
| `src/domains/poultry/services/*.ts` | Service layer (8 service files) |
| `src/app/api/poultry/**/*.ts` | API route handlers |
| `prisma/schema.prisma` | 10 Poultry models + 6 enums |
