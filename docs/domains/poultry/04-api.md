# Poultry OS - API Reference

All Poultry OS API routes. Every route is protected by `withAuth`/`withAuthParams` middleware.

## Response Envelope

All responses use `apiEnvelope()`:

```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "message": "optional message on error"
  }
}
```

- Success: HTTP 200 (201 on create)
- Not found: HTTP 404 (data is null, meta.message describes the error)
- Validation error: HTTP 400 `{ error: "field: message; ..." }`
- Auth error: HTTP 401/403 `{ error: "..." }`

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | Supabase JWT bearer token |
| `X-Organization-Id` | Yes | Tenant organization ID |
| `Content-Type` | On POST/PATCH | `application/json` |

---

## Farm Routes

### GET /api/poultry/farms

List all farms for the organization.

| Field | Value |
|-------|-------|
| Permission | `poultry.farm.view` |
| Query Params | `status` (optional: active/inactive/under_maintenance) |
| Response | `apiEnvelope(PoultryFarm[])` with `_count.sheds` |

### POST /api/poultry/farms

Create a new farm.

| Field | Value |
|-------|-------|
| Permission | `poultry.farm.create` |
| Input | `{ name, location, capacity?, contactInfo?, latitude?, longitude? }` |
| Response | `apiEnvelope(PoultryFarm)` (HTTP 201) |

### GET /api/poultry/farms/[id]

Get a farm with its sheds and per-shed flock counts.

| Field | Value |
|-------|-------|
| Permission | `poultry.farm.view` |
| Response | `apiEnvelope(PoultryFarm)` with nested `sheds` and `_count.flocks` |

### PATCH /api/poultry/farms/[id]

Update farm fields.

| Field | Value |
|-------|-------|
| Permission | `poultry.farm.update` |
| Input | `{ name?, location?, capacity?, status?, contactInfo?, latitude?, longitude? }` |
| Response | `apiEnvelope(PoultryFarm)` |

### DELETE /api/poultry/farms/[id]

Delete a farm (cascades to sheds and nested flocks).

| Field | Value |
|-------|-------|
| Permission | `poultry.farm.delete` |
| Response | `apiEnvelope({ deleted: true })` |

---

## Shed Routes

### GET /api/poultry/sheds

| Permission | `poultry.shed.view` |
|---|---|
| Query | `farmId` (optional) |
| Response | `apiEnvelope(PoultryShed[])` with `_count.flocks` |

### POST /api/poultry/sheds

| Permission | `poultry.shed.create` |
|---|---|
| Input | `{ farmId, name, shedType?, capacity? }` |
| Response | `apiEnvelope(PoultryShed)` (201) |

### GET /api/poultry/sheds/[id]

| Permission | `poultry.shed.view` |
|---|---|
| Response | `apiEnvelope(PoultryShed)` with `_count.flocks` |

### PATCH /api/poultry/sheds/[id]

| Permission | `poultry.shed.update` |
|---|---|
| Input | `{ name?, shedType?, capacity?, currentCount?, temperature?, humidity?, status? }` |
| Response | `apiEnvelope(PoultryShed)` |

### DELETE /api/poultry/sheds/[id]

| Permission | `poultry.shed.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Flock Routes

### GET /api/poultry/flocks

| Permission | `poultry.flock.view` |
|---|---|
| Query | `shedId`, `status` (optional) |
| Response | `apiEnvelope(PoultryFlock[])` with shed and farm info |

### POST /api/poultry/flocks

| Permission | `poultry.flock.create` |
|---|---|
| Input | `{ shedId, breed, placementDate, quantity }` |
| Response | `apiEnvelope(PoultryFlock)` (201) |

### GET /api/poultry/flocks/[id]

| Permission | `poultry.flock.view` |
|---|---|
| Response | `apiEnvelope(PoultryFlock)` |

### PATCH /api/poultry/flocks/[id]

| Permission | `poultry.flock.update` |
|---|---|
| Input | `{ status?, currentCount?, averageWeight?, notes? }` |
| Response | `apiEnvelope(PoultryFlock)` |

---

## Feed Routes

### GET /api/poultry/feed

| Permission | `poultry.feed.view` |
|---|---|
| Query | `flockId` (optional) |
| Response | `apiEnvelope(PoultryFeedRecord[])` |

### POST /api/poultry/feed

| Permission | `poultry.feed.create` |
|---|---|
| Input | `{ flockId, date, feedType, quantityKg, costUsd?, notes? }` |
| Response | `apiEnvelope(PoultryFeedRecord)` (201) |

### DELETE /api/poultry/feed/[id]

| Permission | `poultry.feed.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Health Routes

### GET /api/poultry/health

