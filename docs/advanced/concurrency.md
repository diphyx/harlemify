# Concurrency

Control what happens when an action is called while it's already pending.

## Concurrency Strategies

| Strategy                  | Behavior                                    |
| ------------------------- | ------------------------------------------- |
| `ActionConcurrent.BLOCK`  | Throw `ActionConcurrentError` (default)     |
| `ActionConcurrent.SKIP`   | Return the existing in-flight promise       |
| `ActionConcurrent.CANCEL` | Abort the previous request, start a new one |
| `ActionConcurrent.ALLOW`  | Execute both independently                  |

## Setting Concurrency

### At Definition Time

Set a default concurrency strategy in the action's API request:

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

### At Call Time

Override the concurrency strategy per call:

```typescript
await store.action.search({
    query: { q: "john" },
    concurrent: ActionConcurrent.CANCEL,
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

Priority order: call-time > definition > module config.

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
// Both calls get the same result
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
import { ActionConcurrent } from "@diphyx/harlemify";

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
