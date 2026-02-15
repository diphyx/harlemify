# Cancellation

Cancel in-flight requests using `AbortSignal`.

## Basic Usage

```typescript
const controller = new AbortController();

// Start request
const promise = store.action.list({ signal: controller.signal });

// Cancel later
controller.abort();

// Handle cancellation
try {
    await promise;
} catch (error) {
    if (error.name === "AbortError") {
        console.log("Request was cancelled");
    }
}
```

## Use Cases

### Cancel on Component Unmount

```vue
<script setup lang="ts">
const { action } = userStore;
const controller = new AbortController();

action.list({ signal: controller.signal });

onUnmounted(() => {
    controller.abort();
});
</script>
```

### Cancel Previous Request

Cancel a previous request when starting a new one:

```typescript
let currentController: AbortController | null = null;

async function search(query: string) {
    if (currentController) {
        currentController.abort();
    }

    currentController = new AbortController();

    try {
        await store.action.search({
            query: { q: query },
            signal: currentController.signal,
        });
    } catch (error) {
        if (error.name !== "AbortError") {
            throw error;
        }
    }
}
```

### Debounced Search with Cancellation

```vue
<script setup lang="ts">
const { view, action } = userStore;

const query = ref("");
let controller: AbortController | null = null;
let timeout: ReturnType<typeof setTimeout>;

watch(query, (value) => {
    clearTimeout(timeout);

    if (controller) {
        controller.abort();
    }

    timeout = setTimeout(async () => {
        controller = new AbortController();

        try {
            await action.search({
                query: { q: value },
                signal: controller.signal,
            });
        } catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        }
    }, 300);
});
</script>

<template>
    <input v-model="query" placeholder="Search users..." />
    <ul>
        <li v-for="user in view.users.value" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

### Using Concurrency Cancel Instead

For simpler cancellation, use `ActionConcurrent.CANCEL` which handles abort automatically:

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
// Previous calls are automatically cancelled
await store.action.search({ query: { q: "john" } });
```

See [Concurrency](concurrency.md) for more details.

### Custom Timeout

Implement a custom timeout with AbortController:

```typescript
async function fetchWithTimeout(timeout: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        return await store.action.list({ signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

await fetchWithTimeout(5000);
```

## Next Steps

- [Concurrency](concurrency.md) — Automatic concurrency strategies
- [Isolated Status](isolated-status.md) — Independent status tracking per context
