---
id: 020-routes
kind: core
depends_on: [010-base-model]
---
# Endpoints

Resources are exposed over HTTP as account-scoped REST endpoints. For a resource
`things`, under the base path `/accounts/{account_id}/things`:

- **list** — read the collection.
- **create** — add to the collection; validate required fields first.
- **get** — read one by id.
- **update** — modify one by id (when the feature calls for it).
- **delete** — remove one by id (when the feature calls for it).

Conventions:

- Ids in paths are short IDs (see Identifiers) and are resolved to UUIDs before use.
- Return a resource's serialized form; return collections as arrays.
- Status codes: 200 for reads and updates, 201 for creates, 200/204 for deletes.
- Endpoints are grouped per resource and wired into the application automatically —
  do not edit central bootstrap/registration to add them.
