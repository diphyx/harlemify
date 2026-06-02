# Harlemify — AI Agent Reference

> Single-file, end-to-end reference for AI coding agents working on Nuxt projects that use `@diphyx/harlemify`. Reading this once gives you the full mental model: shapes, models, views, actions, compose, composables, SSR, lazy stores, concurrency, cancellation, isolated status, and logging.

- **Package:** `@diphyx/harlemify`
- **Stack:** Nuxt (`^3.14.0` or `^4.0.0`), Vue (`^3.5.0`), Zod (`^4.0.0`)
- **Built on:** [Harlem](https://harlemjs.com/) (state) + Zod (schemas)
- **Module entry:** auto-registered Nuxt module + plugins
- **Runtime imports:** `@diphyx/harlemify/runtime`

---

## 1. Mental Model

```
Shape (Zod)
└── createStore({ name, model, view, action, compose?, lazy? })
    ├── Model   → Mutable state containers (one / many)
    ├── View    → Reactive computed properties
    ├── Action  → Async operations (api / handler)
    └── Compose → Optional orchestration over actions + models + views
```

Data flow is one-way: **Action → Model → View**. Compose sits on top, orchestrating all three.

Every **action** automatically tracks `loading`, `status`, and `error`. Every **model mutation** is fully typed from the shape. Every **view** is a reactive `ComputedRef`. Every **compose** function tracks `active`.

---

## 2. Installation & Configuration

```bash
npm install @diphyx/harlemify zod
# or: pnpm add @diphyx/harlemify zod / yarn add @diphyx/harlemify zod
```

`zod` is a **peer dependency** — consumers must install it. `shape()` returns zod schemas, so duplicate copies would silently break `instanceof` checks against the app's own zod (used for forms, validation, etc.).

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        action: {
            endpoint: "https://api.example.com", // base URL prepended to api action URLs
            headers: {
                /* default headers */
            },
            query: {
                /* default query params */
            },
            timeout: 10000, // ms
            concurrent: ActionConcurrent.BLOCK, // global default strategy
        },
        model: { identifier: "id" }, // default identifier for many() arrays
        view: { clone: ViewClone.SHALLOW }, // default clone strategy
        logger: -999, // log level; 999 = verbose, -999 = silent
    },
});
```

### Auto-imported (no import needed in components)

- `createStore`
- `useStoreAction`, `useStoreModel`, `useStoreView`, `useStoreCompose`
- `useIsolatedActionStatus`, `useIsolatedActionError`

### Must be imported from `@diphyx/harlemify/runtime`

- Helpers: `shape`
- Type utility: `ShapeInfer`
- Enums: `ModelOneMode`, `ModelManyMode`, `ModelSilent`, `ModelType`, `ModelManyKind`, `ViewClone`, `ActionStatus`, `ActionConcurrent`, `ActionApiMethod`, `ActionType`
- Errors: `ActionApiError`, `ActionHandlerError`, `ActionCommitError`, `ActionConcurrentError`, plus `isError`, `toError`
- Types: `Store`, `StoreConfig`, `ActionCallOptions`, `UseStoreAction`, etc.

```typescript
import {
    shape,
    ModelOneMode,
    ModelManyMode,
    ActionConcurrent,
    ViewClone,
    type ShapeInfer,
} from "@diphyx/harlemify/runtime";
```

---

## 3. Shape — Schema Foundation

Shapes are Zod object schemas. They drive types, defaults, identifier matching, and alias key-mapping.

`shape()` accepts three input forms — all return the same `ShapeCall<T>`:

```typescript
import { z } from "zod";
import { shape, type ShapeInfer } from "@diphyx/harlemify/runtime";

// 1. Factory callback (terse, includes short-form helpers like .email())
const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));

// 2. Raw Zod definition
const userShape = shape({
    id: z.number().meta({ identifier: true }),
    name: z.string(),
    email: z.email(),
});

// 3. Pre-built z.object(...) — reuse external schemas, preserves refinements/transforms
const externalSchema = z.object({ id: z.number(), name: z.string() });
const userShape = shape(externalSchema);

type User = ShapeInfer<typeof userShape>;
// → { id: number; name: string; email: string }
```

### Factory provides every Zod type

- Primitives: `string`, `number`, `boolean`, `bigint`, `date`
- Structures: `object`, `array`, `tuple`, `record`, `map`, `set`, `enum`, `union`, `literal`
- String formats: `email`, `url`, `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `jwt`, `emoji`, `ipv4`, `ipv6`, `mac`, `base64`, `base64url`, `hex`
- Special: `any`, `unknown`, `never`, `nullable`, `optional`

### Defaults

Generate a zero-value object with optional deep-merged overrides (nested objects merge; arrays and scalars are replaced):

```typescript
userShape.defaults();
// { id: 0, name: "", email: "" }

userShape.defaults({ name: "John" });
// { id: 0, name: "John", email: "" }
```

### Meta — Identifier

