# Poultry OS - Data Model

All 10 Prisma models in the Poultry OS domain. Database: SQLite via Prisma.

## Enums

### PoultryFarmStatus

| Value | Description |
|-------|-------------|
| `active` | Farm is operational |
| `inactive` | Farm is not in use |
| `under_maintenance` | Farm undergoing maintenance |

### PoultryShedType

| Value | Description |
|-------|-------------|
| `broiler` | Broiler chicken shed |
| `layer` | Layer (egg-laying) shed |
| `breeder` | Breeder shed |
| `mixed` | Mixed-purpose shed |

### PoultryFlockStatus

| Value | Description |
|-------|-------------|
| `placed` | Newly placed flock |
| `growing` | Flock in growth phase |
| `laying` | Flock in egg production |
| `molting` | Flock in molting period |
| `depleted` | Flock sold/depleted |
| `deceased` | Flock lost (disease/disaster) |

### PoultryHealthType

| Value | Description |
|-------|-------------|
| `vaccination` | Scheduled vaccination |
| `treatment` | Medical treatment |
| `checkup` | Routine health checkup |
| `emergency` | Emergency medical response |

### PoultryProcurementType

| Value | Description |
|-------|-------------|
| `chick` | Day-old chick procurement |
| `feed` | Feed purchase |
| `medicine` | Medicine/vaccine purchase |
| `equipment` | Equipment purchase |
| `supplies` | General supplies |

### PoultrySaleStatus

| Value | Description |
|-------|-------------|
| `pending` | Sale pending completion |
| `completed` | Sale completed |
| `cancelled` | Sale cancelled |

---

## Models

### 1. PoultryFarm

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `name` | String | required | Farm name |
| `location` | String | required | Farm location/address |
| `capacity` | Int | @default(0) | Max bird capacity |
| `status` | PoultryFarmStatus | @default(active) | Operating status |
| `contactInfo` | String? | optional | Contact details |
| `latitude` | Float? | optional | GPS latitude |
| `longitude` | Float? | optional | GPS longitude |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `sheds → PoultryShed[]`
**Indexes:** `[organizationId, status]`

---

### 2. PoultryShed

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `farmId` | String | FK → PoultryFarm, onDelete: Cascade | Parent farm |
| `name` | String | required | Shed name/number |
| `shedType` | PoultryShedType | @default(broiler) | Type of shed |
| `capacity` | Int | @default(0) | Max bird capacity |
| `currentCount` | Int | @default(0) | Current bird count |
| `temperature` | Float? | optional | Current temperature |
| `humidity` | Float? | optional | Current humidity % |
| `status` | String | @default("active") | Shed status |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `organization → Organization`, `farm → PoultryFarm`, `flocks → PoultryFlock[]`
**Indexes:** `[organizationId, farmId]`

---

### 3. PoultryFlock

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `shedId` | String | FK → PoultryShed, onDelete: Cascade | Parent shed |
| `breed` | String | required | Bird breed |
| `placementDate` | DateTime | required | Date flock was placed |
| `quantity` | Int | required | Initial bird count |
| `currentCount` | Int | required | Current live bird count |
| `status` | PoultryFlockStatus | @default(placed) | Lifecycle status |
| `averageWeight` | Float? | optional | Average weight per bird (kg) |
| `notes` | String? | optional | Free-text notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `organization → Organization`, `shed → PoultryShed`, `feedRecords → PoultryFeedRecord[]`, `healthRecords → PoultryHealthRecord[]`, `mortalityRecords → PoultryMortalityRecord[]`, `productionRecords → PoultryProductionRecord[]`
**Indexes:** `[organizationId, shedId]`, `[organizationId, status]`

---

### 4. PoultryFeedRecord

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `flockId` | String | FK → PoultryFlock, onDelete: Cascade | Parent flock |
| `date` | DateTime | @default(now()) | Feeding date |
| `feedType` | String | required | Type of feed |
| `quantityKg` | Float | required | Amount fed (kg) |
| `costUsd` | Float | @default(0) | Feed cost (USD) |
| `notes` | String? | optional | Notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |

**Relations:** `organization → Organization`, `flock → PoultryFlock`
**Indexes:** `[organizationId, flockId, date]`

---

### 5. PoultryHealthRecord

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `flockId` | String | FK → PoultryFlock, onDelete: Cascade | Parent flock |
| `date` | DateTime | @default(now()) | Health event date |
| `type` | PoultryHealthType | required | vaccination/treatment/checkup/emergency |
| `treatment` | String | required | Treatment description |
| `veterinarian` | String? | optional | Vet name |
| `costUsd` | Float | @default(0) | Treatment cost (USD) |
| `nextDueDate` | DateTime? | optional | Next scheduled date |
| `notes` | String? | optional | Notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |

