# useStoreAction

Wraps a store action with reactive `status`, `loading`, `error`, and `reset`. Supports isolated mode for independent status tracking.

## Basic Usage

```typescript
import { useStoreAction } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const { execute, status, loading, error, reset } = useStoreAction(userStore, "list");
```

```vue
<template>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error.message }}</div>
    <div v-else>
        <p>Status: {{ status }}</p>
        <button @click="execute()">Reload</button>
        <button @click="reset()">Reset</button>
    </div>
</template>
```

## Isolated Mode

By default, the composable shares status/error with the store's global action refs. Use `isolated: true` to create independent tracking:

```typescript
const globalAction = useStoreAction(userStore, "list");
const isolatedAction = useStoreAction(userStore, "list", { isolated: true });

await isolatedAction.execute();

isolatedAction.status; // "success"
globalAction.status; // unchanged
userStore.action.list.status.value; // unchanged
```

This is useful when the same action is triggered from multiple UI contexts and each needs its own loading/error state.

### Multiple Isolated Instances

```vue
<script setup lang="ts">
import { useStoreAction } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const headerAction = useStoreAction(userStore, "list", { isolated: true });
const sidebarAction = useStoreAction(userStore, "list", { isolated: true });
</script>

<template>
    <header>
        <button @click="headerAction.execute()" :disabled="headerAction.loading.value">
            {{ headerAction.loading.value ? "Refreshing..." : "Refresh" }}
        </button>
    </header>
    <aside>
        <button @click="sidebarAction.execute()" :disabled="sidebarAction.loading.value">
            {{ sidebarAction.loading.value ? "Loading..." : "Reload" }}
        </button>
    </aside>
</template>
```

### Isolated Error Tracking

```vue
<script setup lang="ts">
import { useStoreAction } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const createAction = useStoreAction(userStore, "create", { isolated: true });

async function handleCreate(userData: unknown) {
    try {
        await createAction.execute({ body: userData });
    } catch {
        // Error is captured in createAction.error
    }
}
</script>

<template>
    <form @submit.prevent="handleCreate(formData)">
        <!-- form fields -->
        <p v-if="createAction.error.value">{{ createAction.error.value.message }}</p>
        <button type="submit">Create</button>
    </form>
</template>
```

> For manual control over isolated refs without this composable, see [Isolated Status](../advanced/isolated-status.md).

## Options

| Option     | Type      | Default | Description                          |
| ---------- | --------- | ------- | ------------------------------------ |
| `isolated` | `boolean` | `false` | Create independent status/error refs |

## Return Type

```typescript
type UseStoreAction<T> = {
    execute: (options?: ActionCallOptions) => Promise<T>;
    status: Readonly<Ref<ActionStatus>>;
    loading: ComputedRef<boolean>;
    error: Readonly<Ref<Error | null>>;
    reset: () => void;
};
```

## Next Steps

- [useStoreModel](use-store-model.md) - Reactive model mutations
- [useStoreView](use-store-view.md) - Reactive view data and tracking
