# Your First Store

This guide walks you through creating a complete user store with CRUD operations.

## Step 1: Define a Shape

Create a Zod-powered shape with the `shape` helper:

```typescript
// stores/user.ts
import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "@diphyx/harlemify";

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

**Shape Meta:**

- `identifier: true` - Marks the primary key field used for matching items in array mutations (`patch`, `remove`)

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

Actions combine API calls, data processing, and state mutations using a chainable builder:

```typescript
action({ api, commit }) {
    return {
        get: api
            .get({
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            })
            .commit("current", ActionOneMode.SET),
        list: api
            .get({
                url: "/users",
            })
            .commit("list", ActionManyMode.SET),
        create: api
            .post({
                url: "/users",
            })
            .commit("list", ActionManyMode.ADD),
        update: api
            .patch({
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            })
            .commit("list", ActionManyMode.PATCH),
        delete: api
            .delete({
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            })
            .commit("list", ActionManyMode.REMOVE),
        clear: commit("list", ActionManyMode.RESET),
    };
},
```

## Step 5: Create the Store

```typescript
export const userStore = createStore({
    name: "users",
    model({ one, many }) { ... },
    view({ from, merge }) { ... },
    action({ api, commit }) { ... },
});
```

## Step 6: Use in Component

```vue
<script setup lang="ts">
import { userStore } from "~/stores/user";

const { model, view, action } = userStore;

// Load users on mount
await action.list();

// Create a new user
async function handleCreate() {
    await action.create({
        body: { name: "John Doe", email: "john@example.com" },
    });
}

// Select a user
function selectUser(user: User) {
    model("current", ActionOneMode.SET, user);
}

// Delete selected user
async function handleDelete() {
    await action.delete();
}
</script>

<template>
    <div>
        <button @click="handleCreate">Add User</button>

        <div v-if="action.list.loading.value">Loading...</div>

        <ul v-else>
            <li v-for="u in view.users.value" :key="u.id">
                {{ u.name }} - {{ u.email }}
                <button @click="selectUser(u)">Select</button>
                <button @click="handleDelete">Delete</button>
            </li>
        </ul>

        <p>Total: {{ view.count.value }}</p>
    </div>
</template>
```

## Complete File

```typescript
// stores/user.ts
import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "@diphyx/harlemify";

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

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
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
    action({ api, commit }) {
        return {
            get: api
                .get({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.SET),
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
            create: api
                .post({
                    url: "/users",
                })
                .commit("list", ActionManyMode.ADD),
            update: api
                .patch({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.PATCH),
            delete: api
                .delete({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.REMOVE),
            clear: commit("list", ActionManyMode.RESET),
        };
    },
});
```

## Next Steps

- [Core Concepts](../core-concepts/README.md) - Understand how harlemify works
- [Store Patterns](../store-patterns/README.md) - Learn collection, singleton, and nested patterns
