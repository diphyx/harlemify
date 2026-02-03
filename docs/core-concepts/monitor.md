# Monitor

The monitor tracks request status for each action, enabling loading states and error handling.

## Status States

Each action has four possible states:

| Status | Description |
|--------|-------------|
| `idle` | No request made yet |
| `pending` | Request in progress |
| `success` | Request completed successfully |
| `failed` | Request failed |

## Accessing Monitor

Monitor properties are functions that return the current value:

```typescript
const { userMonitor } = useStoreAlias(userStore);

// Access by action name - all return current values
userMonitor.list.current()   // EndpointStatus
userMonitor.list.pending()   // boolean
userMonitor.list.success()   // boolean
userMonitor.list.failed()    // boolean
userMonitor.list.idle()      // boolean
```

## Template Usage

Call the monitor functions directly in templates:

```vue
<template>
    <!-- Loading state -->
    <div v-if="userMonitor.list.pending()">
        Loading users...
    </div>

    <!-- Error state -->
    <div v-else-if="userMonitor.list.failed()">
        Failed to load users
    </div>

    <!-- Success state -->
    <ul v-else>
        <li v-for="user in users" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

## Script Usage

Call the functions to get current status:

```typescript
const { userMonitor, listUser } = useStoreAlias(userStore);

async function loadUsers() {
    await listUser();

    if (userMonitor.list.success()) {
        console.log("Users loaded successfully");
    }

    if (userMonitor.list.failed()) {
        console.error("Failed to load users");
    }
}
```

## Multiple Actions

Track different actions independently:

```vue
<template>
    <!-- List loading -->
    <div v-if="userMonitor.list.pending()">Loading...</div>

    <!-- Create in progress -->
    <button :disabled="userMonitor.create.pending()">
        {{ userMonitor.create.pending() ? "Creating..." : "Create User" }}
    </button>

    <!-- Delete feedback -->
    <span v-if="userMonitor.delete.success()">Deleted!</span>
    <span v-if="userMonitor.delete.failed()">Delete failed</span>
</template>
```

## Available for All Actions

Every action in your store config gets a monitor entry:

```typescript
const userActions = {
    get: { ... },
    list: { ... },
    create: { ... },
    update: { ... },
    delete: { ... },
    search: { ... },    // Custom action
    export: { ... },    // Custom action
};

// All have monitors - call as functions
userMonitor.get.pending()
userMonitor.list.pending()
userMonitor.create.pending()
userMonitor.update.pending()
userMonitor.delete.pending()
userMonitor.search.pending()
userMonitor.export.pending()
```

## Combined Loading State

Check multiple actions at once:

```typescript
const isLoading = computed(() =>
    userMonitor.list.pending() ||
    userMonitor.create.pending() ||
    userMonitor.update.pending()
);
```

## Display Current Status

Use `current()` to get the status enum value:

```vue
<template>
    <div class="status-display">
        <span :data-status="userMonitor.list.current()">
            {{ userMonitor.list.current() }}
        </span>
    </div>
</template>
```

## Next Steps

- [Store Patterns](../store-patterns/README.md) - See complete store examples
- [Advanced](../advanced/README.md) - Error handling, validation, and more
