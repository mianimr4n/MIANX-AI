# Poultry OS - Permissions

All 30 permissions in the `poultry.*` namespace. Permissions follow the pattern `poultry.{resource}.{action}`.

## Full Permission Table

| # | Key | Description | Module |
|---|-----|-------------|--------|
| 1 | `poultry.farm.view` | View farms | Farm Management |
| 2 | `poultry.farm.create` | Create farms | Farm Management |
| 3 | `poultry.farm.update` | Update farm details | Farm Management |
| 4 | `poultry.farm.delete` | Archive/delete farms | Farm Management |
| 5 | `poultry.shed.view` | View sheds | Shed Management |
| 6 | `poultry.shed.create` | Create sheds | Shed Management |
| 7 | `poultry.shed.update` | Update shed details | Shed Management |
| 8 | `poultry.shed.delete` | Archive/delete sheds | Shed Management |
| 9 | `poultry.flock.view` | View flocks | Flock Management |
| 10 | `poultry.flock.create` | Create flocks | Flock Management |
| 11 | `poultry.flock.update` | Update flock details | Flock Management |
| 12 | `poultry.flock.archive` | Deplete/archive flocks | Flock Management |
| 13 | `poultry.feed.view` | View feed records | Feed Tracking |
| 14 | `poultry.feed.create` | Create feed records | Feed Tracking |
| 15 | `poultry.feed.delete` | Delete feed records | Feed Tracking |
| 16 | `poultry.health.view` | View health records | Health Records |
| 17 | `poultry.health.create` | Create health records | Health Records |
| 18 | `poultry.health.delete` | Delete health records | Health Records |
| 19 | `poultry.production.view` | View production records | Production Metrics |
| 20 | `poultry.production.create` | Create production records | Production Metrics |
| 21 | `poultry.production.delete` | Delete production records | Production Metrics |
| 22 | `poultry.procurement.view` | View procurement records | Procurement |
| 23 | `poultry.procurement.create` | Create procurement records | Procurement |
| 24 | `poultry.procurement.update` | Update procurement records | Procurement |
| 25 | `poultry.procurement.delete` | Delete procurement records | Procurement |
| 26 | `poultry.sale.view` | View sales | Sales |
| 27 | `poultry.sale.create` | Create sales | Sales |
| 28 | `poultry.sale.update` | Update sale records | Sales |
| 29 | `poultry.sale.delete` | Delete sales | Sales |
| 30 | `poultry.dashboard.view` | View Poultry OS dashboard | Dashboard (cross-module) |
| 31 | `poultry.report.generate` | Generate Poultry reports | Reports (cross-module) |

## Permission Structure

``npoultry.*
├── farm.*       (4 permissions: view, create, update, delete)
├── shed.*       (4 permissions: view, create, update, delete)
├── flock.*      (4 permissions: view, create, update, archive)
├── feed.*       (3 permissions: view, create, delete)
├── health.*     (3 permissions: view, create, delete)
├── production.* (3 permissions: view, create, delete)
├── procurement.* (4 permissions: view, create, update, delete)
├── sale.*       (4 permissions: view, create, update, delete)
├── dashboard.*  (1 permission: view)
└── report.*     (1 permission: generate)
```

## Suggested Role Mappings

| Role | Permissions |
|------|------------|
| **Poultry Admin** | All 30 permissions |
| **Farm Manager** | farm.*, shed.*, flock.*, feed.view, health.view, production.view, dashboard.view |
| **Veterinarian** | flock.view, health.*, dashboard.view |
| **Feed Officer** | flock.view, feed.*, dashboard.view |
| **Sales Clerk** | sale.*, customer operations, dashboard.view |
| **Read-only Viewer** | All `*.view` permissions, dashboard.view |

## Enforcement

- Permissions are checked at the API route level via `withAuth` / `withAuthParams` middleware.
- Each route handler specifies its required `permission` in the options object.
- The middleware resolves the user's auth context, loads their role permissions, and calls `requirePermission()`.
- AI tool execution also checks `requiredPermission` before running tool logic.
- Missing permission returns HTTP 403.