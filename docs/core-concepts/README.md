# Core Concepts

Harlemify is built around four core concepts that work together to provide schema-driven state management.

## Architecture Overview

```
Schema (Zod)
    ↓
createStore(entity, schema, actions)
    ↓
┌─────────────────────────────────────┐
│  Store                              │
│  ├── Endpoint → API Request         │
│  ├── Memory   → State Management    │
│  └── Monitor  → Status Tracking     │
└─────────────────────────────────────┘
    ↓
useStoreAlias(store)
    ↓
Component (Vue)
```

## The Four Pillars

### [Schema](schema.md)

Your Zod schema is the single source of truth. It defines:
- Data structure and types
- Primary key (indicator)
- Which fields go in request bodies

```typescript
const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: ["create", "update"] }),
});
```

### [Endpoint Builder](endpoint.md)

Defines HTTP endpoints with fluent API:

```typescript
Endpoint.get("/users")                      // Static URL
Endpoint.get<User>((p) => `/users/${p.id}`) // Dynamic URL
Endpoint.post("/users").withAdapter(custom) // With adapter
```

### [Memory Builder](memory.md)

Controls where API responses are stored:

```typescript
Memory.unit()                  // Single item
Memory.units()                 // Collection
Memory.unit("milestones")      // Nested field
Memory.units().add({ prepend: true })  // Prepend to list
```

### [Monitor](monitor.md)

Tracks request status for each action:

```typescript
userMonitor.list.pending()  // Loading state
userMonitor.create.failed() // Error state
userMonitor.get.current()   // "idle" | "pending" | "success" | "failed"
```

## How They Connect

```typescript
// 1. Schema defines the shape
const schema = z.object({ id: z.number(), name: z.string() });

// 2. Actions combine endpoint + memory
const actions = {
    list: {
        endpoint: Endpoint.get("/users"),    // Where to fetch
        memory: Memory.units(),               // Where to store
    },
};

// 3. Store brings it together
const userStore = createStore("user", schema, actions);

// 4. Composable provides reactive access
const { users, listUser, userMonitor } = useStoreAlias(userStore);
```

## Next Steps

- [Schema](schema.md) - Define your data structure
- [Endpoint Builder](endpoint.md) - Configure API calls
- [Memory Builder](memory.md) - Control state storage
- [Monitor](monitor.md) - Track request status
