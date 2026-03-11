# General Contractor Module

## Overview

General contractor management for construction projects. GCs are categorized by GC types and can be linked to contacts. Supports creation with nested contacts (wizard pattern), stats/KPIs, and paginated listing.

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
| GET | `/stats` | generalContractor:read | KPI metrics (totalGCs, activeProjects, totalCommitted) |
| POST | `/` | generalContractor:create | Create GC (supports nested contacts for wizard) |
| GET | `/` | generalContractor:read | List paginated (search, filter status/gcTypeId) |
| GET | `/:id` | generalContractor:read | Get single with relations |
| PUT | `/:id` | generalContractor:update | Update basic info |
| DELETE | `/:id` | generalContractor:delete | Set status to INACTIVE (not hard delete) |

### GC Contacts (`/:id/contacts`)
| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/:id/contacts` | generalContractor:update | Add contact link |
| PUT | `/:id/contacts/:contactId` | generalContractor:update | Update isPrimary |
| DELETE | `/:id/contacts/:contactId` | generalContractor:update | Remove contact link |

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

## Zod Validation Schemas

### GCCreateSchema
| Field | Type | Constraints |
|-------|------|------------|
| `name` | string | min 1 |
| `gcTypeId` | string | min 1 |
| `status` | enum | ACTIVE, PROSPECTING, INACTIVE, BLACKLISTED; optional |
| `address` | string | optional |
| `email` | string | email format, optional |
| `phone` | string | optional |
| `website` | string | URL format, optional |
| `paymentTerms` | enum | NET_15..DUE_ON_RECEIPT; optional |
| `retainagePercent` | number | 0-100, optional |
| `contacts` | array | `[{contactId, isPrimary?}]`, default [] |

### GCUpdateSchema
All fields from create (except contacts) are partial with nullable strings.

### GCTypeCreateSchema
| Field | Type | Constraints |
|-------|------|------------|
| `name` | string | min 1 |
| `code` | string | min 1 |
| `description` | string | optional |

### GCTypeUpdateSchema
All fields partial with nullable description.

### GCContactAddSchema / GCContactUpdateSchema
- Add: `{contactId, isPrimary?}`
- Update: `{isPrimary}` (required boolean)

## Single GC Response Includes

- `gcType` — related GCType object
- `contactLinks` with nested `contact` objects
- `projects` — related Project objects

## Business Rules & Constraints

- **Delete = INACTIVE**: Delete sets `status` to `'INACTIVE'` rather than using soft delete
- **GCType deletion**: Hard deletes, but blocks if any GCs reference it (ConflictError)
- **GCType uniqueness**: Name and code must be unique (checked before create/update)
- **Contact validation**: Contacts must exist and not be soft-deleted before linking
- **Duplicate link prevention**: P2002 unique constraint caught as ConflictError
- **Create with contacts**: Uses transaction to create GC + contact links atomically
- **GCType validation**: Must exist before creating/updating GC

## Permissions

Defined in `src/lib/permissions.ts`:
- `generalContractor: ['create', 'update', 'delete', 'read']`
- `gcType: ['create', 'update', 'delete', 'read']`

## Related Modules

- **contact** — ContactGC junction table, contact validation
- **project** — GC referenced by Project (`gcId` FK)
- **file** — GC root folder in file hierarchy
