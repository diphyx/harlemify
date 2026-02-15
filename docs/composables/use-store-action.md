# useStoreAction

Wraps a store action with reactive `status`, `loading`, `error`, and `reset`. Supports isolated mode for independent status tracking.

## Basic Usage

```typescript
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

## Handler Payload

Pass payload to [handler actions](../core-concepts/action.md#payload) via `execute()`:

```typescript
const toggleAction = useStoreAction(todoStore, "toggle");
await toggleAction.execute({ payload: todo });

const renameAction = useStoreAction(todoStore, "rename");
await renameAction.execute(); // uses definition default
await renameAction.execute({ payload: "Custom" }); // overrides default
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
const headerAction = useStoreAction(userStore, "list", { isolated: true });
const sidebarAction = useStoreAction(userStore, "list", { isolated: true });
</script>

<template>
    <header>
        <button @click="headerAction.execute()" :disabled="headerAction.loading">
            {{ headerAction.loading ? "Refreshing..." : "Refresh" }}
        </button>
    </header>
    <aside>
        <button @click="sidebarAction.execute()" :disabled="sidebarAction.loading">
            {{ sidebarAction.loading ? "Loading..." : "Reload" }}
        </button>
    </aside>
</template>
```

### Isolated Error Tracking

Errors are also tracked independently per isolated instance:

```typescript
const createAction = useStoreAction(userStore, "create", { isolated: true });

await createAction.execute({ body: userData });

createAction.error.value; // Error | null — only reflects this instance
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

- [useStoreModel](use-store-model.md) — Reactive model mutations
- [useStoreView](use-store-view.md) — Reactive view data and tracking
