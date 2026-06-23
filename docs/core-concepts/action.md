# Action

Actions define async operations. The action factory provides two entry points: `api` for HTTP requests and `handler` for custom logic.

> **Related:** [`useStoreAction`](../composables/use-store-action.md) — call this action from a component.

```typescript
action({ api, handler }) {
    return {
        fetch: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        sort: handler(async ({ model, view }) => { ... }),
    };
},
```

## API vs Handler

| Use `api` when...                       | Use `handler` when...                        |
| --------------------------------------- | -------------------------------------------- |
| Making a standard JSON HTTP request     | Running custom async logic                   |
| Auto-committing the response to a model | Mutating multiple models in one call         |
| Using built-in alias mapping            | Making non-JSON requests (blobs, streams)    |
| Using request/response transformers     | Combining API calls with local state updates |

## API Actions

Make HTTP requests and optionally commit the response to one or more models:

```typescript
api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET });
```

The first argument is the request config. Every following argument is a commit config — pass zero, one, or many.

### HTTP Methods

```typescript
api.get({ url: "/users" });
api.head({ url: "/users" });
api.post({ url: "/users" });
api.put({ url: "/users/1" });
api.patch({ url: "/users/1" });
api.delete({ url: "/users/1" });
```

> `GET` and `HEAD` requests always have their `body` set to `undefined`, even if a body is provided at definition or call time.

