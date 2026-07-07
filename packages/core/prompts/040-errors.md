---
id: 040-errors
kind: core
depends_on: [020-routes]
---
# Errors, tests & house rules

Errors:

- Failures return a consistent, structured error payload (a message, optionally a code).
- Use 400 for invalid input, 404 for a missing resource, 409 for conflicts (e.g. a
  uniqueness violation).

Tests:

- Every feature ships automated tests covering at least create + read for its
  resource, and asserting that ids returned to clients are short IDs (22 characters).

House rules:

- Keep changes minimal and localized to the feature at hand.
- Do not modify shared infrastructure that is provided: the base resource behavior,
  the application bootstrap/registration, or the test harness.
- Add no external dependencies beyond the project's stack unless a feature requires it.
- The application must run with zero external services in its default configuration.
