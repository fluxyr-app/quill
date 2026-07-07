---
id: 030-auth
kind: core
depends_on: [020-routes]
---
# Authorization & multi-tenancy

The application is multi-tenant: resources belong to an **account**, and endpoints
are scoped by account in the path (`/accounts/{account_id}/...`).

- Every resource-accessing endpoint is **guarded** by an authentication check.
- The auth mechanism may be a stub initially, but the guard must be present on all
  protected endpoints, so that enabling real authentication later is a single,
  localized change.
- Ownership is modeled by storing the owning account's (or user's) id as a foreign
  key; scope queries by it wherever a feature requires ownership.
