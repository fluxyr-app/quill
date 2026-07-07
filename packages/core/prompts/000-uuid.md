---
id: 000-uuid
kind: core
depends_on: []
---
# Identifiers — short IDs

Every resource is identified by a **UUID**. Internally — storage, foreign keys,
comparisons — the full UUID is used. Externally — everywhere an id crosses the
boundary to a client (URL paths, request bodies, response payloads) — the id is
represented as a compact **short ID**.

Short ID semantics:
- The short ID is a **Base-62** encoding of the 128-bit UUID using the alphabet
  `0-9`, then `A-Z`, then `a-z` (digit value 0 = `0`, … 61 = `z`),
  most-significant digit first, left-padded to a fixed length of **22 characters**.
- Encoding and decoding are exact inverses: any UUID → short ID → UUID returns the
  original UUID. Decoding also accepts an already-full UUID and normalizes it.
- Resolving an inbound id accepts either form (short ID or full UUID) and yields the
  UUID, or nothing when the input is not a valid identifier.

Rules:
- Ids are never hand-formatted when producing output: serializing a resource emits
  its short ID automatically.
- Inbound ids (path parameters, and body fields that reference other resources) are
  resolved to UUIDs before use.
- A foreign key holds the referenced resource's UUID id.
