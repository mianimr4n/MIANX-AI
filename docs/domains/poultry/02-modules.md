# Poultry OS - Modules

Detailed reference for all 8 Poultry OS modules.

---

## 1. Farm Management

**Slug:** `farm` | **Entry Module:** Yes | **Dependencies:** None

Manage farm locations, capacity, contact info, and operational status.

### Services

| Function | Description |
|----------|-------------|
| `listFarms(orgId, { status? })` | List all farms with shed counts, filterable by status |
| `getFarm(orgId, id)` | Get farm with sheds (including flock counts per shed) |
| `createFarm(orgId, data)` | Create a new farm |
| `updateFarm(orgId, id, data)` | Update farm fields |
| `deleteFarm(orgId, id)` | Delete a farm (cascades to sheds) |
| `getFarmStats(orgId)` | Aggregate stats: total farms, sheds, capacity, live birds |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/farms` | List farms (query: `?status=active`) |
| POST | `/api/poultry/farms` | Create farm |
| GET | `/api/poultry/farms/[id]` | Get single farm |
| PATCH | `/api/poultry/farms/[id]` | Update farm |
| DELETE | `/api/poultry/farms/[id]` | Delete farm |

### Validation

- **Create:** `name` (required), `location` (required), `capacity` (>= 0), `latitude` (-90..90), `longitude` (-180..180)
- **Update:** All fields optional; `status` must be one of `active|inactive|under_maintenance`

---

## 2. Shed Management

**Slug:** `shed` | **Entry Module:** No | **Dependencies:** farm

Track shed types, capacity, environmental conditions, and occupancy.

### Services

| Function | Description |
|----------|-------------|
| `listSheds(orgId, { farmId? })` | List sheds, filterable by farm |
| `getShed(orgId, id)` | Get shed with flock counts |
| `createShed(orgId, data)` | Create shed (requires farmId) |
| `updateShed(orgId, id, data)` | Update shed including environmental readings |
| `deleteShed(orgId, id)` | Delete shed (cascades to flocks) |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/sheds` | List sheds (query: `?farmId=`) |
| POST | `/api/poultry/sheds` | Create shed |
| GET | `/api/poultry/sheds/[id]` | Get single shed |
| PATCH | `/api/poultry/sheds/[id]` | Update shed |
| DELETE | `/api/poultry/sheds/[id]` | Delete shed |

### Validation

- **Create:** `farmId` (required), `name` (required), `shedType` (broiler|layer|breeder|mixed), `capacity` (>= 0)
- **Update:** `temperature` (-50..80), `humidity` (0..100), `currentCount` (non-negative integer)

---

## 3. Flock Management

**Slug:** `flock` | **Entry Module:** No | **Dependencies:** shed

Manage flock lifecycle: placement, growth, mortality tracking, weight tracking.

### Services

| Function | Description |
|----------|-------------|
| `listFlocks(orgId, { shedId?, status? })` | List flocks with shed/farm info |
| `getFlock(orgId, id)` | Get flock with full details |
| `createFlock(orgId, data)` | Place a new flock |
| `updateFlock(orgId, id, data)` | Update flock (status, weight, count) |
| `recordMortality(orgId, data)` | Record a mortality event (deducts from currentCount) |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/flocks` | List flocks (query: `?shedId=&status=`) |
| POST | `/api/poultry/flocks` | Create flock |
| GET | `/api/poultry/flocks/[id]` | Get single flock |
| PATCH | `/api/poultry/flocks/[id]` | Update flock |

### Validation

- **Create:** `shedId` (required), `breed` (required), `placementDate` (valid ISO date), `quantity` (positive integer)
- **Update:** `status` (placed|growing|laying|molting|depleted|deceased), `averageWeight` (0..50 kg), `currentCount` (non-negative integer)
- **Mortality:** `flockId` (required), `date` (valid date), `count` (positive integer), `cause` (required)

---

## 4. Feed Tracking

**Slug:** `feed` | **Entry Module:** No | **Dependencies:** flock

Record feed consumption, conversion ratios, stock levels, and costs.

### Services

| Function | Description |
|----------|-------------|
| `listFeedRecords(orgId, { flockId? })` | List feed records, filterable by flock |
| `createFeedRecord(orgId, data)` | Record a feed consumption event |
| `deleteFeedRecord(orgId, id)` | Delete a feed record |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/feed` | List feed records (query: `?flockId=`) |
| POST | `/api/poultry/feed` | Create feed record |
| DELETE | `/api/poultry/feed/[id]` | Delete feed record |

