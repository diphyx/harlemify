# Your First Store

This guide walks you through creating a complete user store with CRUD operations.

## Step 1: Define a Shape

Create a Zod-powered shape with the `shape` helper:

```typescript
// stores/user.ts
import { shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));

type User = ShapeInfer<typeof userShape>;
```

The `identifier: true` meta marks the primary key field used for matching items in array mutations (`patch`, `remove`). See [Shape](../core-concepts/shape.md) for details.

## Step 2: Define Models

Models are the state containers. Use `one` for single items and `many` for collections:

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // User
        list: many(userShape),     // User[]
    };
},
```

Optionally provide a [function default](../core-concepts/model.md#function-default) for custom initial and reset values.

## Step 3: Define Views

Views are computed properties derived from model state:

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        users: from("list"),
        count: from("list", (model) => model.length),
        summary: merge(["current", "list"], (current, list) => ({
            selected: current.name,
            total: list.length,
        })),
    };
},
```

## Step 4: Define Actions

Use `api` for HTTP requests with optional auto-commit:

```typescript
action({ api }) {
    return {
        get: api.get(
            {
                url(view) {
                    return `/users/${view.user.value.id}`;
                },
            },
            { model: "current", mode: ModelOneMode.SET },
        ),
        list: api.get(
            { url: "/users" },
            { model: "list", mode: ModelManyMode.SET },
        ),
        create: api.post(
            { url: "/users" },
            { model: "list", mode: ModelManyMode.ADD },
        ),
        update: api.patch(
            {
                url(view) {
                    return `/users/${view.user.value.id}`;
                },
            },
            { model: "list", mode: ModelManyMode.PATCH },
        ),
        delete: api.delete(
            {
                url(view) {
                    return `/users/${view.user.value.id}`;
                },
            },
            { model: "list", mode: ModelManyMode.REMOVE },
        ),
    };
},
```

## Step 5: Define Compose (Optional)

Compose orchestrates existing actions and model mutations. Use it when you need to combine multiple operations:

```typescript
compose({ model, action }) {
    return {
        loadAll: async () => {
            await action.list();
        },
        clearAll: () => {
            model.current.reset();
            model.list.reset();
        },
    };
},
```

## Step 6: Create the Store

Combine all layers into `createStore`:

```typescript
// stores/user.ts
export const userStore = createStore({
    name: "users",
    model({ one, many }) { ... },
    view({ from, merge }) { ... },
    action({ api }) { ... },
    compose({ model, action }) { ... }, // optional
    lazy: true, // optional — defer initialization until first access
});
```

## Step 7: Use in a Component

```vue
<script setup lang="ts">
import { userStore } from "~/stores/user";

const { execute: listUsers, loading } = useStoreAction(userStore, "list");
const { execute: createUser } = useStoreAction(userStore, "create");
const { execute: deleteUser } = useStoreAction(userStore, "delete");
const { set: selectUser } = useStoreModel(userStore, "current");
const { data: users } = useStoreView(userStore, "users");
const { data: count } = useStoreView(userStore, "count");

await listUsers();

async function handleCreate() {
    await createUser({ body: { name: "John Doe", email: "john@example.com" } });
}

async function handleDelete(user: User) {
    selectUser(user);
    await deleteUser();
}
</script>

<template>
    <div>
        <button @click="handleCreate">Add User</button>

        <div v-if="loading">Loading...</div>

        <ul v-else>
            <li v-for="u in users.value" :key="u.id">
                {{ u.name }} - {{ u.email }}
                <button @click="selectUser(u)">Select</button>
                <button @click="handleDelete(u)">Delete</button>
            </li>
        </ul>

        <p>Total: {{ count.value }}</p>
    </div>
</template>
```

## Next Steps

- [Core Concepts](../core-concepts/README.md) — Understand how each layer works
- [Composables](../composables/README.md) — useStoreAction, useStoreModel, useStoreView, useStoreCompose
