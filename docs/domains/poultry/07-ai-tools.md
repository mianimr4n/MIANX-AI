# Poultry OS - AI Tools

8 domain-specific tools registered for Poultry OS agents. All tools execute within tenant scope using `ctx.organizationId`.

---

## 1. list_poultry_farms

List all farms for the organization with shed counts.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.farm.view` |
| **Tenant Scope** | `where: { organizationId: ctx.organizationId }` |
| **Used By** | Health Monitor |

### Input Schema

```json
{ }
```
No parameters required.

### Output

```json
[
  {
    "id": "...",
    "name": "Main Farm",
    "location": "Lagos",
    "capacity": 50000,
    "status": "active",
    "_count": { "sheds": 4 }
  }
]
```

---

## 2. list_poultry_flocks

List all flocks for the organization with shed and farm info.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.flock.view` |
| **Tenant Scope** | `where: { organizationId: ctx.organizationId }` |
| **Used By** | Flock Manager, Feed Optimizer, Health Monitor, Sales Analyst |

### Input Schema

```json
{ }
```
No parameters required.

### Output

```json
[
  {
    "id": "...",
    "breed": "Cobb 500",
    "status": "growing",
    "placed": 10000,
    "current": 9850,
    "shed": "Shed A1",
    "farm": "Main Farm",
    "placementDate": "2025-01-01T00:00:00.000Z"
  }
]
```

---

## 3. get_flock_metrics

Get key metrics for a specific flock: mortality rate, feed conversion, production data, age, and current count.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.flock.view` |
| **Tenant Scope** | `where: { id: flockId, organizationId: ctx.organizationId }` |
| **Used By** | Flock Manager, Feed Optimizer, Health Monitor |

### Input Schema

```json
{
  "flockId": { "type": "string", "description": "The flock ID to get metrics for" }
}
```

### Output

```json
{
  "flockId": "...",
  "breed": "Cobb 500",
  "status": "growing",
  "ageDays": 28,
  "placed": 10000,
  "current": 9850,
  "mortality": 150,
  "mortalityRate": "1.50%",
  "totalFeedKg": 4200.5,
  "totalFeedCost": 1680.20,
  "totalEggs": 0,
  "totalProductionKg": 0
}
```

**Computed Fields:** `ageDays` = days since placement, `mortalityRate` = (deaths / placed * 100)

---

## 4. get_mortality_trends

Get mortality records for a flock showing date, count, and cause.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.health.view` |
| **Tenant Scope** | `where: { flockId, organizationId: ctx.organizationId }` |
| **Used By** | Flock Manager, Health Monitor |

### Input Schema

```json
{
  "flockId": { "type": "string", "description": "The flock ID" },
  "limit": { "type": "number", "description": "Max records to return (default 10)" }
}
```

### Output

```json
[
  {
    "id": "...",
    "flockId": "...",
    "date": "2025-01-20T00:00:00.000Z",
    "count": 5,
    "cause": "Heat stress",
    "notes": null
  }
]
```
**Limit:** Min(1..50), defaults to 10.

---

## 5. get_health_records

Get health records (vaccinations, treatments, checkups, emergencies) for a flock.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.health.view` |
| **Tenant Scope** | `where: { flockId, organizationId: ctx.organizationId }` |
| **Used By** | Flock Manager, Health Monitor |

### Input Schema

```json
{
  "flockId": { "type": "string", "description": "The flock ID" },
  "type": { "type": "string", "description": "Filter by type: vaccination, treatment, checkup, emergency" }
}
```

### Output

```json
[
  {
    "id": "...",
    "flockId": "...",
    "date": "2025-01-15T00:00:00.000Z",
    "type": "vaccination",
    "treatment": "Newcastle disease vaccine",
    "veterinarian": "Dr. Smith",
    "costUsd": 50.00,
    "nextDueDate": "2025-04-15T00:00:00.000Z"
  }
]
```
**Limit:** Returns up to 20 records, ordered by date descending.

---

## 6. get_feed_usage

Get feed consumption records for a flock with totals and cost data.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.feed.view` |
| **Tenant Scope** | `where: { flockId, organizationId: ctx.organizationId }` |
| **Used By** | Feed Optimizer |

### Input Schema

```json
{
  "flockId": { "type": "string", "description": "The flock ID" }
}
```

### Output

```json
{
  "records": [
    {
      "id": "...",
      "flockId": "...",
      "date": "2025-01-28T00:00:00.000Z",
      "feedType": "Broiler Grower",
      "quantityKg": 150.0,
      "costUsd": 60.00
    }
  ],
  "totalKg": 4200.5,
  "totalCost": 1680.20
}
```
**Limit:** Returns up to 20 records plus aggregate totals.

---

## 7. get_production_data

Get egg production and weight records for a flock.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.production.view` |
| **Tenant Scope** | `where: { flockId, organizationId: ctx.organizationId }` |
| **Used By** | Feed Optimizer, Sales Analyst |

### Input Schema

```json
{
  "flockId": { "type": "string", "description": "The flock ID" }
}
```

### Output

```json
{
  "records": [
    {
      "id": "...",
      "flockId": "...",
      "date": "2025-01-28T00:00:00.000Z",
      "eggsCollected": 8500,
      "totalWeightKg": 505.0,
      "feedConversionRatio": 2.1
    }
  ],
  "totalEggs": 127000,
  "totalKg": 7550.0
}
```
**Limit:** Returns up to 20 records plus aggregate totals.

---

## 8. get_sales_data

Get recent sales data and revenue summary for the organization.

| Property | Value |
|----------|-------|
| **Permission** | `poultry.sale.view` |
| **Tenant Scope** | `where: { organizationId: ctx.organizationId }` |
| **Used By** | Sales Analyst |

### Input Schema

```json
{
  "days": { "type": "number", "description": "Number of days to look back (default 30)" }
}
```

### Output

```json
{
  "sales": [
    {
      "id": "...",
      "date": "2025-01-28T00:00:00.000Z",
      "items": "...",
      "totalAmount": 2500.00,
      "currency": "USD",
      "status": "completed",
      "customer": { "name": "ABC Markets" }
    }
  ],
  "totalRevenue": 18500.00,
  "completedSales": 12
}
```
**Notes:** Revenue and count only include `status: completed` sales. Returns up to 20 sales records.

---

## Tool Summary

| # | Tool Name | Permission | Tenant Isolated | Max Results |
|---|-----------|-----------|----------------|-------------|
| 1 | `list_poultry_farms` | poultry.farm.view | Yes | All farms |
| 2 | `list_poultry_flocks` | poultry.flock.view | Yes | All flocks |
| 3 | `get_flock_metrics` | poultry.flock.view | Yes | 1 flock |
| 4 | `get_mortality_trends` | poultry.health.view | Yes | 50 max |
| 5 | `get_health_records` | poultry.health.view | Yes | 20 max |
| 6 | `get_feed_usage` | poultry.feed.view | Yes | 20 max |
| 7 | `get_production_data` | poultry.production.view | Yes | 20 max |
| 8 | `get_sales_data` | poultry.sale.view | Yes | 20 max |