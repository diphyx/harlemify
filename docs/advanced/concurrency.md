# Concurrency

Control what happens when an action is called while it's already pending.

## Strategies

| Strategy                  | Behavior                                    |
| ------------------------- | ------------------------------------------- |
| `ActionConcurrent.BLOCK`  | Throw `ActionConcurrentError` (default)     |
| `ActionConcurrent.SKIP`   | Return the existing in-flight promise       |
| `ActionConcurrent.CANCEL` | Abort the previous request, start a new one |
| `ActionConcurrent.ALLOW`  | Execute both independently                  |

## Setting Concurrency

### At Definition Time

**API actions** — via the request config:

```typescript
action({ api }) {
    return {
        search: api.get(
            {
                url: "/users",
                concurrent: ActionConcurrent.CANCEL,
            },
            { model: "list", mode: ModelManyMode.SET },
        ),
    };
},
```

**Handler actions** — via the options argument:

```typescript
action({ handler }) {
    return {
        sync: handler(
            async ({ model, payload }) => {
                // ...
            },
            { concurrent: ActionConcurrent.SKIP },
        ),
    };
},
```

### At Call Time

Override the strategy per call (works for both API and handler actions):

```typescript
await store.action.search({
    query: { q: "john" },
    concurrent: ActionConcurrent.CANCEL,
});

await store.action.sync({
    payload: data,
    concurrent: ActionConcurrent.ALLOW,
});
```

### At Module Level

Set a global default in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    harlemify: {
        action: {
            concurrent: ActionConcurrent.BLOCK,
        },
    },
});
```

Priority order: **call-time > definition > module config**.

## Use Cases

### Block (Default)

Prevent duplicate submissions. Good for form submissions and create operations:

```typescript
action({ api }) {
    return {
        create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
    };
},
```

```typescript
try {
    await store.action.create();
} catch (error) {
    if (error.name === "ActionConcurrentError") {
        console.warn("Already submitting");
    }
}
```

### Skip

Return the existing promise. Good for data fetching where duplicate calls aren't harmful:

```typescript
const promise1 = store.action.list({ concurrent: ActionConcurrent.SKIP });
const promise2 = store.action.list({ concurrent: ActionConcurrent.SKIP });
// promise1 === promise2
```

### Cancel

Abort the previous request and start fresh. Good for search/autocomplete:

```typescript
action({ api }) {
    return {
        search: api.get(
            {
                url: "/users",
                concurrent: ActionConcurrent.CANCEL,
            },
            { model: "list", mode: ModelManyMode.SET },
        ),
    };
},
```

```typescript
// User types fast
await store.action.search({ query: { q: "j" } }); // Cancelled
await store.action.search({ query: { q: "jo" } }); // Cancelled
await store.action.search({ query: { q: "john" } }); // Completes
```

### Allow

Run both independently. Good for fire-and-forget operations:

```typescript
await store.action.log({ concurrent: ActionConcurrent.ALLOW });
await store.action.log({ concurrent: ActionConcurrent.ALLOW });
// Both execute independently
```

## Error Handling

```typescript
try {
    await store.action.create();
} catch (error) {
    if (error.name === "ActionConcurrentError") {
        // Action was blocked because it's already pending
        return;
    }
    throw error;
}
```

## Template Usage

Use `action.loading` to disable buttons during pending state:

```vue
<template>
    <button @click="store.action.create()" :disabled="store.action.create.loading.value">
        {{ store.action.create.loading.value ? "Creating..." : "Create" }}
    </button>
</template>
```

## Next Steps

- [Cancellation](cancellation.md) — Manual cancellation with AbortSignal
- [Isolated Status](isolated-status.md) — Independent status tracking per context
