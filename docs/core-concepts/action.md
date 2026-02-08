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

Custom logic with direct access to model and view:

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

See [ActionCallOptions](../api/types.md#actioncalloptions) for all options.

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
store.action.fetch.data; // DeepReadonly<T> | null
store.action.fetch.reset(); // Reset to idle
```

> **Note:** `data`, `status`, and `error` persist after execution. Call `reset()` to clear them back to their initial values (`null`, `IDLE`, `null`).

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
- [Types](../api/types.md) - Full type reference