Mark the primary key with `.meta({ identifier: true })`. Required for `many()` mutations that match by id (`patch`, `add` with `unique`).

```typescript
factory.number().meta({ identifier: true });
```

- Identifier resolution order (highest priority first): **model-level `{ identifier: "uuid" }`** → module config `model.identifier` → shape field with `.meta({ identifier: true })` → fallback to a field named `"id"`.
- `one()` models work without an identifier.
- `remove` matches by any provided field automatically.

### Meta — Alias (API key renaming)

Map API keys (e.g. `kebab-case`) to shape keys (e.g. `snake_case`) once at the shape level:

```typescript
const contactShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    first_name: factory.string().meta({ alias: "first-name" }),
    last_name: factory.string().meta({ alias: "last-name" }),
}));
```

- **Inbound (response):** API keys → shape keys before commit.
- **Outbound (request body):** shape keys → API keys before send.
- Order outbound: `resolveBody()` → alias remap → `transformer.request`.
- Order inbound: `$fetch` → `transformer.response` → alias remap → commit.
- **Skipped when:** action has no `commit` config; shape has no aliases; body is non-object (`FormData`, `Blob`, …).

### Composition helpers

Thin pass-throughs over Zod's native `.extend` / `.pick` / `.omit`, re-decorated with `.defaults()`. Same signatures as Zod — accept raw definitions / mask objects. Refinements, transforms, and field meta (`identifier`, `alias`) on retained fields are preserved.

- `shape.extend(base, rawZodShape)` — add fields, or override existing ones (later fields win on key collision).
- `shape.pick(base, { key: true, … })` — keep masked keys.
- `shape.omit(base, { key: true, … })` — drop masked keys.

```typescript
import { z } from "zod";

const profileShape = shape.extend(userShape, { bio: z.string() });
const publicUserShape = shape.omit(userShape, { passwordHash: true });
const credentialsShape = shape.pick(userShape, { id: true, email: true });

// Override pattern — annotate a pre-built schema with meta:
const externalUserSchema = z.object({ id: z.number(), first_name: z.string() });
const userShape = shape.extend(shape(externalUserSchema), {
    id: z.number().meta({ identifier: true }),
    first_name: z.string().meta({ alias: "first-name" }),
});
```

### Scalar state pattern

Shapes must be Zod objects. For a singleton primitive value (counters, totals, tokens, flags), wrap in a single-field shape and unwrap via a view:

```typescript
const totalShape = shape((f) => ({ value: f.number() }));

model({ one }) { return { total: one(totalShape) }; }
view({ from })  { return { total: from("total", (m) => m.value) }; }

// view.total.value             → number
// model.total.set({ value: 42 })
```

