# Your First Store

This guide walks you through creating a complete user store with CRUD operations.

## Step 1: Define a Shape

Create a Zod-powered shape with the `shape` helper:

```typescript
// stores/user.ts
import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});

export type User = ShapeInfer<typeof userShape>;
```

The `identifier: true` meta marks the primary key field used for matching items in array mutations (`patch`, `remove`). See [Shape](../core-concepts/shape.md) for details.

## Step 2: Define Models

Models define the state containers. Use `one` for single items and `many` for collections:

```typescript
model({ one, many }) {
    return {
        current: one(userShape),   // User | null
        list: many(userShape),     // User[]
    };
},
```

## Step 3: Define Views

Views are computed properties derived from model state:

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        users: from("list"),
        count: from("list", (model) => {
            return model.length;
        }),
        summary: merge(["current", "list"], (current, list) => {
            return {
                selected: current?.name ?? null,
                total: list.length,
            };
        }),
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
                    return `/users/${view.user.value?.id}`;
                },
            },
            { model: "current", mode: ModelOneMode.SET },
        ),
        list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
        update: api.patch(
            {
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            },
            { model: "list", mode: ModelManyMode.PATCH },
        ),
        delete: api.delete(
            {
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            },
            { model: "list", mode: ModelManyMode.REMOVE },
        ),
    };
},
```

## Step 5: Create the Store

Combine all layers into `createStore`:

```typescript
export const userStore = createStore({
    name: "users",
    model({ one, many }) { ... },
    view({ from, merge }) { ... },
    action({ api }) { ... },
});
```

## Step 6: Use in Component

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
</script>

<template>
    <div>
        <button @click="handleCreate">Add User</button>

        <div v-if="loading">Loading...</div>

        <ul v-else>
            <li v-for="u in users.value" :key="u.id">
                {{ u.name }} - {{ u.email }}
                <button @click="selectUser(u)">Select</button>
                <button @click="deleteUser()">Delete</button>
            </li>
        </ul>

        <p>Total: {{ count.value }}</p>
    </div>
</template>
```

## Next Steps

- [Core Concepts](../core-concepts/README.md) - Understand how harlemify works
- [Composables](../composables/README.md) - useStoreAction, useStoreModel, useStoreView
