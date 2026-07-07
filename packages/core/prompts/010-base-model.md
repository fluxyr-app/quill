---
id: 010-base-model
kind: core
depends_on: [000-uuid]
---
# Resources

The application is organized as a set of **resources** (entities). Every resource:

- Has a unique **id** that is a UUID (represented externally as a short ID — see
  Identifiers).
- Records **created** and **updated** timestamps, maintained automatically.
- Is **persistable**: it can be created, fetched by id, listed, updated, and deleted.
- Has a canonical **serialized form** (its fields as data) used when returned to a
  client; ids in that form are short IDs.

Modeling rules:

- Each resource is defined once, in its own unit named after the resource.
- Fields have explicit types and nullability; required fields are enforced.
- A resource may reference another by holding that resource's id as a **foreign key**;
  state the delete behavior (cascade when the reference is an owned child, restrict
  otherwise).
- Uniqueness rules (single-field or composite) are declared on the resource.

The shared behavior (id, timestamps, persistence, serialization) comes from a common
base — extend it, do not reimplement it per resource.
