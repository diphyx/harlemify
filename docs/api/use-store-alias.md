# useStoreAlias

Composable for accessing a store with entity-prefixed names.

## Signature

```typescript
useStoreAlias(store)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `store` | `Store` | Store created with `createStore` |

## Returns

Returns an object with entity-prefixed properties:

| Property | Type | Description |
|----------|------|-------------|
| `[entity]` | `ComputedRef<T \| null>` | Single unit state |
| `[entities]` | `ComputedRef<T[]>` | Units collection state |
| `[action][Entity]` | `Function` | Action methods |
| `[entity]Memory` | `StoreMemory` | Memory mutation methods |
| `[entity]Monitor` | `StoreMonitor` | Action status objects |

## Naming Pattern

| Type | Pattern | Example |
|------|---------|---------|
| Unit State | `[entity]` | `user` |
| Units State | `[entities]` | `users` |
| Actions | `[action][Entity]` | `getUser`, `listUser` |
| Memory | `[entity]Memory` | `userMemory` |
| Monitor | `[entity]Monitor` | `userMonitor` |

## Example

```typescript
const {
    // State
    user,              // ComputedRef<User | null>
    users,             // ComputedRef<User[]>

    // Actions
    getUser,           // (params?, options?) => Promise<User>
    listUser,          // (params?, options?) => Promise<User[]>
    createUser,        // (params?, options?) => Promise<User>
    updateUser,        // (params?, options?) => Promise<User>
    deleteUser,        // (params?, options?) => Promise<boolean>

    // Memory
    userMemory,        // { set, edit, drop }

    // Monitor
    userMonitor,       // { get: ActionStatus, list: ActionStatus, ... }
} = useStoreAlias(userStore);
```

## State Access

```typescript
// Single unit (null if not set)
const currentUser = user.value;

// Collection (empty array if not set)
const allUsers = users.value;
```

## Action Calls

```typescript
// Basic call
await listUser();

// With params
await getUser({ id: 123 });

// With options
await listUser({
    query: { page: 1, limit: 10 },
    headers: { "X-Custom": "value" },
});
```

## Memory Methods

```typescript
// Set state
userMemory.set({ id: 1, name: "John" });     // Set unit
userMemory.set([{ id: 1 }, { id: 2 }]);      // Set units
userMemory.set(null);                         // Clear unit

// Edit state (merge)
userMemory.edit({ id: 1, name: "Updated" });

// Drop state (remove by indicator)
userMemory.drop({ id: 1 });
```

## Monitor Access

Monitor properties are functions that return the current value:

```typescript
// Check status - call as functions
userMonitor.list.current()   // "idle" | "pending" | "success" | "failed"
userMonitor.list.pending()   // boolean
userMonitor.list.success()   // boolean
userMonitor.list.failed()    // boolean
userMonitor.list.idle()      // boolean
```

In templates:

```vue
<div v-if="userMonitor.list.pending()">Loading...</div>
```

In scripts:

```typescript
if (userMonitor.list.pending()) {
    console.log("Loading...");
}
```

## Multiple Stores

No naming conflicts when using multiple stores:

```typescript
const {
    user,
    users,
    getUser,
    userMemory,
    userMonitor,
} = useStoreAlias(userStore);

const {
    product,
    products,
    getProduct,
    productMemory,
    productMonitor,
} = useStoreAlias(productStore);
```

## ActionOptions

All actions accept an optional second parameter:

```typescript
interface ActionOptions {
    query?: Record<string, unknown>;   // Query parameters
    headers?: Record<string, string>;  // Additional headers
    body?: unknown;                    // Override request body
    signal?: AbortSignal;              // For cancellation
    validate?: boolean;                // Validate with Zod
    adapter?: ApiAdapter;              // Override adapter
}
```

## See Also

- [createStore](create-store.md) - Create stores
- [Monitor](../core-concepts/monitor.md) - Status tracking
