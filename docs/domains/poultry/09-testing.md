# Poultry OS - Testing

Testing strategy and coverage areas for Poultry OS.

---

## Test Categories

### 1. Service Unit Tests

Test each service function in isolation against a test SQLite database.

| Area | What to Test |
|------|-------------|
| Farm Service | CRUD operations, stats aggregation, tenant filtering |
| Shed Service | CRUD with farm FK, cascade behavior |
| Flock Service | CRUD, mortality recording (count deduction), status transitions |
| Feed Service | Create + delete, flock filtering |
| Health Service | Create + delete, type filtering |
| Production Service | Create + delete, flock filtering |
| Procurement Service | Full CRUD, type filtering |
| Sales Service | Full CRUD, customer creation |

### 2. Validation Tests

Test every validator function with valid and invalid inputs.

| Validator | Valid Cases | Invalid Cases |
|-----------|------------|---------------|
| `validateCreateFarm` | All fields, optional fields | Missing name, missing location, bad lat/lng |
| `validateCreateShed` | With/without shedType | Missing farmId, invalid shedType |
| `validateCreateFlock` | Full data | Bad date, quantity < 1, missing breed |
| `validateRecordMortality` | Full data | Missing cause, count = 0 |
| `validateCreateFeedRecord` | Full data | Negative quantity, missing feedType |
| `validateCreateHealthRecord` | With/without nextDueDate | Invalid type, missing treatment |
| `validateCreateProductionRecord` | With FCR | FCR > 10, negative eggs |
| `validateCreateProcurement` | All types | Invalid type, missing supplier |
| `validateCreateSale` | With customer | Missing items, negative amount |
| `validateCreateCustomer` | With/without email | Bad email format |

### 3. API Integration Tests

Test API routes end-to-end through the Next.js test harness.

| Area | What to Test |
|------|-------------|
| Auth enforcement | 401 without token, 403 without permission |
| Tenant isolation | Org A cannot see Org B's data |
| CRUD flows | Create → Read → Update → Delete for each module |
| Query filtering | `?status=`, `?farmId=`, `?flockId=` |
| Error responses | 404 for missing resource, 400 for validation errors |
| Response envelope | All responses match `{ data, meta: { timestamp } }` shape |

### 4. AI Tool Tests

Test tool execution with seeded data.

| Tool | Test Scenarios |
|------|---------------|
| `list_poultry_farms` | Returns farms for org, empty org returns [] |
| `list_poultry_flocks` | Returns flocks with shed/farm names |
| `get_flock_metrics` | Computes age, mortality rate, totals correctly |
| `get_mortality_trends` | Respects limit, orders by date desc |
| `get_health_records` | Filters by type, returns up to 20 |
| `get_feed_usage` | Returns records + totalKg + totalCost |
| `get_production_data` | Returns records + totalEggs + totalKg |
| `get_sales_data` | Respects days param, counts only completed |

### 5. AI Agent Tests

| Area | What to Test |
|------|-------------|
| Agent registry | All 4 agents registered with correct tools |
| Tool registry | All 8 tools registered with correct permissions |
| Tenant scoping | Tools receive and use organizationId |
| Permission check | Tools fail if user lacks requiredPermission |

---

## How to Run Tests

```bash
# Run all tests
npx jest

# Run Poultry-specific tests only
npx jest --testPathPattern poultry

# Run with coverage
npx jest --coverage --testPathPattern poultry

# Run a single test file
npx jest src/domains/poultry/__tests__/farm-service.test.ts
```

## Existing Test Scripts

| Script | Path | Purpose |
|--------|------|---------|
| `test-poultry.ts` | `scripts/test-poultry.ts` | Manual Poultry OS integration test |

## Coverage Areas Summary

| Layer | Covered | Notes |
|-------|---------|-------|
| Validation functions | Yes | 13 validators with valid/invalid cases |
| Service layer | Partial | CRUD flows for all 8 modules |
| API routes | Partial | Auth, tenant isolation, CRUD |
| AI tools | Partial | Basic execution tests |
| AI agents | Minimal | Registry validation |
| Cascade behavior | Minimal | Farm→Shed→Flock deletion chains |
| Dashboard stats | Minimal | Aggregate query correctness |

## Test Database

Tests should use a separate SQLite database (via `DATABASE_URL` env var) to avoid corrupting development data. The test script at `scripts/test-poultry.ts` demonstrates manual integration testing against the dev database.
