# useStoreCompose

Wraps a store compose function with reactive `execute` and `active` tracking.

## Basic Usage

```typescript
const { execute, active } = useStoreCompose(dashboardStore, "loadAll");
```

```vue
<template>
    <button @click="execute()" :disabled="active.value">
        {{ active.value ? "Loading..." : "Load All" }}
    </button>
</template>
```

## Typed Arguments

Arguments are inferred from the compose function definition:

```typescript
// compose defines: quickAdd: async (name: string, email: string) => { ... }
const quickAdd = useStoreCompose(store, "quickAdd");

await quickAdd.execute("John", "john@example.com"); // OK — typed args
await quickAdd.execute(); // Type error: expected 2 arguments
await quickAdd.execute("John", 123); // Type error: string expected
```

## Component Example

```vue
<script setup lang="ts">
const loadAll = useStoreCompose(dashboardStore, "loadAll");
const resetAll = useStoreCompose(dashboardStore, "resetAll");
const quickAdd = useStoreCompose(dashboardStore, "quickAdd");

const name = ref("");
const email = ref("");

onMounted(() => loadAll.execute());

async function handleAdd() {
    if (!name.value || !email.value) return;
    await quickAdd.execute(name.value, email.value);
    name.value = "";
    email.value = "";
}
</script>

<template>
    <div>
        <button @click="loadAll.execute()" :disabled="loadAll.active.value">
            {{ loadAll.active.value ? "Loading..." : "Load All" }}
        </button>
        <button @click="resetAll.execute()">Reset</button>

        <form @submit.prevent="handleAdd">
            <input v-model="name" placeholder="Name" />
            <input v-model="email" placeholder="Email" />
            <button type="submit" :disabled="quickAdd.active.value">Add</button>
        </form>
    </div>
</template>
```

## Direct Store Access

You can also call compose functions directly without the composable:

```typescript
await store.compose.loadAll();
store.compose.resetAll();
store.compose.selectUser(user);
```

The composable provides a consistent `{ execute, active }` interface, similar to `useStoreAction`.

## Return Type

```typescript
type UseStoreCompose<A extends any[] = any[]> = {
    execute: (...args: A) => Promise<void>;
    active: Readonly<Ref<boolean>>;
};
```

## Next Steps

- [Compose](../core-concepts/compose.md) — Core compose concept
- [useStoreAction](use-store-action.md) — Action composable with status tracking
