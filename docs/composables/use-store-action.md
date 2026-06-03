# useStoreAction

Wraps a store action with reactive `status`, `loading`, `error`, and `reset`. Supports isolated mode for independent status tracking, including a read-only snapshot of the in-flight call.

> **Related:** [Action](../core-concepts/action.md) — define the action this composable wraps.

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

### In-Flight Call Tracking

In isolated mode, the composable also exposes a **read-only snapshot of the in-flight call** — `params` and `query` for api actions, `payload` for handler actions. Use it to match the shared loading state to a specific target, such as a single row in a list.

```vue
<script setup lang="ts">
const { loading, params, execute } = useStoreAction(userStore, "remove", { isolated: true });

function remove(user: User) {
    return execute({ params: { id: user.id } });
}
</script>

<template>
    <!-- only the row whose in-flight call matches reflects loading -->
    <button v-for="user in users" :key="user.id" :disabled="loading && params?.id === user.id" @click="remove(user)">
        {{ loading && params?.id === user.id ? "Removing..." : "Remove" }}
    </button>
</template>
```

For **handler actions** the snapshot is `payload` instead of `params`/`query`, since that is how a handler is addressed:

```vue
<script setup lang="ts">
const { loading, payload, execute } = useStoreAction(todoStore, "toggle", { isolated: true });

function toggle(todo: Todo) {
    return execute({ payload: todo });
}
</script>

<template>
    <button v-for="todo in todos" :key="todo.id" :disabled="loading && payload?.id === todo.id" @click="toggle(todo)">
        {{ loading && payload?.id === todo.id ? "Saving..." : "Toggle" }}
    </button>
</template>
```

The snapshot is captured at call time (a deep-cloned, independent copy of the object you passed), reflects the running call, and is cleared by `reset()`. It is guarded so a [concurrency](../advanced/concurrency.md)-blocked call cannot overwrite the one that is actually running — which assumes one call in flight at a time (the default `BLOCK` strategy). These fields are present **only** with `{ isolated: true }`, and which fields appear depends on the action kind — `params`/`query` for api actions, `payload` for handlers.

## Options

| Option     | Type      | Default | Description                                                                                     |
| ---------- | --------- | ------- | ----------------------------------------------------------------------------------------------- |
| `isolated` | `boolean` | `false` | Independent `status`/`error` refs, plus an in-flight call snapshot (`params`/`query`/`payload`) |

## Return Type

```typescript
type UseStoreAction<T> = {
    execute: (options?: ActionCallOptions) => Promise<T>;
    status: Readonly<Ref<ActionStatus>>;
    loading: ComputedRef<boolean>;
    error: Readonly<Ref<Error | null>>;
    reset: () => void;
};

// with { isolated: true }, the return additionally includes (IsolatedActionCall):
//   api action     → params: Readonly<Ref<Record<string, string | number> | undefined>>
//                    query:  Readonly<Ref<Record<string, unknown> | undefined>>
//   handler action → payload: Readonly<Ref<P | undefined>>
```

## Next Steps

- [useStoreModel](use-store-model.md) — Reactive model mutations
- [useStoreView](use-store-view.md) — Reactive view data and tracking
