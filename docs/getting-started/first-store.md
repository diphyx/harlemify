# Your First Store

This guide walks you through creating a complete user store with CRUD operations.

## Step 1: Define Actions

Create an enum with all actions your store will support:

```typescript
// stores/user.ts
export enum UserAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}
```

## Step 2: Create Schema

Define a Zod schema with metadata:

```typescript
import { z } from "zod";

const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: [UserAction.CREATE, UserAction.UPDATE],
    }),
    email: z.string().meta({
        actions: [UserAction.CREATE],
    }),
    createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;
```

**Schema Meta:**
- `indicator: true` - Marks the primary key field
- `actions: [...]` - Fields included in request body for these actions

## Step 3: Define Actions Config

Map each action to an endpoint and memory target:

```typescript
const userActions = {
    [UserAction.GET]: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    [UserAction.LIST]: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    [UserAction.CREATE]: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    [UserAction.UPDATE]: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),
    },
    [UserAction.DELETE]: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),
    },
};
```

## Step 4: Create Store

```typescript
export const userStore = createStore("user", userSchema, userActions);
```

## Step 5: Use in Component

```vue
<script setup lang="ts">
import { userStore } from "~/stores/user";

const {
    user,           // Single user (unit)
    users,          // User list (units)
    getUser,        // Fetch single user
    listUser,       // Fetch user list
    createUser,     // Create new user
    updateUser,     // Update existing user
    deleteUser,     // Delete user
    userMemory,     // Direct state mutations
    userMonitor,    // Request status tracking
} = useStoreAlias(userStore);

// Load users on mount
await listUser();

// Create a new user
async function handleCreate() {
    await createUser({
        id: 0,
        name: "John Doe",
        email: "john@example.com",
    });
}

// Delete a user
async function handleDelete(id: number) {
    await deleteUser({ id });
}
</script>

<template>
    <div>
        <button @click="handleCreate">Add User</button>

        <div v-if="userMonitor.list.pending()">Loading...</div>

        <ul v-else>
            <li v-for="u in users" :key="u.id">
                {{ u.name }} - {{ u.email }}
                <button @click="handleDelete(u.id)">Delete</button>
            </li>
        </ul>
    </div>
</template>
```

## Complete File

```typescript
// stores/user.ts
import { z } from "zod";

export enum UserAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: [UserAction.CREATE, UserAction.UPDATE],
    }),
    email: z.string().meta({
        actions: [UserAction.CREATE],
    }),
    createdAt: z.string(),
});

const userActions = {
    [UserAction.GET]: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    [UserAction.LIST]: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    [UserAction.CREATE]: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    [UserAction.UPDATE]: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),
    },
    [UserAction.DELETE]: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),
    },
};

export const userStore = createStore("user", userSchema, userActions);

export type User = z.infer<typeof userSchema>;
```

## Next Steps

- [Core Concepts](../core-concepts/README.md) - Understand how harlemify works
- [Store Patterns](../store-patterns/README.md) - Learn collection, singleton, and nested patterns
