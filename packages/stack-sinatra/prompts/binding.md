# Framework binding — Ruby / Sinatra

This app targets **Ruby + Sinatra**, with a simple in-memory store (zero external
services). Realize the language-agnostic conventions above in this framework as
described here. App code lives under `lib/`; tests under `test/`. Field and method
names use Ruby's `snake_case`.

## Identifiers (short-ID scheme)

Ids are stored internally as full UUID strings and shortened at the boundary.
Create this file (not shipped):

- `lib/utils/short_id.rb` — a `ShortId` module with:
  - `ShortId.shorten(uuid)` — encode a full UUID string as a 22-char Base-62 string
    (alphabet `0-9`, `A-Z`, `a-z`; most-significant digit first; left-pad to 22).
  - `ShortId.unshorten(short)` — inverse; also accept a full UUID and return it normalized.
  - `ShortId.resolve_id(raw)` — accept a short ID or full UUID, return a normalized
    full UUID string, or `nil` if invalid.
  - `ShortId.short_id?(value)` — true for a valid 22-char short ID.

`BaseModel#to_hash` already shortens the `id` and any `*_id` field via `ShortId`,
so responses emit short IDs automatically. Resolve inbound ids (path params, body
fields) with `ShortId.resolve_id(...)` before lookups.

## Resources (models)

- Define each resource in `lib/models/<resource>.rb` as a class extending
  `BaseModel` (from `lib/models/base.rb`), which provides `id`, `created_at`,
  `updated_at`, `save`, `destroy`, and class methods `find_by_id(id)` / `all`. Do
  not reimplement those.
- Declare fields with `attr_accessor`, e.g. `attr_accessor :email, :name`. Foreign
  keys are the referenced resource's full UUID id, in a `*_id` field (e.g.
  `attr_accessor :user_id`).
- Construct and persist with `User.new(email: email, name: name).save`.
- Enforce required fields and uniqueness in the route handlers (there is no schema
  layer) — e.g. reject a duplicate email by scanning `User.all`.

Example (`lib/models/user.rb`):

```ruby
class User < BaseModel
  attr_accessor :email, :name
end
```

## Endpoints (Sinatra routes)

- One file per resource in `lib/resources/<resource>.rb`, containing a single
  `Resources.define do |app| ... end` block. The app auto-registers every resource
  file — do not edit `lib/app.rb`.
- Declare **full, absolute route paths** (Sinatra mounts them directly). Account-scoped:
  `/accounts/:account_id/<resource>` for the collection and
  `/accounts/:account_id/<resource>/:<resource>_id` for an item.
- Guard each route by calling `must_be_authed!` first.
- Respond with `json(model.to_hash)` for an item and `json(items.map(&:to_hash))`
  for a collection; use `status 201` on create and `halt <code>, json(error_response(...))`
  for errors. Read the body with `parsed_body`. Resolve inbound ids with
  `ShortId.resolve_id(...)`; return 404 when a referenced/target resource is missing.

Example (`lib/resources/users.rb`):

```ruby
Resources.define do |app|
  app.get "/accounts/:account_id/users" do
    must_be_authed!
    json(User.all.map(&:to_hash))
  end

  app.post "/accounts/:account_id/users" do
    must_be_authed!
    data = parsed_body
    email = data["email"]
    name = data["name"]
    halt 400, json(error_response("email and name are required")) unless email && name
    halt 409, json(error_response("email already exists")) if User.all.any? { |u| u.email == email }
    user = User.new(email: email, name: name).save
    status 201
    json(user.to_hash)
  end

  app.get "/accounts/:account_id/users/:user_id" do
    must_be_authed!
    uid = ShortId.resolve_id(params[:user_id])
    user = uid && User.find_by_id(uid)
    halt 404, json(error_response("user not found")) unless user
    json(user.to_hash)
  end
end
```

## Authorization

- Call `must_be_authed!` (a Sinatra helper from `lib/middleware/auth.rb`, currently
  a pass-through stub) at the top of every protected route. Keep it in place; do not
  add auth dependencies.

## Errors & tests

- Use `error_response(message, code = nil)` and `success_response(data)` from
  `lib/utils/responses.rb`. Error shape: `{"error": {"message": ..., "code"?: ...}}`.
  400 invalid input, 404 missing, 409 conflict.
- Put tests in `test/<resource>_test.rb`. Subclass `AppTest` (from
  `test/setup.rb`), which gives you Rack::Test methods (`get`, `post`, `delete`,
  `last_response`), a `post_json(path, hash)` helper, and a fresh in-memory store
  per test. Cover create + read at minimum, and assert returned ids match
  `/\A[0-9A-Za-z]{22}\z/` (22-char short IDs).

Example (`test/users_test.rb`):

```ruby
require_relative "setup"

class UserTest < AppTest
  def test_create_and_get
    res = post_json("/accounts/0000000000000000000000/users", email: "a@b.com", name: "Ada")
    assert_equal 201, res.status
    id = JSON.parse(res.body)["id"]
    assert_match(/\A[0-9A-Za-z]{22}\z/, id)
  end
end
```

## House rules (this stack)

- Stay within the shipped stack: Sinatra plus the test tooling (rack-test, minitest,
  rake). Add no new dependencies unless a feature requires it. The app runs in-memory
  with no external services. Keep every `.rb` file syntactically valid (`ruby -c`
  must pass). Never modify `BaseModel`, `lib/app.rb`'s registration logic, or
  `test/setup.rb`.