> API actions use `$fetch` with `responseType: "json"` and are designed for JSON APIs. For non-JSON responses (blobs, streams, text), use a [handler action](#handler-actions) with a direct `$fetch` call instead.

### Request Options

The request object (first argument) accepts these fields at definition time. `endpoint`, `headers`, `query`, and `timeout` fall back to module config (see [Configuration](../getting-started/configuration.md#module-configuration)) and can be overridden per call.

| Option       | Type                           | Description                                                             |
| ------------ | ------------------------------ | ----------------------------------------------------------------------- |
| `url`        | `string \| (view) => string`   | Request path; supports `:param` placeholders and view-derived functions |
| `method`     | `ActionApiMethod`              | HTTP method (set automatically by the `api.get`/`post`/… shortcuts)     |
| `endpoint`   | `string`                       | Base URL prepended to `url`; falls back to module `action.endpoint`     |
| `headers`    | `Record \| (view) => Record`   | Request headers; deep-merged with module + call-time headers            |
| `query`      | `Record \| (view) => Record`   | Query parameters; merged with module + call-time query                  |
| `body`       | `unknown \| (view) => unknown` | Request body (ignored for `GET`/`HEAD`); merged with call-time body     |
| `timeout`    | `number \| (view) => number`   | Request timeout in ms; falls back to module `action.timeout`            |
| `concurrent` | `ActionConcurrent`             | Concurrency strategy; falls back to module `action.concurrent`          |
| `hooks`      | `{ pre?, post? }`              | Lifecycle hooks around the request — see [Hooks](#hooks)                |

> Fields typed `(view) => T` are resolved against the read-only view at call time, so they can derive from current store state.

### Dynamic URLs

Use a function to resolve URLs from view state:

```typescript
api.get(
    {
        url(view) {
            return `/users/${view.user.value.id}`;
        },
    },
    { model: "current", mode: ModelOneMode.SET },
);
```

### URL Parameters

Use `:param` syntax and resolve at call time:

```typescript
// Definition
api.get({ url: "/users/:id" }, { model: "current", mode: ModelOneMode.SET });

// Call
await store.action.get({ params: { id: "42" } });
```

### Commit Config

Each commit argument defines how to commit the response into one model:

```typescript
{
    model: "list",                             // Target model key
    mode: ModelManyMode.ADD,                   // Commit mode
    transform: (data) => data.items,           // Optional: reshape response before commit
    options: { unique: true, prepend: true },  // Optional: mutation options
}
```

### Multiple Commits

For wrapped/envelope responses, pass multiple commit configs and slice the response per target:

```typescript
api.get(
    { url: "/users" },
    { model: "list", mode: ModelManyMode.SET, transform: (data) => data.output },
    { model: "pagination", mode: ModelOneMode.SET, transform: (data) => data.meta },
);
```

Each commit applies independently. Pass `transform` to extract the slice that belongs to that model.

### Commit Context

`transform` receives a second `context` argument exposing the resolved request, the call params, and the read-only view:

```typescript
transform(data, context) {
    // data         — the API response (what would be committed if no transform)
    context.request; // Readonly<{ url, method, headers, query, body }> — the resolved request
    context.params;  // Readonly<Record<string, string | number>> — the path params passed to the call
    context.view;    // DeepReadonly<StoreView> — read store state during the commit
}
```

**Merge request body back in.** Canonical case: `POST /collections` returns sparse `{ id }` only — the body the caller sent is otherwise lost.

```typescript
api.post(
    { url: "/collections" },
    {
        model: "list",
        mode: ModelManyMode.ADD,
        transform: (data, { request }) => ({ ...(request.body as object), ...(data as object) }),
    },
);
```

**Derive from existing store state.** Read `context.view` to shape the committed value from what's already there — useful for partial-update endpoints (PATCH) that return just the changed fields.

```typescript
api.patch(
    {
        url(view) {
            return `/users/${view.user.value.id}`;
        },
    },
    {
        model: "user",
        mode: ModelOneMode.SET,
        transform: (data, { view }) => ({ ...view.user.value, ...(data as object) }),
    },
);
```

**Multi-commit.** Every transform in a multi-commit chain receives the same `context` object — they all see the same `request` and `view` snapshot.

**Rules.**

- `context.request`, `context.params`, and `context.view` are read-only — use them to read, not to mutate.
- `transform` must be synchronous; returning a Promise is not supported.
- `context.view` is a snapshot at the moment the commit phase begins — reading it inside one transform won't observe writes another transform makes later.

> **TypeScript inference quirk.** TS can't currently infer the `context` param's type through the factory's overloaded generics. If your editor flags `context` as `any`, annotate it explicitly — either with the exported `ActionApiCommitContext` type or a minimal inline shape (e.g. `{ request: { body: unknown } }`).

### Return Value

The shape of `await store.action.xxx()` depends on the number of commits:

| Commits | Returns                                                                   |
| ------- | ------------------------------------------------------------------------- |
| 0       | The raw `$fetch` response (after `transformer.response`, if any)          |
| 1+      | An object keyed by `model`, each value = what was committed to that model |

```typescript
// 2 commits
const result = await store.action.list();
// result = { list: User[], pagination: { total, offset, limit } }

result.list; // committed users
result.pagination; // committed pagination

// 0 commits
const raw = await store.action.fire();
// raw = whatever $fetch returned
```

#### Mode-aware typing

Each committed value is **what was passed to the model commit**, not the model's full state — so its static type follows the commit `mode`, matching the model's own commit signatures. For a `many` (LIST) model:

| mode     | resolved value type               |
| -------- | --------------------------------- |
| `SET`    | `S[]`                             |
| `ADD`    | `S \| S[]`                        |
| `PATCH`  | `Partial<S> \| Partial<S>[]`      |
| `REMOVE` | `Pick<S, I> \| Pick<S, I>[] \| …` |
| `RESET`  | `unknown`                         |

and for a `one` model: `SET → S`, `PATCH → Partial<S>`, `RESET → unknown`.

```typescript
// list: api.get(..., { model: "list", mode: ModelManyMode.SET })
const all = await store.action.list();
all.list; // User[]  — the endpoint returns an array

// create: api.post(..., { model: "list", mode: ModelManyMode.ADD })
const created = await store.action.create({ body });
created.list; // User | User[]  — a single-entity ADD returns one User at runtime
```

When a commit has a `transform`, the resolved type is the **`transform`'s return type** (the value it actually commits), overriding the mode-derived type.

### Atomic Commits

Commits resolve in two phases:

1. **Resolve** — for every entry: look up the target model, run `transform(data)`, apply alias remapping.
2. **Apply** — write each prepared value into its model.

Any error in phase 1 (typo in `model`, throw in `transform()`) aborts the action **before any model is mutated** — the store stays untouched.

### Alias Mapping

When a shape defines field aliases via `.meta({ alias })`, key remapping is applied automatically — no transformers needed.

```typescript
const contactShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    first_name: factory.string().meta({ alias: "first-name" }),
    last_name: factory.string().meta({ alias: "last-name" }),
    email: factory.email(),
}));
```

For actions with a `commit` config pointing to a model that uses an aliased shape:

- **Outbound:** Request body keys are remapped from shape keys to alias keys. `{ first_name: "John" }` becomes `{ "first-name": "John" }`. With multiple commits, outbound aliasing uses the **first commit's** target.
- **Inbound:** Each commit's slice (after `transform()`) is remapped using **its own target's** aliases. Different targets can have different alias maps without conflict.

**Ordering with transformers:**

- **Outbound:** `resolveBody()` → alias remap → `transformer.request`
- **Inbound:** `$fetch` → `transformer.response` → alias remap → commit

User transformers see alias keys outbound and original API keys inbound. The store always uses shape keys.

**When aliases are skipped:**

- Actions without a `commit` config (no model to resolve aliases from)
- Models whose shape has no aliases defined
- Non-object body types (`FormData`, `Blob`, etc.)

### Hooks

Attach `pre`/`post` lifecycle hooks to an API action. `pre` runs before the request is sent; `post` runs after the attempt completes — on success **and** failure.

```typescript
api.get(
    {
        url: "/users",
        hooks: {
            pre({ request }) {
                // before send — observe the resolved request
            },
            post({ request, response }) {
                // after attempt — observe the outcome
            },
        },
    },
    { model: "list", mode: ModelManyMode.SET },
);
```

**Context.** Both hooks receive the resolved `request` ([`ActionResolvedApi`](#calling-actions): `url`, `method`, `headers`, `query`, `body`, …). `post` additionally receives `response` whenever the server responded, and surfaces a client-side failure via `request.error`:

| Outcome                          | `request.error` | `response`                                              |
| -------------------------------- | --------------- | ------------------------------------------------------- |
| success                          | —               | `{ status, headers, data }`                             |
| server-side (HTTP error status)  | —               | `{ status, headers, data }` — inspect `response.status` |
| client-side (request never sent) | the error       | `undefined`                                             |

**Behavior.**

- **Definition-level only.** Hooks live on the request definition — for per-call shaping use [`transformer`](#transformer) instead.
- **Observe, don't mutate.** Hooks are for cross-cutting concerns (rate-limiting, telemetry, syncing from response headers). Use [`transformer.request`](#transformer) to change _what_ is sent.
- **`pre` is awaited** — `await` inside it to gate or delay every request (e.g. throttling / rate-limit windows).
- **Throw-safe.** A hook that throws is caught and logged; it does not change the action's outcome.

> **SSR state safety.** A hook that closes over module-scoped state (a counter, a timestamp, a token-bucket) shares that state across **all** requests on the server, since one server process serves every user. Keep only **global** concerns there (e.g. an app-wide rate-limit window). For **per-user or per-request** state, scope it to the request instead (`useState`, the event context) — never a module-level variable.

## Handler Actions

Custom async logic with direct access to model, view, and payload. Use handlers when you need to mutate multiple models, transform data locally, or make non-JSON HTTP requests.

The callback receives a context object with three properties:

```typescript
handler(async ({ model, view, payload }) => {
    // model   — StoreModel: typed access to all model mutations
    // view    — StoreView: typed access to all view computed values
    // payload — typed call-time or default input data
});
```

You can destructure only what you need:

```typescript
handler(async ({ model, view }) => {
    const sorted = [...view.users.value].sort((a, b) => a.name.localeCompare(b.name));
    model.list.set(sorted);
    return sorted;
});
```

Handlers can commit to multiple models in a single call:

```typescript
handler(async ({ model, view }) => {
    const result = await $fetch(`/projects/${view.project.value.id}/toggle`, { method: "PUT" });
    model.current.patch(result);
    model.list.patch(result);
    return result;
});
```

### Payload

Handlers receive a typed `payload` in the callback context. The generic signature is `handler<P, R>` where `P` is the payload type and `R` is the return type. Both default to `unknown` and `void` respectively, so you only need to specify what you use — `handler<Todo>(...)` is enough when you only need a typed payload.

**Call-time payload:**

```typescript
action({ handler }) {
    return {
        toggle: handler<Todo>(async ({ model, payload }) => {
            model.current.set({ ...payload, done: !payload.done });
        }),
    };
},
```

```typescript
await store.action.toggle({ payload: todo });
```

**Definition-level default payload:**

```typescript
action({ handler }) {
    return {
        rename: handler<string>(
            async ({ model, view, payload }) => {
                const current = view.item.value;
                model.current.set({ ...current, title: payload });
            },
            { payload: "Untitled" },
        ),
    };
},
```

```typescript
await store.action.rename(); // payload is "Untitled"
await store.action.rename({ payload: "My Title" }); // payload is "My Title"
```

> Call-time payload always overrides the definition-level default. When neither is provided, `payload` is `undefined`.

## Calling Actions

```typescript
await store.action.fetch();

await store.action.fetch({
    params: { id: "42" },
    headers: { Authorization: "Bearer token" },
    query: { page: 1 },
    body: { name: "John" },
    timeout: 5000,
    signal: controller.signal,
    concurrent: ActionConcurrent.CANCEL,
});
```

> **Option priority:** Call-time options override definition-time values, which override module config, which override built-in defaults. Headers are deep-merged.

### Option Levels

Most request options can be set at more than one level. The effective value is resolved highest-priority-first:

**Module** (`nuxt.config`) → **Definition** (`api.*` request) → **Call** (`store.action.x({ ... })`).

| Option        | Module | Definition | Call | Resolution                                                |
| ------------- | :----: | :--------: | :--: | --------------------------------------------------------- |
| `endpoint`    |   ✅   |     ✅     |  —   | Definition overrides module                               |
| `headers`     |   ✅   |     ✅     |  ✅  | Deep-merged across all three (call wins on conflict)      |
| `query`       |   ✅   |     ✅     |  ✅  | Merged across all three (call wins on conflict)           |
| `body`        |   —    |     ✅     |  ✅  | Merged; call wins (ignored for `GET`/`HEAD`)              |
| `timeout`     |   ✅   |     ✅     |  ✅  | Call → definition → module                                |
| `concurrent`  |   ✅   |     ✅     |  ✅  | Call → definition → module → default (`BLOCK`)            |
| `params`      |   —    |     —      |  ✅  | Call only — fills `:param` placeholders in `url`          |
| `signal`      |   —    |     —      |  ✅  | Call only — otherwise a managed `AbortController` is used |
| `transformer` |   —    |     —      |  ✅  | Call only — request/response transforms                   |
| `commit`      |   —    |     —      |  ✅  | Call only — override commit `mode` / `options`            |
| `hooks`       |   —    |     ✅     |  —   | Definition only — `pre`/`post` lifecycle hooks            |

> Module-level defaults are folded into each definition when the store is built, so a definition value always wins over module config.

### Commit Mode Override

Override the commit `mode` per call. Two forms:

```typescript
// applies to every commit entry
await store.action.list({ commit: { mode: ModelManyMode.ADD } });

// per-entry, keyed by model name
await store.action.list({
    commit: { mode: { list: ModelManyMode.ADD } }, // only the "list" entry is overridden; others keep their defined mode
});
```

### Commit Options Override

Override the commit `options` (`unique`, `prepend`, `by`, `deep`, `silent`) per call, alongside or instead of `mode`. Same two forms as `mode`:

```typescript
// applies to every commit entry
await store.action.list({
    commit: { mode: ModelManyMode.ADD, options: { unique: true, prepend: true } },
});

// per-entry, keyed by model name
await store.action.list({
    commit: { options: { list: { unique: true } } }, // only the "list" entry's options are overridden
});
```

Call-time options are merged over the entry's defined `options` — keys you don't pass keep their defined values. The per-entry form is distinguished from the global form by its values being objects (e.g. `{ list: { unique: true } }` is per-entry; `{ unique: true }` is global).

> The form is detected structurally, so a per-entry override targeting a single model still uses the keyed form: `{ options: { list: { unique: true } } }`, not `{ options: { unique: true } }`.

### Transformer

Transform request and/or response at call time:

```typescript
await store.action.fetch({
    transformer: {
        request: (api) => ({ ...api, headers: { ...api.headers, "X-Custom": "value" } }),
        response: (data) => data.name,
    },
});
```

### Bind

Track status independently with isolated refs:

```typescript
const status = useIsolatedActionStatus();
await store.action.fetch({ bind: { status } });
```

See [Isolated Status](../advanced/isolated-status.md) for details.

## Execution Lifecycle

Every action call defers via `nextTick()` before executing. This ensures Vue's reactivity system has processed any pending state changes before the action runs.

- **API actions:** nextTick → concurrency check → resolve API → request → resolve commits → apply commits → done
- **Handler actions:** nextTick → concurrency check → callback → done

Commit phase is two-pass — see [Atomic Commits](#atomic-commits).

## Action Properties

Every action has built-in reactive metadata:

```typescript
store.action.fetch.loading; // ComputedRef<boolean>
store.action.fetch.status; // Readonly<Ref<ActionStatus>>
store.action.fetch.error; // Readonly<Ref<Error | null>>
store.action.fetch.reset(); // Reset to idle
```

> `status` and `error` persist after execution. Call `reset()` to clear them back to their initial values (`IDLE`, `null`).

### Template Usage

```vue
<template>
    <div v-if="action.list.loading">Loading...</div>
    <div v-else-if="action.list.error">{{ action.list.error.message }}</div>
    <ul v-else>
        <li v-for="user in view.users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Error Types

| Error                   | When                         |
| ----------------------- | ---------------------------- |
| `ActionApiError`        | HTTP request failed          |
| `ActionHandlerError`    | Handler callback threw       |
| `ActionCommitError`     | Commit operation failed      |
| `ActionConcurrentError` | Blocked by concurrency guard |

```typescript
try {
    await store.action.fetch();
} catch (error) {
    if (error.name === "ActionApiError") {
        console.error("API error:", error.status, error.data);
    }
}
```

`ActionApiError`, `ActionHandlerError`, and `ActionCommitError` wrap the original failure on the native `cause`, so you can inspect it — e.g. the `$fetch` `FetchError` with its `request`/`response`:

```typescript
catch (error) {
    if (error instanceof ActionApiError) {
        error.cause; // the original $fetch FetchError
    }
}
```

## Next Steps

- [Compose](compose.md) — Orchestrate multiple actions and model mutations
- [Concurrency](../advanced/concurrency.md) — Control concurrent action execution
- [Cancellation](../advanced/cancellation.md) — Cancel in-flight requests