### Validation

- **Create:** `flockId` (required), `date` (valid date), `feedType` (required), `quantityKg` (positive), `costUsd` (>= 0)

---

## 5. Health Records

**Slug:** `health` | **Entry Module:** No | **Dependencies:** flock

Track vaccinations, treatments, mortality causes, and health alerts.

### Services

| Function | Description |
|----------|-------------|
| `listHealthRecords(orgId, { flockId? })` | List health records, filterable by flock |
| `createHealthRecord(orgId, data)` | Record vaccination, treatment, or checkup |
| `deleteHealthRecord(orgId, id)` | Delete a health record |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/health` | List health records (query: `?flockId=`) |
| POST | `/api/poultry/health` | Create health record |
| DELETE | `/api/poultry/health/[id]` | Delete health record |

### Validation

- **Create:** `flockId` (required), `date` (valid date), `type` (vaccination|treatment|checkup|emergency), `treatment` (required), `costUsd` (>= 0), `nextDueDate` (valid date, optional)

---

## 6. Production Metrics

**Slug:** `production` | **Entry Module:** No | **Dependencies:** flock

Monitor egg production, body weight, feed conversion, and growth curves.

### Services

| Function | Description |
|----------|-------------|
| `listProductionRecords(orgId, { flockId? })` | List production records |
| `createProductionRecord(orgId, data)` | Record daily production metrics |
| `deleteProductionRecord(orgId, id)` | Delete a production record |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/production` | List production records (query: `?flockId=`) |
| POST | `/api/poultry/production` | Create production record |
| DELETE | `/api/poultry/production/[id]` | Delete production record |

### Validation

- **Create:** `flockId` (required), `date` (valid date), `eggsCollected` (non-negative integer), `totalWeightKg` (>= 0), `feedConversionRatio` (0..10)

---

## 7. Procurement

**Slug:** `procurement` | **Entry Module:** No | **Dependencies:** None

Manage chick procurement, feed purchases, medicine, and equipment.

### Services

| Function | Description |
|----------|-------------|
| `listProcurementRecords(orgId, { type? })` | List procurement records |
| `createProcurement(orgId, data)` | Create a procurement record |
| `updateProcurement(orgId, id, data)` | Update procurement (status, delivery date) |
| `deleteProcurement(orgId, id)` | Delete a procurement record |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/procurement` | List procurement records (query: `?type=`) |
| POST | `/api/poultry/procurement` | Create procurement record |
| PATCH | `/api/poultry/procurement/[id]` | Update procurement record |
| DELETE | `/api/poultry/procurement/[id]` | Delete procurement record |

### Validation

- **Create:** `type` (chick|feed|medicine|equipment|supplies), `supplier` (required), `description` (required), `quantity` (positive), `unitCostUsd` (>= 0)

---

## 8. Sales

**Slug:** `sales` | **Entry Module:** No | **Dependencies:** None

Record sales transactions, customer management, and revenue tracking.

### Services

| Function | Description |
|----------|-------------|
| `listSales(orgId, { status? })` | List sales with customer info |
| `createSale(orgId, data)` | Record a sale transaction |
| `updateSale(orgId, id, data)` | Update sale (status, amount) |
| `deleteSale(orgId, id)` | Delete a sale |
| `listCustomers(orgId)` | List all customers |
| `createCustomer(orgId, data)` | Add a new customer |

### API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/poultry/sales` | List sales (query: `?status=`) |
| POST | `/api/poultry/sales` | Create sale |
| PATCH | `/api/poultry/sales/[id]` | Update sale |
| DELETE | `/api/poultry/sales/[id]` | Delete sale |
| GET | `/api/poultry/customers` | List customers |
| POST | `/api/poultry/customers` | Create customer |

### Validation

- **Create Sale:** `items` (required object), `totalAmount` (>= 0), `currency` (ISO 4217 string)
- **Create Customer:** `name` (required), `email` (valid format if provided)
