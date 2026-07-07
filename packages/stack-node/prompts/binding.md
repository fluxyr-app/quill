# Framework binding — Node / TypeScript / Express

This app targets **Node + TypeScript + Express**, with a simple in-memory store
(zero external services). Realize the language-agnostic conventions above in this
framework as described here. All code is TypeScript under `src/`; tests under
`tests/`. Module system is CommonJS — use `import ... from "..."` (no `.js`
suffixes on relative imports).

## Identifiers (short-ID scheme)

Ids are stored internally as full UUID strings and shortened at the boundary.
Create these files (none are shipped):

- `src/utils/shortId.ts` — the codec:
  - `shorten(uuid: string): string` — encode a full UUID as a 22-char Base-62 string
    (alphabet `0-9`, `A-Z`, `a-z`; most-significant digit first; left-pad to 22).
  - `unshorten(short: string): string` — inverse; also accept a full UUID and return it.
  - `resolveId(raw: string): string | null` — accept a short ID or full UUID, return a
    normalized full UUID string, or `null` if invalid.
  - `isShortId(value: string): boolean`.
- `src/utils/serialize.ts` — `serialize(value)` returns a deep copy where the `id`
  field and any key ending in `Id` (e.g. `userId`) is replaced by its short ID (via
  `shorten`). Handles objects and arrays. Routes send responses through it.

Consequences: route id params (`:accountId`, `:userId`, …) and inbound body id
fields arrive as short IDs — call `resolveId(...)` before lookups. Responses go out
via `res.json(serialize(model))` so ids are always short.

## Resources (models)

- Define each resource in `src/models/<resource>.ts` as a class extending
  `BaseModel` (from `src/models/base.ts`), which provides `id`, `createdAt`,
  `updatedAt`, `save()`, `remove()`, and static `findById(id)` / `all()`. Do not
  reimplement those.
- Declare fields with definite assignment, e.g. `email!: string;`. Foreign keys are
  the referenced resource's full UUID id, typed `string` (e.g. `userId!: string;`).
- Construct instances with `Object.assign(new User(), { email, name }).save()`.
- Enforce required fields and uniqueness in the route handlers (there is no schema
  layer); e.g. reject a duplicate email by scanning `User.all()`.

## Endpoints (Express routers)

- One router per resource in `src/routes/<resource>.ts` exporting
  `export const router = Router();`. The app auto-registers every router with
  `app.use(router)` at the **root — with no path prefix**. Do not edit `src/app.ts`.
- Therefore each route MUST declare its **full, absolute path** — never a relative
  path. Account-scoped: `/accounts/:accountId/<resource>` for the collection and
  `/accounts/:accountId/<resource>/:<resource>Id` for an item.
- Apply the auth guard `authRequired` (from `../middleware/auth`), per route.
- Send items as `res.json(serialize(model))`, collections as
  `res.json(serialize(items))`, `201` on create. Resolve inbound ids with
  `resolveId(...)`; return 404 when a referenced/target resource is missing.

Example shape (`src/routes/users.ts`):

```ts
import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { errorResponse } from "../utils/responses";
import { serialize } from "../utils/serialize";
import { resolveId } from "../utils/shortId";
import { User } from "../models/user";

export const router = Router();

router.get("/accounts/:accountId/users", authRequired, (req, res) => {
  res.json(serialize(User.all()));
});

router.post("/accounts/:accountId/users", authRequired, (req, res) => {
  const { email, name } = req.body ?? {};
  if (!email || !name) return errorResponse(res, "email and name are required", 400);
  // ...enforce uniqueness, create, save...
});

router.get("/accounts/:accountId/users/:userId", authRequired, (req, res) => {
  const id = resolveId(req.params.userId);
  const user = id ? User.findById(id) : undefined;
  if (!user) return errorResponse(res, "user not found", 404);
  res.json(serialize(user));
});
```

## Errors & tests

- Use `errorResponse(res, message, status, code?)` and `successResponse(res, data,
  status?)` from `src/utils/responses.ts`. Error shape:
  `{ "error": { "message": ..., "code"?: ... } }`. 400 invalid input, 404 missing,
  409 conflict.
- Put tests in `tests/<resource>.test.ts` using `node:test`, `node:assert`,
  `supertest`, and `freshApp()` from `./setup` (resets the in-memory store). Cover
  create + read at minimum, and assert returned ids are 22-char short IDs.

## House rules (this stack)

- Stay within the shipped stack: Express plus the dev tooling (typescript, tsx,
  supertest). Add no new dependencies unless a feature requires it. The app runs
  in-memory with no external services. Keep the code strict-TypeScript clean
  (`tsc --noEmit` must pass). Never modify `BaseModel`, `src/app.ts`'s registration
  logic, or `tests/setup.ts`.
