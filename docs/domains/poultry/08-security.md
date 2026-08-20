# Poultry OS - Security

Security model for Poultry OS, built on MIANX.AI core security primitives.

---

## Tenant Isolation

### Database-Level Isolation

Every Poultry model includes `organizationId` as a required field. All Prisma queries include `organizationId` in the `where` clause:

```typescript
// Service pattern — always filter by organizationId
const farms = await db.poultryFarm.findMany({
  where: { organizationId },  // never missing
  ...
})
```

### AI Tool Isolation

All 8 AI tools receive `ctx.organizationId` from the auth context and scope every query:

```typescript
async execute(args, ctx) {
  const records = await db.poultryFeedRecord.findMany({
    where: { flockId: args.flockId, organizationId: ctx.organizationId },
  })
}
```

### Organization Header

The `withAuth` middleware extracts `X-Organization-Id` from **headers only** (never from body or query params) — defense in depth against org spoofing.

---

## RBAC (Role-Based Access Control)

### Permission Enforcement Flow

```
1. Client sends request with Authorization + X-Organization-Id headers
2. withAuth() middleware resolves Supabase user
3. AuthContext loaded: user, org, membership, roles, permissions[]
4. requirePermission(ctx, 'poultry.farm.create') checks permissions[]
5. If missing → HTTP 403 { error: "..." }
6. If valid → withTenant() sets async context, handler executes
```

### Route-Level Permission Binding

Every API route handler declares its required permission:

```typescript
export const GET = withAuth(async (request, ctx) => {
  return farmService.listFarms(ctx.organizationId)
}, { permission: 'poultry.farm.view' })
```

### AI Tool Permission Binding

Every AI tool declares `requiredPermission`:

```typescript
const getFlockMetricsTool: ToolDefinition = {
  name: 'get_flock_metrics',
  requiredPermission: 'poultry.flock.view',
  async execute(args, ctx) { ... }
}
```

### Fail-Closed Default

- Missing auth info → HTTP 401
- Invalid/missing organization header → HTTP 400
- Permission not in user's set → HTTP 403
- AI tool permission not held → tool execution blocked
- Unhandled auth errors → HTTP 500 (logged, not leaked)

---

## Input Validation

### Server-Side Validation Layer

All write endpoints use dedicated validators from `validation.ts`:

| Validator | Checks |
|-----------|--------|
| `validateCreateFarm` | name (non-empty), location (non-empty), capacity (>= 0), lat/lng ranges |
| `validateUpdateFarm` | Same as create, plus status enum check |
| `validateCreateShed` | farmId (required), name, shedType enum, capacity |
| `validateUpdateShed` | name, shedType, capacity, currentCount (int), temp (-50..80), humidity (0..100) |
| `validateCreateFlock` | shedId, breed, placementDate (valid date), quantity (positive int) |
| `validateUpdateFlock` | status enum, averageWeight (0..50), currentCount (non-neg int) |
| `validateRecordMortality` | flockId, date, count (positive int), cause |
| `validateCreateFeedRecord` | flockId, date, feedType, quantityKg (positive), costUsd (>= 0) |
| `validateCreateHealthRecord` | flockId, date, type enum, treatment, costUsd, nextDueDate |
| `validateCreateProductionRecord` | flockId, date, eggsCollected (int), totalWeightKg, FCR (0..10) |
| `validateCreateProcurement` | type enum, supplier, description, quantity (positive), unitCostUsd |
| `validateCreateSale` | items (object), totalAmount (>= 0), currency (string) |
| `validateCreateCustomer` | name, email (format check if provided) |

### Validation Response Format

```json
// HTTP 400
{ "error": "name: name is required and must be non-empty; location: location is required" }
```

---

## AI Safety

### Tool Scope Limitation

- AI tools can **only read** data — no write/mutate tools exist
- Tools are scoped to specific modules (feed, health, production, sales)
- No tool can access cross-tenant data
- Result sets are capped (20-50 records max)

### Agent Boundaries

- Each agent has a fixed set of tools (defined in registry)
- Agents cannot call tools outside their assigned set
- System prompts include explicit rules (e.g., "Always use tools before recommending")
- No agent has access to write APIs or admin operations

### Temperature Settings

| Agent | Temperature | Rationale |
|-------|------------|-----------|
| Feed Optimizer | 0.3 | Analytical, needs precise numbers |
| Health Monitor | 0.3 | Safety-critical, needs consistency |
| Flock Manager | 0.4 | Balanced insight + data |
| Sales Analyst | 0.5 | More creative for forecasting |

---

## Cascade Safety

Delete operations use Prisma cascade rules. Be aware of data loss scope:

| Delete Target | Also Deleted |
|---------------|-------------|
| Farm | All sheds, flocks, feed/health/mortality/production records |
| Shed | All flocks, feed/health/mortality/production records |
| Feed/Health/Production/Mortality record | Only that record |
| Sale | Only that record (customer preserved via SetNull) |

**Recommendation:** Consider soft-delete for production deployments.
