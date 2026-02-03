# Request Cancellation

Cancel in-flight requests using AbortController.

## Basic Usage

```typescript
const controller = new AbortController();

// Start request
const promise = listUser({ signal: controller.signal });

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
import { onUnmounted } from "vue";

const { listUser } = useStoreAlias(userStore);
const controller = new AbortController();

// Start loading
listUser({ signal: controller.signal });

// Cancel if component unmounts before completion
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
    // Cancel previous request
    if (currentController) {
        currentController.abort();
    }

    // Create new controller
    currentController = new AbortController();

    try {
        await searchUser(
            { query },
            { signal: currentController.signal }
        );
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
import { ref, watch } from "vue";

const { searchUser, users } = useStoreAlias(userStore);

const query = ref("");
let controller: AbortController | null = null;
let timeout: NodeJS.Timeout;

watch(query, (value) => {
    // Clear previous timeout
    clearTimeout(timeout);

    // Cancel previous request
    if (controller) {
        controller.abort();
    }

    // Debounce
    timeout = setTimeout(async () => {
        controller = new AbortController();

        try {
            await searchUser(
                { query: value },
                { signal: controller.signal }
            );
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
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

### Timeout

Implement custom timeout with AbortController:

```typescript
async function fetchWithTimeout<T>(
    action: (options: { signal: AbortSignal }) => Promise<T>,
    timeout: number
): Promise<T> {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);

    try {
        return await action({ signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

// Usage
await fetchWithTimeout(
    (options) => listUser(options),
    5000 // 5 second timeout
);
```

## Error Handling

```typescript
import { ApiRequestError } from "@diphyx/harlemify";

try {
    await listUser({ signal: controller.signal });
} catch (error) {
    if (error.name === "AbortError") {
        // Request was cancelled - usually not an error to display
        return;
    }

    if (error instanceof ApiRequestError) {
        // Network error
        console.error("Network error:", error.message);
    }

    throw error;
}
```