| Permission | `poultry.health.view` |
|---|---|
| Query | `flockId` (optional) |
| Response | `apiEnvelope(PoultryHealthRecord[])` |

### POST /api/poultry/health

| Permission | `poultry.health.create` |
|---|---|
| Input | `{ flockId, date, type, treatment, veterinarian?, costUsd?, nextDueDate?, notes? }` |
| Response | `apiEnvelope(PoultryHealthRecord)` (201) |

### DELETE /api/poultry/health/[id]

| Permission | `poultry.health.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Production Routes

### GET /api/poultry/production

| Permission | `poultry.production.view` |
|---|---|
| Query | `flockId` (optional) |
| Response | `apiEnvelope(PoultryProductionRecord[])` |

### POST /api/poultry/production

| Permission | `poultry.production.create` |
|---|---|
| Input | `{ flockId, date, eggsCollected?, totalWeightKg?, feedConversionRatio?, notes? }` |
| Response | `apiEnvelope(PoultryProductionRecord)` (201) |

### DELETE /api/poultry/production/[id]

| Permission | `poultry.production.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Procurement Routes

### GET /api/poultry/procurement

| Permission | `poultry.procurement.view` |
|---|---|
| Query | `type` (optional: chick/feed/medicine/equipment/supplies) |
| Response | `apiEnvelope(PoultryProcurement[])` |

### POST /api/poultry/procurement

| Permission | `poultry.procurement.create` |
|---|---|
| Input | `{ type, supplier, description, quantity, unit?, unitCostUsd?, date?, deliveryDate?, notes? }` |
| Response | `apiEnvelope(PoultryProcurement)` (201) |

### PATCH /api/poultry/procurement/[id]

| Permission | `poultry.procurement.update` |
|---|---|
| Input | `{ status?, deliveryDate?, notes?, ... }` |
| Response | `apiEnvelope(PoultryProcurement)` |

### DELETE /api/poultry/procurement/[id]

| Permission | `poultry.procurement.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Sales Routes

### GET /api/poultry/sales

| Permission | `poultry.sale.view` |
|---|---|
| Query | `status` (optional: pending/completed/cancelled) |
| Response | `apiEnvelope(PoultrySale[])` with customer info |

### POST /api/poultry/sales

| Permission | `poultry.sale.create` |
|---|---|
| Input | `{ customerId?, items, totalAmount, currency?, date?, notes? }` |
| Response | `apiEnvelope(PoultrySale)` (201) |

### PATCH /api/poultry/sales/[id]

| Permission | `poultry.sale.update` |
|---|---|
| Input | `{ status?, totalAmount?, notes? }` |
| Response | `apiEnvelope(PoultrySale)` |

### DELETE /api/poultry/sales/[id]

| Permission | `poultry.sale.delete` |
|---|---|
| Response | `apiEnvelope({ deleted: true })` |

---

## Customer Routes

### GET /api/poultry/customers

| Permission | `poultry.sale.view` |
|---|---|
| Response | `apiEnvelope(PoultryCustomer[])` |

### POST /api/poultry/customers

| Permission | `poultry.sale.create` |
|---|---|
| Input | `{ name, phone?, email?, address? }` |
| Response | `apiEnvelope(PoultryCustomer)` (201) |

---

## Dashboard Route

### GET /api/poultry/dashboard

Aggregate dashboard statistics.

| Permission | `poultry.dashboard.view` |
|---|---|
| Response | `apiEnvelope({ totalFarms, activeFarms, totalSheds, totalCapacity, totalBirds })` |

---

## Route Summary

| Method | Path | Permission | Count |
|--------|------|-----------|-------|
| GET/POST/GET/PATCH/DELETE | `/api/poultry/farms[/id]` | farm.* | 5 |
| GET/POST/GET/PATCH/DELETE | `/api/poultry/sheds[/id]` | shed.* | 5 |
| GET/POST/GET/PATCH | `/api/poultry/flocks[/id]` | flock.* | 4 |
| GET/POST/DELETE | `/api/poultry/feed[/id]` | feed.* | 3 |
| GET/POST/DELETE | `/api/poultry/health[/id]` | health.* | 3 |
| GET/POST/DELETE | `/api/poultry/production[/id]` | production.* | 3 |
| GET/POST/PATCH/DELETE | `/api/poultry/procurement[/id]` | procurement.* | 4 |
| GET/POST/PATCH/DELETE | `/api/poultry/sales[/id]` | sale.* | 4 |
| GET/POST | `/api/poultry/customers` | sale.* | 2 |
| GET | `/api/poultry/dashboard` | dashboard.view | 1 |
| **Total** | | | **34** |