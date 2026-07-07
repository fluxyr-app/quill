# Framework binding — Python / Flask / SQLAlchemy

This app targets **Python + Flask + SQLAlchemy**. Realize the language-agnostic
conventions above in this framework as described here. This binding is owned by the
stack; the conventions are the durable, framework-independent spec.

## Identifiers (short-ID scheme)

Implement the short-ID behavior in these files (none are shipped — create them):

- `app/utils/uuid.py` — the encoder/decoder. For example a `Uuid` class with
  `shorten(value)`, `unshorten(value)`, `is_short_id(value)`, plus a module-level
  `resolve_id(raw) -> uuid.UUID | None` accepting a short ID or a full UUID string.
  Base-62 alphabet is `0-9`, `A-Z`, `a-z`; short IDs are exactly 22 chars.
- `app/converters.py` — `ShortIDConverter(werkzeug.routing.BaseConverter)`:
  `to_python` decodes a short ID (or full UUID) to a `uuid.UUID`; `to_url` shortens.
  The app factory registers it under the key `sid`.
- `app/json_provider.py` — `ShortIDJSONProvider(flask.json.provider.DefaultJSONProvider)`
  whose `default` serializes any `uuid.UUID` as a short ID. The app factory installs
  it if present.

Consequences: route id params are declared `<sid:...>` and arrive as `uuid.UUID`;
returning `to_dict()` (or any `uuid.UUID`) already emits short IDs; resolve inbound
body ids with `resolve_id(...)` before querying.

## Resources (SQLAlchemy models)

- Define each resource in `app/models/<resource>.py` as a class extending `BaseModel`
  (from `app/models/base.py`), which already provides the UUID `id`,
  `created_at`/`updated_at`, and `to_dict()`/`save()`/`delete()`/`find_by_id()`/`find_all()`.
  Do not reimplement those.
- Import the db handle as `from app.extensions import db`. Columns are `db.Column(...)`
  with explicit types and nullability.
- Foreign keys:
  `db.Column(SAUuid(as_uuid=True), db.ForeignKey('<table>.id', ondelete='CASCADE'|'RESTRICT'), nullable=False)`
  with `from sqlalchemy import Uuid as SAUuid`.
- Constraints/indexes go in `__table_args__` (e.g.
  `db.UniqueConstraint('user_id', 'name', name='uix_user_project_name')`).
- `__tablename__` is the snake_case plural. New model modules are auto-imported by the
  app factory.

## Endpoints (Flask blueprints)

- One blueprint per resource in `app/routes/<resource>.py`, named `<resource>_bp`. The
  app factory auto-registers every Blueprint found under `app/routes/` — do not edit it.
- Paths: `/accounts/<sid:account_id>/<resource>` and
  `/accounts/<sid:account_id>/<resource>/<sid:<resource>_id>`.
- Return `jsonify(model.to_dict())` for an item, `jsonify([m.to_dict() for m in ...])`
  for a collection; `201` on create.

## Authorization

- Decorate every protected handler with `@auth_required` from `app/utils/decorators.py`
  (currently a pass-through stub — keep it in place; do not add auth dependencies).

## Errors & tests

- Use `error_response(message, status, code=None)` and `success_response(data, status)`
  from `app/utils/responses.py`. Error shape: `{"error": {"message": ..., "code"?: ...}}`.
- Put tests in `tests/test_<resource>.py` using the `app` and `client` fixtures from
  `tests/conftest.py` (in-memory SQLite, tables created per test). Assert returned ids
  are 22-char short IDs.

## House rules (this stack)

- Stay within the shipped stack: Flask, Flask-SQLAlchemy, SQLAlchemy, pytest. Add no new
  dependencies unless a feature requires it. The app must run on SQLite with no external
  services. Never modify the short-ID files once generated, `BaseModel`, the app
  factory's registration logic, or `conftest.py`.
