# Action

Actions define async operations. The action factory provides two entry points: `api` and `handler`.

```typescript
action({ api, handler }) {
    return {
        fetch: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        sort: handler(async ({ model, view }) => { ... }),
    };
},
```

## When to Use API vs Handler

| Use `api` when... | Use `handler` when... |
| --- | --- |
| Making a standard JSON HTTP request | Running custom async logic |
| Auto-committing the response to a single model | Mutating multiple models in one call |
| Using built-in alias mapping | Making non-JSON requests (blobs, streams) |
| Using request/response transformers | Combining API calls with local state updates |

## API Actions

Make HTTP requests and optionally commit the response to a model:

```typescript
api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET });
```

The first argument is the request, the second (optional) is the commit config.

### HTTP Methods

```typescript
api.get({ url: "/users" });
api.head({ url: "/users" });
api.post({ url: "/users" });
api.put({ url: "/users/1" });
api.patch({ url: "/users/1" });
api.delete({ url: "/users/1" });
```

> **Note:** `GET` and `HEAD` requests always have their `body` set to `undefined`, even if a body is provided at definition or call time.

> **Note:** API actions use `$fetch` with `responseType: "json"` and are designed for JSON APIs. For non-JSON responses (blobs, streams, text, etc.), use a [handler action](#handler-actions) with a direct `$fetch` call instead.

### Dynamic URLs

Use a function to resolve URLs from view state:

```typescript
api.get(
    {
        url(view) {
            return `/users/${view.user.value?.id}`;
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

The second argument defines how to commit the response:

```typescript
{
    model: "list",                          // Target model key
    mode: ModelManyMode.ADD,                // Commit mode
    value: (data) => data.items,            // Optional: transform before commit
    options: { unique: true, prepend: true }, // Optional: mutation options
}
```

## Handler Actions

Custom async logic with direct access to model, view, and payload. Use handlers when you need to mutate multiple models, transform data locally, or make non-JSON HTTP requests.

The callback receives a single context object with three properties:

```typescript
handler(async ({ model, view, payload }) => {
    // model   — StoreModel: typed access to all model mutations
    // view    — StoreView: typed access to all view computed values
    // payload — typed call-time or default input data (see Payload section)
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
    const result = await $fetch(`/projects/${view.project.value?.id}/toggle`, { method: "PUT" });
    model.current.patch(result);
    model.list.patch(result);
    return result;
});
```

### Payload

Handlers receive a typed `payload` in the callback context. The generic signature is `handler<P, R>` where `P` is the payload type and `R` is the return type. Both default to `unknown` and `void` respectively, so you only need to specify what you use — `handler<Todo>(...)` is enough when you only need a typed payload. Payload can be passed at call time and/or set as a default at definition time.

#### Call-time payload

Pass data directly when calling the action:

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

#### Definition-level default payload

Set a default payload value that is used when no call-time payload is provided:

```typescript
action({ handler }) {
    return {
        rename: handler<string>(
            async ({ model, view, payload }) => {
                const current = view.item.value;
                if (!current) return;
                model.current.set({ ...current, title: payload });
            },
            { payload: "Untitled" },
        ),
    };
},
```

```typescript
await store.action.rename();                      // payload is "Untitled"
await store.action.rename({ payload: "My Title" }); // payload is "My Title"
```

> **Note:** Call-time payload always overrides the definition-level default. When neither is provided, `payload` is `undefined`.

## Execution Lifecycle

Every action call defers via `nextTick()` before executing. This ensures Vue's reactivity system has processed any pending state changes before the action runs.

- For API actions, the lifecycle is: **nextTick → concurrency check → resolve API → request → commit → done**.
- For handler actions: **nextTick → concurrency check → callback → done**.

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

> **Option priority:** Call-time options override definition-time values, which override module config, which override built-in defaults. For example, `headers` passed at call time are merged on top of definition headers and config headers via `defu`.

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

## Action Properties

Every action has built-in reactive metadata:

```typescript
store.action.fetch.loading; // ComputedRef<boolean>
store.action.fetch.status; // Readonly<Ref<ActionStatus>>
store.action.fetch.error; // Readonly<Ref<Error | null>>
store.action.fetch.reset(); // Reset to idle
```

> **Note:** `status` and `error` persist after execution. Call `reset()` to clear them back to their initial values (`IDLE`, `null`).

### Template Usage

```vue
<template>
    <div v-if="action.list.loading.value">Loading...</div>
    <div v-else-if="action.list.error.value">{{ action.list.error.value.message }}</div>
    <ul v-else>
        <li v-for="user in view.users.value" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Alias Mapping

When a shape defines field aliases via `.meta({ alias })`, key remapping is applied automatically during action execution — no transformers needed.

```typescript
const contactShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    first_name: factory.string().meta({ alias: "first-name" }),
    last_name: factory.string().meta({ alias: "last-name" }),
    email: factory.email(),
}));
```

### How it works

For actions with a `commit` config pointing to a model that uses an aliased shape:

- **Outbound:** Request body keys are remapped from shape keys to alias keys before sending. `{ first_name: "John" }` becomes `{ "first-name": "John" }`.
- **Inbound:** Response keys are remapped from alias keys to shape keys before committing to the store. `{ "first-name": "John" }` becomes `{ first_name: "John" }`.

### Ordering with transformers

Alias remapping respects the transformer pipeline:

- **Outbound:** `resolveBody()` → alias remap → `transformer.request`
- **Inbound:** `$fetch` → `transformer.response` → alias remap → commit

This means user transformers see alias keys outbound and original API keys inbound, while the store always uses shape keys.

### When aliases are skipped

- Actions without a `commit` config (no model to resolve aliases from)
- Models whose shape has no aliases defined
- Non-object body types (`FormData`, `Blob`, etc.)

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

## Next Steps

- [Concurrency](../advanced/concurrency.md) - Control concurrent action execution
- [Cancellation](../advanced/cancellation.md) - Cancel in-flight requests