**Relations:** `organization → Organization`, `flock → PoultryFlock`
**Indexes:** `[organizationId, flockId, date]`

---

### 6. PoultryMortalityRecord

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `flockId` | String | FK → PoultryFlock, onDelete: Cascade | Parent flock |
| `date` | DateTime | @default(now()) | Mortality date |
| `count` | Int | required | Number of birds lost |
| `cause` | String | required | Cause of death |
| `notes` | String? | optional | Additional notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |

**Relations:** `organization → Organization`, `flock → PoultryFlock`
**Indexes:** `[organizationId, flockId, date]`

---

### 7. PoultryProductionRecord

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `flockId` | String | FK → PoultryFlock, onDelete: Cascade | Parent flock |
| `date` | DateTime | @default(now()) | Production date |
| `eggsCollected` | Int | @default(0) | Eggs collected count |
| `totalWeightKg` | Float | @default(0) | Total weight (kg) |
| `feedConversionRatio` | Float? | optional | FCR for the period |
| `notes` | String? | optional | Notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |

**Relations:** `organization → Organization`, `flock → PoultryFlock`
**Indexes:** `[organizationId, flockId, date]`

---

### 8. PoultryCustomer

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `name` | String | required | Customer name |
| `phone` | String? | optional | Phone number |
| `email` | String? | optional | Email address |
| `address` | String? | optional | Address |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `organization → Organization`, `sales → PoultrySale[]`
**Unique:** `[organizationId, name]`

---

### 9. PoultrySale

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `customerId` | String? | FK → PoultryCustomer, onDelete: SetNull | Customer (optional) |
| `date` | DateTime | @default(now()) | Sale date |
| `items` | String | required | JSON string of sale items |
| `totalAmount` | Float | @default(0) | Total sale amount |
| `currency` | String | @default("USD") | Currency code |
| `status` | PoultrySaleStatus | @default(pending) | Sale status |
| `notes` | String? | optional | Notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `organization → Organization`, `customer → PoultryCustomer?`
**Indexes:** `[organizationId, date]`, `[organizationId, status]`

---

### 10. PoultryProcurement

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | String | @id @default(cuid()) | Primary key |
| `organizationId` | String | FK → Organization | Tenant isolation |
| `type` | PoultryProcurementType | required | Type of procurement |
| `supplier` | String | required | Supplier name |
| `description` | String | required | Item description |
| `quantity` | Float | required | Quantity purchased |
| `unit` | String | @default("kg") | Unit of measurement |
| `unitCostUsd` | Float | @default(0) | Cost per unit (USD) |
| `totalCostUsd` | Float | @default(0) | Total cost (USD) |
| `date` | DateTime | @default(now()) | Purchase date |
| `deliveryDate` | DateTime? | optional | Expected delivery date |
| `status` | String | @default("received") | Procurement status |
| `notes` | String? | optional | Notes |
| `createdAt` | DateTime | @default(now()) | Created timestamp |
| `updatedAt` | DateTime | @updatedAt | Updated timestamp |

**Relations:** `organization → Organization`
**Indexes:** `[organizationId, type, date]`

---

## Entity Relationship Diagram

```
Organization
  └── PoultryFarm (1:N)
        └── PoultryShed (1:N, cascade)
              └── PoultryFlock (1:N, cascade)
                    ├── PoultryFeedRecord (1:N, cascade)
                    ├── PoultryHealthRecord (1:N, cascade)
                    ├── PoultryMortalityRecord (1:N, cascade)
                    └── PoultryProductionRecord (1:N, cascade)

Organization
  ├── PoultryCustomer (1:N)
  │     └── PoultrySale (1:N, setNull)
  └── PoultryProcurement (1:N)
```

## Cascade Rules

| Parent | Child | On Delete |
|--------|-------|-----------|
| PoultryFarm | PoultryShed | Cascade |
| PoultryShed | PoultryFlock | Cascade |
| PoultryFlock | PoultryFeedRecord | Cascade |
| PoultryFlock | PoultryHealthRecord | Cascade |
| PoultryFlock | PoultryMortalityRecord | Cascade |
| PoultryFlock | PoultryProductionRecord | Cascade |
| PoultryCustomer | PoultrySale | SetNull |
