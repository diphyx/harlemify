# Compose

Compose defines orchestration functions that combine actions, models, and views. The compose layer is **optional** and runs after all other layers are fully resolved, so it receives fully typed access with autocomplete.

```typescript
compose({ model, view, action }) {
    return {
        loadAll: async () => {
            await action.fetchUsers();
            await action.fetchTodos();
        },
        resetAll: () => {
            model.users.reset();
            model.todos.reset();
        },
    };
},
```

## Compose vs Handler

| Use `compose` when...                      | Use `handler` when...                             |
| ------------------------------------------ | ------------------------------------------------- |
| Calling multiple actions in sequence       | Running custom async logic for a single operation |
| Orchestrating actions with model mutations | Making a non-JSON HTTP request                    |
| Building workflows from existing actions   | Returning data from the operation                 |
| Need access to fully typed `action` object | Need typed `payload` from call site               |

> Handlers cannot call sibling actions because the `action` object is not yet resolved when handler callbacks are defined. Compose solves this by running after `action` is fully built.

## Context

The factory receives `{ model, view, action }` and returns a record of plain functions:

```typescript
compose({ model, view, action }) {
    // model  — StoreModel: typed access to all model mutations
    // view   — StoreView: typed access to all view computed values
    // action — StoreAction: typed access to all actions (fully resolved)
}
```

## Typed Arguments

Compose functions support typed arguments, fully type-checked at the call site:

```typescript
compose({ model, action }) {
    return {
        selectUser: (user: User) => {
            model.current.set(user);
        },
        quickAdd: async (name: string, email: string) => {
            await action.createUser({ body: { name, email } });
        },
    };
},
```

```typescript
store.compose.selectUser(user); // OK
store.compose.selectUser(); // Type error: expected 1 argument
store.compose.quickAdd("John", 123); // Type error: string expected
```

## Calling Compose Functions

```typescript
await store.compose.loadAll();
store.compose.resetAll();
store.compose.selectUser(user);
await store.compose.quickAdd("John", "john@example.com");
```

## Active State

Every compose function has a reactive `active` ref that is `true` while executing:

```typescript
store.compose.loadAll.active; // Readonly<Ref<boolean>>
```

```vue
<template>
    <button @click="store.compose.loadAll()" :disabled="store.compose.loadAll.active">
        {{ store.compose.loadAll.active ? "Loading..." : "Load All" }}
    </button>
</template>
```

## Error Handling

Compose functions do not track `error` or `status` — only `active`. Errors propagate to the caller and must be handled with `try/catch`:

```typescript
try {
    await store.compose.loadAll();
} catch (error) {
    console.error("Failed to load:", error);
}
```

> If a compose function calls an action that throws (e.g. `ActionApiError`), the error bubbles up through compose. The `active` ref is always reset to `false` after execution, regardless of success or failure.

## Examples

### Orchestrate Multiple Actions

```typescript
compose({ action }) {
    return {
        refresh: async () => {
            await action.fetchUsers();
            await action.fetchPosts();
            await action.fetchComments();
        },
    };
},
```

### Combine Actions with Model Mutations

```typescript
compose({ model, view }) {
    return {
        completeAll: () => {
            for (const todo of view.todos.value) {
                if (!todo.done) {
                    model.todos.patch({ ...todo, done: true });
                }
            }
        },
    };
},
```

## Next Steps

- [useStoreCompose](../composables/use-store-compose.md) — Composable for compose functions
- [Action](action.md) — API and handler actions
