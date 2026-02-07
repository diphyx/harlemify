# Action

Actions define async operations that combine API calls, data processing, and state mutations. The action factory provides three entry points: `api`, `handle`, and `commit`.

## Action Factory

The action factory is destructured from the first parameter of the `action` function:

```typescript
action({ api, handle, commit }) {
    return {
        fetch: api
            .get({
                url: "/users",
            })
            .commit("list", ActionManyMode.SET),
        sort: handle(async ({ view, commit }) => { ... }),
        clear: commit("list", ActionManyMode.RESET),
    };
},
```

## Chain Patterns

Actions follow a chainable builder pattern. There are three entry points, each producing a different chain:

### API Chain

Start with `api` to make an HTTP request. The result can optionally be handled and/or committed:

```
api.get(...)                          → auto commit
api.get(...).commit(...)              → auto commit to model
api.get(...).handle(...)              → custom processing
api.get(...).handle(...).commit(...)  → process then commit
```

### Handle Chain

Start with `handle` for logic without an API call:

```
handle(...)                → custom logic only
handle(...).commit(...)    → custom logic then commit
```

### Commit Chain

Start with `commit` for direct state mutations:

```
commit(...)                → direct mutation
```

## API Methods

The `api` factory supports all HTTP methods:

```typescript
api.get({ url: "/users" })           // GET
api.head({ url: "/users" })          // HEAD
api.post({ url: "/users" })          // POST
api.put({ url: "/users/1" })         // PUT
api.patch({ url: "/users/1" })       // PATCH
api.delete({ url: "/users/1" })      // DELETE
```

You can also use the generic form with an explicit method:

```typescript
api({
    method: ActionApiMethod.GET,
    url: "/users",
})
```

## API Definition

Each API call accepts a definition object:

```typescript
api.get({
    url: "/users",                              // Static URL
    // or
    url(view) {                                 // Dynamic URL from view
        return `/users/${view.user.value?.id}`;
    },
    headers: { "X-Custom": "value" },           // Static headers
    // or
    headers(view) { ... },                      // Dynamic headers
    query: { page: 1 },                         // Static query params
    // or
    query(view) { ... },                        // Dynamic query params
    body: { name: "John" },                     // Static body (non-GET only)
    // or
    body(view) { ... },                         // Dynamic body
    timeout: 5000,                              // Request timeout
    concurrent: ActionConcurrent.CANCEL,        // Concurrency strategy
})
```

## Handle Callback

The handle callback receives a context with access to `api`, `view`, and `commit`:

```typescript
// With API
api
    .get({
        url(view) {
            return `/users/${view.user.value?.id}`;
        },
    })
    .handle(async ({ api, view, commit }) => {
        const user = await api<User>();         // Call the API
        commit("current", ActionOneMode.SET, user);
        commit("list", ActionManyMode.PATCH, user);
        return user;
    })

// Without API
handle(async ({ view, commit }) => {
    const sorted = [...view.users.value].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    commit("list", ActionManyMode.SET, sorted);
    return sorted;
})
```

**Context properties:**
| Property | Description |
|----------|-------------|
| `api<T>()` | Execute the API request (only available when chained from `api`) |
| `view` | Readonly access to all store views |
| `commit(model, mode, value?, options?)` | Commit mutations to any model |

## Commit

The commit method stores the API response (or handle result) into a model:

```typescript
// One-model commits
.commit("current", ActionOneMode.SET)
.commit("current", ActionOneMode.PATCH)
.commit("current", ActionOneMode.RESET)

// Many-model commits
.commit("list", ActionManyMode.SET)
.commit("list", ActionManyMode.ADD)
.commit("list", ActionManyMode.PATCH)
.commit("list", ActionManyMode.REMOVE)
.commit("list", ActionManyMode.RESET)
```

### Commit with Options

```typescript
// Add to beginning of list
.commit("list", ActionManyMode.ADD, undefined, { prepend: true })

// Add only unique items
.commit("list", ActionManyMode.ADD, undefined, { unique: true })

// Match by a different field
.commit("list", ActionManyMode.PATCH, undefined, { by: "email" })

// Deep merge
.commit("current", ActionOneMode.PATCH, undefined, { deep: true })
```

## Calling Actions

Actions are called via `store.action`:

```typescript
// Basic call
await store.action.fetch();

// With payload options
await store.action.fetch({
    headers: { Authorization: "Bearer token" },
    query: { page: 1, limit: 10 },
    body: { name: "John" },
    timeout: 5000,
    signal: abortController.signal,
    concurrent: ActionConcurrent.CANCEL,
});
```

### Call-time Payload Options

| Option | Type | Description |
|--------|------|-------------|
| `headers` | `Record<string, string>` or `(view) => ...` | Additional headers (merged with definition) |
| `query` | `Record<string, unknown>` or `(view) => ...` | Additional query params (merged with definition) |
| `body` | `unknown` or `(view) => ...` | Override request body |
| `timeout` | `number` | Override timeout |
| `signal` | `AbortSignal` | For request cancellation |
| `concurrent` | `ActionConcurrent` | Override concurrency strategy |
| `transformer` | `(response) => R` | Transform the response |
| `bind` | `{ status?, error? }` | Bind to isolated status/error refs |
| `commit` | `{ mode? }` | Override the commit mode |

### Response Transformer

Transform the action's return value at call-time:

```typescript
const userName = await store.action.fetch({
    transformer: (user) => user?.name,
});
```

## Action Properties

Every action has built-in reactive properties:

```typescript
store.action.fetch.loading    // ComputedRef<boolean>
store.action.fetch.status     // Readonly<Ref<ActionStatus>>
store.action.fetch.error      // Readonly<Ref<ActionError | null>>
store.action.fetch.data       // DeepReadonly<T> | null
store.action.fetch.reset()    // Reset status, error, and data
```

### Status Values

| Status | Description |
|--------|-------------|
| `ActionStatus.IDLE` | No request made yet |
| `ActionStatus.PENDING` | Request in progress |
| `ActionStatus.SUCCESS` | Last request succeeded |
| `ActionStatus.ERROR` | Last request failed |

### Template Usage

```vue
<template>
    <div v-if="action.list.loading.value">Loading...</div>
    <div v-else-if="action.list.error.value">
        Error: {{ action.list.error.value.message }}
    </div>
    <ul v-else>
        <li v-for="user in view.users.value" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

## Error Types

Actions throw typed errors depending on where the failure occurred:

| Error | Description |
|-------|-------------|
| `ActionApiError` | HTTP request failed (has `status`, `statusText`, `data`) |
| `ActionHandleError` | Handle callback threw an error |
| `ActionCommitError` | Commit operation failed |
| `ActionConcurrentError` | Action blocked by concurrency guard |

```typescript
try {
    await store.action.fetch();
} catch (error) {
    if (error.name === "ActionApiError") {
        console.error("API error:", error.status, error.data);
    } else if (error.name === "ActionConcurrentError") {
        console.warn("Action already pending");
    }
}
```

## Next Steps

- [Store Patterns](../store-patterns/README.md) - See complete store examples
- [Concurrency](../advanced/concurrency.md) - Control concurrent action execution
- [Cancellation](../advanced/cancellation.md) - Cancel in-flight requests
