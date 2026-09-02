# MIANX.AI — Financial Precision Migration Preflight

Status: PREPARED — implementation intentionally separated from inventory
Priority: P1
Scope: monetary values only

## Verified current state

The production Prisma schema currently stores core billing monetary values as PostgreSQL floating-point values:

- `Plan.basePrice` — `Float`
- `Invoice.subtotal` — `Float`
- `Invoice.discount` — `Float`
- `Invoice.tax` — `Float`
- `Invoice.total` — `Float`
- `Payment.amount` — `Float`

The existing initial PostgreSQL migration creates these fields as `DOUBLE PRECISION`.

## Target representation

Convert the core billing monetary fields above to Prisma `Decimal` backed by PostgreSQL `NUMERIC(18,2)`.

Do **not** blanket-convert every `Float` in the schema. Non-monetary floats such as AI temperature, SLO percentages, coordinates, measurements, quantities, weights, humidity and ratios remain outside this migration unless a later domain-specific financial audit proves otherwise.

## Migration safety requirements

1. Preserve the current production schema as the baseline.
2. Change only the six core billing monetary fields listed above.
3. Use an explicit PostgreSQL `USING` conversion with two-decimal rounding.
4. Do not use `prisma db push` for production migration.
5. Deploy with `prisma migrate deploy` only after CI validates the migration.
6. Treat Stripe as an integer minor-unit boundary; convert explicitly at the application boundary.
7. Ensure Prisma `Decimal` values are converted deliberately before JSON responses.
8. Add regression coverage for decimal arithmetic and Stripe conversion.
9. Verify tenant isolation is unchanged.
10. Keep the migration independently reversible at the database-operation level before production deployment.

## Application impact inventory

Known billing code paths requiring review after the schema type change:

- invoice generation/calculation
- billing subscriptions/revenue metrics
- checkout plan-price comparisons
- Stripe checkout amount handling
- Stripe webhook payment/invoice writes
- public pricing serialization
- billing dashboard serialization/types
- billing seeds and debug/test scripts

The invoice generator currently performs JavaScript arithmetic on plan, seat and usage amounts; this must be changed to deterministic decimal arithmetic rather than relying on binary floating-point addition.

## Poultry domain decision

Poultry financial fields are intentionally **not** included in this core billing migration. They require a separate domain-level assessment because the current schema contains `costUsd`, `totalAmount`, `unitCostUsd`, and `totalCostUsd` as floats alongside quantities and operational measurements.

That separation reduces blast radius and avoids silently changing domain behavior during the platform billing migration.

## Required verification gates

Before marking this work complete:

- Prisma schema validation: PASS
- Prisma client generation: PASS
- TypeScript production typecheck: PASS
- lint: PASS
- core tests: PASS
- tenant isolation tests: PASS
- migration SQL review: PASS
- production Compose validation: PASS
- standalone production build: PASS
- financial regression tests: PASS

## Completion rule

This document records the verified inventory and migration contract only. The financial precision migration remains **PARTIALLY COMPLETE / IMPLEMENTATION PENDING** until the schema, migration SQL, dependent application code and regression tests are all changed and the complete verification sequence passes.