For grouped scalars (pagination `total`/`offset`/`limit`), put them on one shape and expose each via its own view. Pair with [multi-commit](#63-calling-actions) when the API returns an envelope.

> **Primitive arrays:** don't `many()` with `{ value: T }` wrappers. Use `one()` with an array field (`shape({ values: f.array(f.string()) })`) and accept that mutations replace the whole array. If you need per-item add/remove, give items real ids and use `many()` of objects.

> **UI-only state:** use a Vue `ref` in the component — models are overkill for ephemeral local state.

### Complex shapes

Nest objects, arrays, enums freely:

```typescript
const projectShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    meta: factory.object({
        deadline: factory.string(),
        options: factory.object({ notify: factory.boolean() }),
    }),
    milestones: factory.array(
        factory.object({
            id: factory.number(),
            done: factory.boolean(),
        }),
    ),
    status: factory.enum(["draft", "live", "archived"]),
}));
```

---

## 4. Model — State Containers

```typescript
model({ one, many }) {
    return {
        current: one(userShape),                          // single item, → User
        list:    many(userShape),                          // array, → User[]
        grouped: many(userShape, { kind: "record" }),      // keyed map, → Record<string, User[]>
    };
},
```

### `one(shape, options?)`

Initialized to shape defaults. Mutations:

| Method  | Signature                                     | Behavior                                                   |
| ------- | --------------------------------------------- | ---------------------------------------------------------- |
| `set`   | `set(value, { silent? })`                     | Replace entire value                                       |
| `patch` | `patch(partial, { deep?: boolean; silent? })` | Shallow merge by default; deep merge with `{ deep: true }` |
| `reset` | `reset({ silent? })`                          | Restore to default                                         |

### `many(shape, options?)` — list (default)

Initialized to `[]`. Mutations:

| Method   | Signature                                                                             | Behavior                                                                                              |
| -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `set`    | `set(array, { silent? })`                                                             | Replace entire array                                                                                  |
| `add`    | `add(item \| item[], { by?: keyof S; prepend?: boolean; unique?: boolean; silent? })` | Append (or prepend); `unique` dedupes by `by` (default identifier)                                    |
| `patch`  | `patch(partial \| partial[], { by?: keyof S; deep?: boolean; silent? })`              | Update matching item(s) by identifier or `by` field                                                   |
| `remove` | `remove(matcher \| matcher[], { silent? })`                                           | If the identifier key is present in matcher → match by id; otherwise match by **all** provided fields |
| `reset`  | `reset({ silent? })`                                                                  | Restore to default                                                                                    |

### `many(shape, { kind: "record" })` — record

Initialized to `{}`. Mutations:

| Method   | Signature                                    | Behavior                             |
| -------- | -------------------------------------------- | ------------------------------------ |
| `set`    | `set(record, { silent? })`                   | Replace entire record                |
| `add`    | `add({ key, value }, { silent? })`           | Add a key with its array value       |
| `patch`  | `patch(record, { deep?: boolean; silent? })` | Merge keys (or deep merge with flag) |
| `remove` | `remove(key: string, { silent? })`           | Remove a key                         |
| `reset`  | `reset({ silent? })`                         | Restore to default                   |

### Identifier override per model

```typescript
many(documentShape, { identifier: "uuid" });
```

### Function defaults (sync only)

Re-executed at creation and on every `reset()`. Use for per-request isolation (SSR-safe) and to access Nuxt composables (with `lazy: true`).

```typescript
one(configShape, { default: () => ({ theme: "dark", language: "en" }) });
many(userShape, { default: () => [createDefaultUser()] });
many(userShape, { kind: "record", default: () => ({ "team-a": [createDefaultUser()] }) });
```

### Pre/Post hooks

Fire before/after every mutation. **Do not control flow** — they cannot block a mutation. Thrown errors are caught and logged; mutation still proceeds.

Each hook receives `{ mode, state }`: `mode` is the mutation (`set | reset | patch | add | remove`); `state` is a **detached clone** of the resolved state at hook time (`pre` → before, `post` → after), typed to the model (`S` / `S[]` / `Record<string, S[]>`). Mutating `state` never touches the store.

```typescript
one(sessionShape, {
    pre({ mode, state }) {
        /* before mutation */
    },
    post({ mode, state }) {
        persist(state); // self-contained — no store read-back
    },
});
```

### Silent option — skip hooks per mutation

```typescript
import { ModelSilent } from "@diphyx/harlemify/runtime";

model.session.set(value, { silent: true }); // skip both
model.session.reset({ silent: ModelSilent.POST }); // skip only post
model.session.patch({ name: "X" }, { silent: ModelSilent.PRE }); // skip only pre
```

---

## 5. View — Reactive Computed

Views are Vue `ComputedRef` derived from model state.

### `from(model, resolver?, options?)`

```typescript
view({ from }) {
    return {
        user:     from("current"),                                // ComputedRef<User>
        users:    from("list"),                                   // ComputedRef<User[]>
        userName: from("current", (m) => m.name),                 // resolver transform
        count:    from("list",    (m) => m.length),
    };
},
```

### `merge(models, resolver, options?)` — up to 5 models (type-level limit)

```typescript
view({ merge }) {
    return {
        summary: merge(["current", "list"], (current, list) => ({
            selected: current.name,
            total:    list.length,
        })),
    };
},
```

### Clone option — `ViewClone.SHALLOW | ViewClone.DEEP`

Resolver receives state as a **readonly proxy** by default — `Array.prototype.sort()` and similar mutating methods are silently blocked in production. Pass `{ clone: ViewClone.SHALLOW | DEEP }` for a mutable copy. Vue caches the computed value, so the copy cost only pays on state changes.

```typescript
import { ViewClone } from "@diphyx/harlemify/runtime";

from("list", (items) => items.sort((a, b) => a.name.localeCompare(b.name)), { clone: ViewClone.SHALLOW });
```

### Accessing views directly

```typescript
const { view } = userStore;
view.user.value; // User
view.users.value; // User[]
view.summary.value; // { selected, total }
```

### Views feed dynamic action URLs

```typescript
api.get({ url: (view) => `/users/${view.user.value.id}` }, { model: "current", mode: ModelOneMode.SET });
```

---

## 6. Action — Async Operations

Two action kinds: **`api`** (HTTP + auto-commit) and **`handler`** (custom async logic).

```typescript
action({ api, handler }) {
    return {
        list:   api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        sort:   handler(async ({ model, view }) => { /* ... */ }),
    };
},
```

### When to use which

| Use `api` for...                    | Use `handler` for...                         |
| ----------------------------------- | -------------------------------------------- |
| Standard JSON HTTP request          | Custom async logic                           |
| Auto-committing response to a model | Mutating multiple models in one call         |
| Built-in alias mapping              | Non-JSON requests (blobs, streams, text)     |
| Request/response transformers       | Combining API calls with local state updates |

### 6.1 API actions

HTTP methods: `api.get`, `api.head`, `api.post`, `api.put`, `api.patch`, `api.delete`.

> `GET` and `HEAD` always have `body: undefined`, even if a body is supplied.

> API actions use `$fetch` with `responseType: "json"`. For non-JSON, use a handler.

**Request config (first arg):**

```typescript
{
    url: string | ((view) => string),       // supports ":param" placeholders
    headers?: Record<string, string>,
    query?:   Record<string, unknown>,
    body?:    unknown,
    timeout?: number,
    concurrent?: ActionConcurrent,
}
```

**Commit config (rest args, zero or more):**

```typescript
{
    model:   "list",                                            // target model key
    mode:    ModelManyMode.ADD,                                 // or ModelOneMode.SET, etc.
    transform?: (data, context) => data.items,                  // reshape response; context = { request, view }
    options?: { unique: true, prepend: true, /* by, deep, … */ } // forwarded as mutation options
}
```

`transform`'s `context` exposes the resolved `request` (`Readonly<{ url, method, headers, query, body }>`) and the read-only `view` (`DeepReadonly<StoreView>`). `data` (first arg) is the API response. Two canonical uses:

- Merge request body back when server returns sparse `{ id }`: `transform: (data, { request }) => ({ ...request.body, ...data })`
- Patch on top of existing store state: `transform: (data, { view }) => ({ ...view.user.value, ...data })`

`context` is read-only; `transform` must be synchronous (no Promise returns). In multi-commit chains every transform receives the same `context` instance. TS quirk: inference through the factory's overloaded generics doesn't reach the `context` param — annotate explicitly via the exported `ActionApiCommitContext` type or a minimal inline shape if your editor flags it as `any`.

**Multi-commit — envelope/wrapped responses:**

Pass multiple commit configs to slice one response into several models:

```typescript
api.get(
    { url: "/users" },
    { model: "list", mode: ModelManyMode.SET, transform: (d) => d.output },
    { model: "pagination", mode: ModelOneMode.SET, transform: (d) => d.meta },
);
```

Each commit applies independently. Resolution is two-pass: every entry is resolved (target lookup, `transform()`, alias remap) before any model is mutated — pass-1 errors leave the store untouched.

**Return value depends on commit count:**

| Commits | Returns                                                           |
| ------- | ----------------------------------------------------------------- |
| 0       | Raw `$fetch` response (after `transformer.response`, if any)      |
| 1+      | Object keyed by `model`, value = what was committed to that model |

```typescript
const result = await store.action.list();
// 2 commits: { list: User[], pagination: { total, offset, limit } }
// 1 commit:  { list: User[] }
// 0 commits: raw response
```

**URL forms:**

```typescript
api.get({ url: "/users" }, …);
api.get({ url: (view) => `/users/${view.user.value.id}` }, …);

// :param syntax — resolved at call time
api.get({ url: "/users/:id" }, …);
await store.action.get({ params: { id: "42" } });
```

**Standard CRUD example:**

```typescript
action({ api }) {
    return {
        list:   api.get   ({ url: "/users" },          { model: "list",    mode: ModelManyMode.SET }),
        get:    api.get   ({ url: (v) => `/users/${v.user.value.id}` },
                                                       { model: "current", mode: ModelOneMode.SET }),
        create: api.post  ({ url: "/users" },          { model: "list",    mode: ModelManyMode.ADD }),
        update: api.patch ({ url: (v) => `/users/${v.user.value.id}` },
                                                       { model: "list",    mode: ModelManyMode.PATCH }),
        delete: api.delete({ url: (v) => `/users/${v.user.value.id}` },
                                                       { model: "list",    mode: ModelManyMode.REMOVE }),
    };
},
```

### 6.2 Handler actions

Callback receives `{ model, view, payload }`. Signature: `handler<P, R>(callback, options?)` — both default to `unknown` / `void`.

```typescript
action({ handler }) {
    return {
        sort: handler(async ({ model, view }) => {
            const sorted = [...view.users.value].sort((a, b) => a.name.localeCompare(b.name));
            model.list.set(sorted);
            return sorted;
        }),
        toggle: handler<Todo>(async ({ model, payload }) => {
            model.current.set({ ...payload, done: !payload.done });
        }),
        rename: handler<string>(
            async ({ model, view, payload }) => {
                model.current.set({ ...view.item.value, title: payload });
            },
            { payload: "Untitled" },              // definition-level default
        ),
    };
},
```

Handlers can mutate multiple models, make non-JSON `$fetch` calls, and return data:

```typescript
handler(async ({ model, view }) => {
    const result = await $fetch(`/projects/${view.project.value.id}/toggle`, { method: "PUT" });
    model.current.patch(result);
    model.list.patch(result);
    return result;
});
```

> **Handlers cannot call sibling actions.** The `action` object is not yet resolved when handler callbacks are defined — use [compose](#7-compose--optional-orchestration) for cross-action workflows.

### 6.3 Calling actions

```typescript
await store.action.list();

await store.action.list({
    params: { id: "42" }, // for :param URLs
    query: { page: 1 },
    headers: { Authorization: "Bearer …" },
    body: { name: "John" }, // POST/PUT/PATCH only
    timeout: 5000,
    signal: controller.signal, // AbortSignal
    concurrent: ActionConcurrent.CANCEL,
    transformer: {
        request: (api) => ({ ...api, headers: { ...api.headers, "X-Trace": id } }),
        response: (data) => data.items,
    },
    bind: { status, error }, // isolated tracking refs
    commit: { mode: ModelManyMode.PATCH }, // override mode for every commit entry (API actions only)
    // or per-entry: commit: { mode: { list: ModelManyMode.PATCH } }
    payload: anyValue, // handler actions only
});
```

**Option priority:** call-time > definition-time > module config > built-in defaults. Headers are deep-merged.

### 6.4 Lifecycle

- API actions: `nextTick` → concurrency check → resolve API → request → resolve commits → apply commits → done.
- Handler actions: `nextTick` → concurrency check → callback → done.

The commit phase is two-pass: resolve all entries (target lookup, `transform()`, alias inbound) into a plan, then apply each `target.commit(...)`. Pass-1 errors abort before any mutation.

Every call defers via `nextTick()` first, so pending Vue reactivity is flushed before the action runs.

### 6.5 Reactive metadata on every action

```typescript
store.action.list.loading; // ComputedRef<boolean>
store.action.list.status; // Readonly<Ref<ActionStatus>>      ← persists after run
store.action.list.error; // Readonly<Ref<Error | null>>      ← persists after run
store.action.list.reset(); // status → IDLE, error → null
```

`ActionStatus`: `IDLE`, `PENDING`, `SUCCESS`, `ERROR` (see runtime exports).

Template-friendly:

```vue
<div v-if="store.action.list.loading">Loading…</div>
<div v-else-if="store.action.list.error">{{ store.action.list.error.message }}</div>
<ul v-else><li v-for="u in store.view.users" :key="u.id">{{ u.name }}</li></ul>
```

### 6.6 Errors

- `ActionApiError` — HTTP request failed. Exposes `status` and `data`.
- `ActionHandlerError` — handler callback threw.
- `ActionCommitError` — commit step failed.
- `ActionConcurrentError` — blocked by `ActionConcurrent.BLOCK`.
- `AbortError` (DOM) — request was cancelled via `signal` or `ActionConcurrent.CANCEL`.

```typescript
try {
    await store.action.list();
} catch (error) {
    if (error.name === "ActionApiError") console.error(error.status, error.data);
    else if (error.name === "ActionConcurrentError") {
        /* already pending */
    } else if (error.name === "AbortError") {
        /* cancelled */
    } else throw error;
}
```

---

## 7. Compose — Optional Orchestration

Compose runs **after** all other layers are fully resolved, so it has **typed access to actions** — unlike handlers.

```typescript
compose({ model, view, action }) {
    return {
        loadAll: async () => {
            await action.fetchUsers();
            await action.fetchTodos();
        },
        resetAll: () => {
            model.users.reset();
            model.todos.reset();
        },
        selectUser: (user: User)               => model.current.set(user),
        quickAdd:   async (name: string, email: string) => action.createUser({ body: { name, email } }),
    };
},
```

### Compose vs Handler

| Use `compose` when...                    | Use `handler` when...               |
| ---------------------------------------- | ----------------------------------- |
| Calling multiple actions in sequence     | Single async operation              |
| Orchestrating actions + mutations        | Non-JSON HTTP request               |
| Building workflows from existing actions | Need typed `payload` from call site |
| Need typed `action` object               | Returning data from the operation   |

### Calling

```typescript
await store.compose.loadAll();
store.compose.resetAll();
store.compose.selectUser(user);
await store.compose.quickAdd("John", "john@x.com");
```

### Reactive `active` ref

```typescript
store.compose.loadAll.active; // Readonly<Ref<boolean>>
```

```vue
<button @click="store.compose.loadAll()" :disabled="store.compose.loadAll.active">
    {{ store.compose.loadAll.active ? "Loading…" : "Load All" }}
</button>
```

### Error handling

Compose does **not** track `error` or `status` — only `active`. Errors bubble to the caller; `active` always resets to `false` afterward (success or failure).

```typescript
try {
    await store.compose.loadAll();
} catch (error) {
    /* handle */
}
```

---

## 8. `createStore` — Putting It All Together

```typescript
import { createStore } from "@diphyx/harlemify"; // auto-imported in Nuxt
import { shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify/runtime";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));
export type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users", // unique store name; used for logging tag
    lazy: false, // optional, default false (see §9.4)

    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },

    view({ from, merge }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (m) => m.length),
            summary: merge(["current", "list"], (c, l) => ({ selected: c.name, total: l.length })),
        };
    },

    action({ api, handler }) {
        return {
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
            get: api.get({ url: (v) => `/users/${v.user.value.id}` }, { model: "current", mode: ModelOneMode.SET }),
            create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
            update: api.patch(
                { url: (v) => `/users/${v.user.value.id}` },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                { url: (v) => `/users/${v.user.value.id}` },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
        };
    },

    compose({ model, action }) {
        // optional
        return {
            loadAll: async () => {
                await action.list();
            },
            clearAll: () => {
                model.current.reset();
                model.list.reset();
            },
        };
    },
});
```

The returned `store` exposes exactly four properties: `store.model`, `store.view`, `store.action`, `store.compose`. (The `name` you pass in is used for Harlem's source store registry and the logger tag — it is not re-exposed on the returned object.)

---

## 9. Composables (Component Usage)

All four are auto-imported in Nuxt. They give consistent `{ execute / set / patch / reset / data / track / active }` patterns matching their underlying layer.

### 9.1 `useStoreAction(store, key, options?)`

```typescript
const { execute, status, loading, error, reset } = useStoreAction(userStore, "list");

await execute(); // calls underlying action
await execute({ payload: todo }); // handler payload
await execute({ body: data, query: { page: 1 } }); // ActionCallOptions
reset(); // status → IDLE, error → null
```

**Options:** `{ isolated: boolean = false }` — when `true`, creates independent `status`/`error` refs scoped to this composable instance. Multiple components calling the same action each maintain their own loading/error state. The store's global `action.status` and `action.error` remain unchanged. The composable wires `bind` internally — you cannot pass `bind` through `execute()` (it is `Omit<O, "bind">`).

**Return type:**

```typescript
type UseStoreAction<T, O = ActionCallOptions> = {
    execute: (options?: Omit<O, "bind">) => Promise<T>;
    status: Readonly<Ref<ActionStatus>>;
    loading: ComputedRef<boolean>;
    error: Readonly<Ref<Error | null>>;
    reset: () => void;
};
```

### 9.2 `useStoreModel(store, key, options?)`

Typed mutation methods. Shape depends on whether the model is `one` or `many`.

```typescript
// one
const { set, patch, reset } = useStoreModel(userStore, "current");
// many (list or record)
const { set, add, remove, patch, reset } = useStoreModel(userStore, "list");
```

**Options:**
| Option | Type | Effect |
| ---------- | -------- | ---------------------------------------------------------------------- |
| `debounce` | `number` | Delays all mutations by N ms; only the last call within window runs |
| `throttle` | `number` | First call runs immediately; later calls within N ms are dropped |

All methods accept the same per-call options as the underlying mutation, including `{ silent: true | ModelSilent.PRE | ModelSilent.POST }`.

```typescript
import { ModelSilent } from "@diphyx/harlemify/runtime";
set(value, { silent: true });
patch({ name: "X" }, { silent: ModelSilent.PRE });
```

### 9.3 `useStoreView(store, key)`

```typescript
const { data, track } = useStoreView(userStore, "user");
data.value; // User (auto-unwrapped in templates)

const stop = track((value) => console.log("changed:", value), {
    immediate: true,
    deep: true,
    debounce: 300,
    throttle: 500,
});
stop(); // teardown
```

**Return:** `{ data: ComputedRef<T>; track(handler, options?): WatchStopHandle }`.

### 9.4 `useStoreCompose(store, key)`

```typescript
const loadAll = useStoreCompose(dashboardStore, "loadAll");
const quickAdd = useStoreCompose(dashboardStore, "quickAdd");

await loadAll.execute();
await quickAdd.execute("John", "john@x.com"); // typed args from compose definition
loadAll.active.value; // Readonly<Ref<boolean>>
```

**Return:** `{ execute(...args): Promise<void>; active: Readonly<Ref<boolean>> }`.

### 9.5 Direct store access (composables are optional)

```typescript
await userStore.action.list();
userStore.model.current.set(user);
userStore.view.users.value;
await userStore.compose.loadAll();
```

---

## 10. Advanced Topics

### 10.1 Concurrency (`ActionConcurrent`)

| Strategy                  | Behavior                                                           |
| ------------------------- | ------------------------------------------------------------------ |
| `ActionConcurrent.BLOCK`  | Throw `ActionConcurrentError` if already pending (**default**)     |
| `ActionConcurrent.SKIP`   | Return the existing in-flight promise (deduplication)              |
| `ActionConcurrent.CANCEL` | Abort the previous request (`AbortController`) and start a new one |
| `ActionConcurrent.ALLOW`  | Execute both independently (no guard)                              |

Set at: call site → definition → module config → built-in default.

**Recipes:**

- Form submit / create → `BLOCK` (prevent duplicate submission).
- Idempotent fetch → `SKIP` (dedupe).
- Search / autocomplete → `CANCEL` (latest-wins).
- Fire-and-forget logging → `ALLOW`.

### 10.2 Cancellation (`AbortSignal`)

```typescript
const controller = new AbortController();
const promise = store.action.list({ signal: controller.signal });
controller.abort();

try {
    await promise;
} catch (err) {
    if (err.name !== "AbortError") throw err;
}
```

Common patterns: cancel on `onUnmounted`, cancel previous on new input, custom timeout via `setTimeout(() => controller.abort(), ms)`. For most search use cases, prefer `ActionConcurrent.CANCEL` over manual `AbortController`.

### 10.3 Isolated Status / Error

Default: all callers of an action share one `status` and `error` ref. Use isolated refs to split tracking per UI context.

```typescript
import { ActionStatus } from "@diphyx/harlemify/runtime";

const headerStatus = useIsolatedActionStatus(); // Ref<ActionStatus> = IDLE
const headerError = useIsolatedActionError(); // Ref<Error | null> = null

await store.action.list({ bind: { status: headerStatus, error: headerError } });

// Global refs (store.action.list.status / .error) are untouched
```

`useStoreAction(store, key, { isolated: true })` is a one-liner that wraps this pattern.

### 10.4 Lazy Store

Default is eager — store is created at module evaluation. Set `lazy: true` to defer creation until first property access:

```typescript
export const configStore = createStore({
    name: "config",
    lazy: true,
    model({ one }) {
        const route = useRoute(); // needs Nuxt app to be ready
        return {
            config: one(configShape, {
                default: () => ({ theme: route.query.theme ?? "dark" }),
            }),
        };
    },
    view({ from }) {
        /* … */
    },
    action({ api }) {
        /* … */
    },
});
```

Use lazy whenever the factory functions need Nuxt composables (`useRoute`, `useRuntimeConfig`, `useCookie`, …). Subsequent accesses reuse the same instance — initialization runs only once.

### 10.5 SSR

Built in — no configuration required.

- **Server:** models reset to defaults per request → actions run during SSR populate state → state serialized to `nuxtApp.payload`.
- **Client:** hydrates from payload → no duplicate fetch.

For SSR safety, use **function defaults** so each request gets a fresh object (avoids cross-request state leakage):

```typescript
one(userShape, { default: () => ({ id: 0, name: "", email: "" }) });
```

Combine with `lazy: true` if defaults depend on Nuxt composables.

### 10.6 Logging

```typescript
harlemify: {
    logger: process.env.NODE_ENV === "development" ? 999 : -999,
}
```

| Level   | Value  |
| ------- | ------ |
| Silent  | `-999` |
| Error   | `0`    |
| Warn    | `1`    |
| Info    | `3`    |
| Debug   | `4`    |
| Verbose | `999`  |

Each store gets a tagged logger `harlemify:{storeName}` covering lifecycle, model registration & mutations, view registration, action requests/responses/commits, compose execution, errors, and concurrency events.

---

## 11. Enum & Type Cheat Sheet

```typescript
import {
    // Enums
    ModelOneMode, // SET | RESET | PATCH
    ModelManyMode, // SET | RESET | PATCH | REMOVE | ADD
    ModelManyKind, // LIST | RECORD
    ModelType, // ONE | MANY
    ModelSilent, // PRE | POST
    ViewClone, // SHALLOW | DEEP
    ActionStatus, // IDLE | PENDING | SUCCESS | ERROR
    ActionConcurrent, // BLOCK | SKIP | CANCEL | ALLOW
    ActionApiMethod, // GET | HEAD | POST | PUT | PATCH | DELETE
    ActionType,

    // Errors
    ActionApiError,
    ActionHandlerError,
    ActionCommitError,
    ActionConcurrentError,
    isError,
    toError,

    // Types
    type Store,
    type StoreConfig,
    type ShapeInfer,
    type ActionCallOptions,
    type ActionCallBindOptions,
    type ActionCallTransformerOptions,
    type ModelOneCommitOptions,
    type ModelManyCommitOptions,
    type ViewDefinitionOptions,
    type ComposeContext,
    type UseStoreAction,
    type UseStoreModel,
    type UseStoreView,
    type UseStoreCompose,
} from "@diphyx/harlemify/runtime";
```

---

## 12. Patterns & Gotchas (Important for Agents)

1. **Always import enums/types from `@diphyx/harlemify/runtime`.** The default `@diphyx/harlemify` import is the Nuxt module entry, not the runtime.
2. **Auto-imports cover composables and `createStore` in Nuxt code only.** In plain `.ts` files outside the Nuxt context you may need explicit imports.
3. **Identifier defaults to `id`.** If your shape's PK is something else and you do not mark it with `.meta({ identifier: true })`, pass `{ identifier: "uuid" }` at the model level — otherwise `many.patch` / `add({ unique: true })` will misbehave.
4. **`GET`/`HEAD` actions ignore `body`.** Don't try to send a body on these methods.
5. **API actions are JSON-only** (`responseType: "json"`). For blobs/streams/text use `handler` with raw `$fetch`.
6. **Handlers can't call sibling actions.** Cross-action workflows go in `compose`.
7. **View resolvers receive a readonly proxy.** To use mutating array methods (`sort`, `reverse`), set `{ clone: ViewClone.SHALLOW }` (or `DEEP` for nested mutation).
8. **Model `pre`/`post` hooks are not guards.** They run around the mutation; throwing inside them is caught and the mutation still proceeds.
9. **Function defaults must be sync** and return a fresh value each call — used for SSR state isolation and per-request initialization.
10. **`lazy: true` is required** when model/view/action/compose factories use Nuxt composables (`useRoute`, `useRuntimeConfig`, etc.).
11. **Status & error persist after a run.** Call `store.action.foo.reset()` or composable `reset()` to clear them.
12. **Compose tracks `active`, not `status`/`error`.** Errors bubble — wrap calls in `try/catch` if needed.
13. **Alias remapping is skipped without a `commit` config**, when the shape has no aliases, and for non-object bodies (`FormData`, `Blob`).
14. **Option priority for actions:** call-time > definition > module config > built-in. Headers deep-merge.
15. **For autocomplete-style search:** prefer `ActionConcurrent.CANCEL` over hand-rolled `AbortController` — it handles the abort wiring for you.
16. **For the same action displayed in two UI spots with independent spinners:** use `useStoreAction(..., { isolated: true })` (or `useIsolatedActionStatus()` + `bind`).
17. **Action return value is keyed by commit `model`.** With 1+ commits, `await store.action.foo()` resolves to `{ [model]: value, … }`. With 0 commits it returns the raw response. Destructure: `const { list } = await store.action.list()`.
18. **Multi-commit with `transform()` is the answer to envelope responses** (`{ data, meta, pagination }`). Don't reach for `handler` just to slice a response across models — `api.*` with multiple commits keeps the URL/param/alias machinery you'd lose with a handler.

---

## 13. Minimal End-to-End Reference Example

```typescript
// stores/user.ts
import { shape, ModelOneMode, ModelManyMode, ActionConcurrent, type ShapeInfer } from "@diphyx/harlemify/runtime";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email().meta({ alias: "email-address" }),
}));
export type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
    view({ from, merge }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (l) => l.length),
            summary: merge(["current", "list"], (c, l) => ({ selected: c.name, total: l.length })),
        };
    },
    action({ api, handler }) {
        return {
            list: api.get(
                { url: "/users", concurrent: ActionConcurrent.SKIP },
                { model: "list", mode: ModelManyMode.SET },
            ),
            create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD, options: { prepend: true } }),
            update: api.patch(
                { url: (v) => `/users/${v.user.value.id}` },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                { url: (v) => `/users/${v.user.value.id}` },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
            select: handler<User>(async ({ model, payload }) => {
                model.current.set(payload);
            }),
        };
    },
    compose({ model, action }) {
        return {
            refresh: async () => {
                await action.list();
            },
            clear: () => {
                model.current.reset();
                model.list.reset();
            },
        };
    },
});
```

```vue
<!-- pages/users.vue -->
<script setup lang="ts">
import { userStore, type User } from "~/stores/user";

const { execute: loadUsers, loading } = useStoreAction(userStore, "list");
const { execute: createUser } = useStoreAction(userStore, "create");
const { execute: selectUser } = useStoreAction(userStore, "select");
const { data: users } = useStoreView(userStore, "users");
const { data: count } = useStoreView(userStore, "count");
const refresh = useStoreCompose(userStore, "refresh");

await loadUsers(); // runs during SSR; hydrates on client

async function add() {
    await createUser({ body: { name: "John", email: "j@x.com" } });
}
</script>

<template>
    <button @click="add()">Add user</button>
    <button @click="refresh.execute()" :disabled="refresh.active">Refresh</button>

    <div v-if="loading">Loading…</div>
    <ul v-else>
        <li v-for="u in users" :key="u.id" @click="selectUser({ payload: u })">{{ u.name }} — {{ u.email }}</li>
    </ul>
    <p>Total: {{ count }}</p>
</template>
```

---

## 14. Quick Decision Tree

- **"Where do I put state?"** → `model` (`one` for singletons, `many` for collections/records).
- **"How do I derive data?"** → `view` (`from` for single source, `merge` for multi-source).
- **"How do I fetch data?"** → `action.api.{get,post,patch,…}` with a commit config.
- **"How do I implement a custom async op or non-JSON request?"** → `action.handler`.
- **"How do I sequence multiple actions or combine actions + mutations?"** → `compose`.
- **"How do I track loading per-button independently?"** → `useStoreAction(..., { isolated: true })`.
- **"How do I cancel a search request?"** → `ActionConcurrent.CANCEL` (preferred) or pass an `AbortSignal`.
- **"My factory needs `useRoute`/`useCookie`."** → `lazy: true`.
- **"My API uses different key names than my code."** → `.meta({ alias: "…" })` on the shape fields.

---

## 15. Compatibility & Versions

| Dependency | Version               |
| ---------- | --------------------- |
| Nuxt       | `^3.14.0` or `^4.0.0` |
| Vue        | `^3.5.0`              |
| Zod        | `^4.0.0`              |

> Early Nuxt 4 versions (e.g. 4.1.x) may fail to resolve the `#build/harlemify.config` alias — upgrade to the latest Nuxt 4 release.

Official docs: https://diphyx.github.io/harlemify/
Repo: https://github.com/diphyx/harlemify
License: MIT
