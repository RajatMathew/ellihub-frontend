# General Contractor Module

## Location
`src/modules/general-contractor/`

## Structure
```
general-contractor/
├── index.ts                          # Exports gc routes
├── models/
│   ├── gc.models.ts                  # GC Zod schemas
│   └── gc-type.models.ts            # GCType Zod schemas
├── routes/
│   ├── gc.routes.ts                  # GC HTTP handlers (mounts gc-type at /types)
│   └── gc-type.routes.ts            # GCType HTTP handlers
└── services/
    ├── gc.services.ts                # GC business logic
    └── gc-type.services.ts          # GCType business logic
```

**Flow**: `V1.ts` → `index.ts` → `gc.routes.ts` → mounts `gc-type.routes.ts` under `/types`

## Database Schema (`prisma/schema/directory.prisma`)

### GCType (model, not enum)
- `id`, `name` (unique), `code` (unique), `description?`, `createdAt`, `updatedAt`
- Seeded values: SCA, Civil, Institutional, Public/State, Private

### GeneralContractor
- `id`, `name`, `gcTypeId` (FK → GCType), `status` (GCStatus), `address?`, `email?`, `phone?`, `website?`, `paymentTerms` (default NET_30), `retainagePercent` (default 10.0), `deletedAt?`, `createdAt`, `updatedAt`
- Relations: `projects`, `contactLinks` (ContactGC)
- Indexes: name, status, gcTypeId, deletedAt

### Enums
- `GCStatus`: ACTIVE, PROSPECTING, INACTIVE, BLACKLISTED
- `PaymentTerms`: NET_15, NET_30, NET_45, NET_60, NET_90, DUE_ON_RECEIPT

### ContactGC (junction table)
- Links Contact ↔ GeneralContractor with `isPrimary` flag
- Cascade delete on both sides
- Unique constraint on [contactId, generalContractorId]

## API Endpoints

All under `/api/v1/general-contractors/`:

### GC Types (`/types`)
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/types` | gcType:read | List all GC types |
| POST | `/types` | gcType:create | Create GC type |
| PUT | `/types/:id` | gcType:update | Update GC type |
| DELETE | `/types/:id` | gcType:delete | Delete (fails if GCs reference it) |

### General Contractors
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/stats` | gc:read | KPI metrics (totalGCs, activeProjects, totalCommitted) |
| POST | `/` | gc:create | Create GC (supports nested contacts for wizard) |
| GET | `/` | gc:read | List paginated (search, filter status/gcTypeId) |
| GET | `/:id` | gc:read | Get single with relations |
| PUT | `/:id` | gc:update | Update basic info |
| DELETE | `/:id` | gc:delete | Set status to INACTIVE (not hard delete) |

### GC Contacts (`/:id/contacts`)
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/:id/contacts` | gc:update | Add contact link |
| PUT | `/:id/contacts/:contactId` | gc:update | Update isPrimary |
| DELETE | `/:id/contacts/:contactId` | gc:update | Remove contact link |

## Query Params (List endpoint)
- `search` — case-insensitive search across name, email, phone
- `status` — filter by GCStatus enum
- `gcTypeId` — filter by GC type
- `page`, `size` (default 25), `sortBy` (default name), `sortOrder` (default asc)

## List Response Includes
- `gcType` — related GCType object
- `_count.projects` — number of projects
- `_count.contactLinks` — number of linked contacts

## Stats Response
- `totalGCs` — count of non-deleted GCs
- `activeProjects` — count of projects linked to non-deleted GCs
- `totalCommitted` — sum of PrimeChangeOrder amounts

## Permissions
Defined in `src/lib/permissions.ts`:
- `generalContractor: ['create', 'update', 'delete', 'read']`
- `gcType: ['create', 'update', 'delete', 'read']`
