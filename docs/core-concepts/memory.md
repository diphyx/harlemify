# Memory Builder

The Memory builder defines where API responses are stored and how they affect state.

## Memory Targets

### Unit (Single Item)

Store a single entity:

```typescript
Memory.unit()
```

State: `{ unit: User | null, units: [] }`

### Units (Collection)

Store a list of entities:

```typescript
Memory.units()
```

State: `{ unit: null, units: User[] }`

## Nested Paths

Target nested fields within unit state:

```typescript
// One level deep
Memory.unit("milestones")    // → unit.milestones

// Two levels deep
Memory.unit("meta", "options")  // → unit.meta.options
```

Useful for loading sub-resources separately:

```typescript
const projectActions = {
    get: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
        memory: Memory.unit(),
    },
    milestones: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/milestones`),
        memory: Memory.unit("milestones"),
    },
    options: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/options`),
        memory: Memory.unit("meta", "options"),
    },
};
```

## Mutations

### Unit Mutations

```typescript
Memory.unit().set()                 // Replace entire unit
Memory.unit().edit()                // Shallow merge into existing unit
Memory.unit().edit({ deep: true })  // Deep merge into existing unit
Memory.unit().drop()                // Clear unit (set to null)
```

### Units Mutations

```typescript
Memory.units().set()                 // Replace entire array
Memory.units().edit()                // Shallow merge matching items (by indicator)
Memory.units().edit({ deep: true })  // Deep merge matching items (by indicator)
Memory.units().drop()                // Remove matching items (by indicator)
Memory.units().add()                    // Append to end (default)
Memory.units().add({ prepend: true })   // Prepend to start
```

### Shallow vs Deep Merge

By default, `edit()` performs a shallow merge (faster):

```typescript
// State: { id: 1, name: "John", meta: { role: "admin", active: true } }
// Update: { id: 1, meta: { role: "user" } }

Memory.unit().edit()  // Result: { id: 1, name: "John", meta: { role: "user" } }
                      // meta is replaced entirely (shallow)

Memory.unit().edit({ deep: true })  // Result: { id: 1, name: "John", meta: { role: "user", active: true } }
                                    // meta is merged (deep)
```

Use `deep: true` when updating nested objects that should be merged rather than replaced.

## Default Mutations

When mutation is not specified, it's inferred from the HTTP method:

| HTTP Method | Unit | Units |
|-------------|------|-------|
| GET | set | set |
| POST | set | add |
| PUT | set | edit |
| PATCH | edit | edit |
| DELETE | drop | drop |

These are equivalent:

```typescript
// Explicit
Memory.units().add()

// Implicit (POST defaults to add)
Memory.units()  // in POST action
```

## Actions Without Memory

For actions that return data without storing it:

```typescript
const projectActions = {
    export: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/export`),
        // No memory - data returned but not stored
    },
};
```

## Direct Memory Access

Use `[entity]Memory` from `useStoreAlias` for direct state mutations:

```typescript
const { userMemory } = useStoreAlias(userStore);

// Set state
userMemory.set({ id: 1, name: "John" });     // Set unit
userMemory.set([{ id: 1 }, { id: 2 }]);      // Set units
userMemory.set(null);                         // Clear unit

// Edit state (shallow merge by default)
userMemory.edit({ id: 1, name: "Updated" }); // Edit unit
userMemory.edit([{ id: 1, name: "Updated" }]); // Edit units

// Edit state (deep merge for nested objects)
userMemory.edit({ id: 1, meta: { role: "admin" } }, { deep: true });

// Drop state (remove)
userMemory.drop({ id: 1 });                  // Drop unit
userMemory.drop([{ id: 1 }, { id: 2 }]);     // Drop units
```

## Examples

### Collection CRUD

```typescript
const userActions = {
    list: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),              // Replace list
    },
    create: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),        // Append new item
    },
    update: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),       // Update in place
    },
    delete: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),       // Remove from list
    },
};
```

### Singleton

```typescript
const configActions = {
    get: {
        endpoint: Endpoint.get("/config"),
        memory: Memory.unit(),               // Set unit
    },
    update: {
        endpoint: Endpoint.patch("/config"),
        memory: Memory.unit().edit(),        // Merge into unit
    },
};
```

### Prepend New Items

```typescript
const postActions = {
    create: {
        endpoint: Endpoint.post("/posts"),
        memory: Memory.units().add({ prepend: true }), // New posts at top
    },
};
```

## Next Steps

- [Monitor](monitor.md) - Track request status
- [Store Patterns](../store-patterns/README.md) - See complete patterns
