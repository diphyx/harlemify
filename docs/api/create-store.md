# createStore

Creates a new store with API integration and state management.

## Signature

```typescript
createStore(entity, schema, actions, options?)
```

## Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `entity` | `string` | Entity name (e.g., "user", "product") |
| `schema` | `z.ZodObject` | Zod schema with metadata |
| `actions` | `ActionsConfig` | Action definitions |
| `options` | `StoreOptions` | Optional configuration |

## Returns: Store

```typescript
interface Store {
    store: HarlemStore;      // Underlying Harlem store
    alias: {
        unit: string;        // Singular name (e.g., "user")
        units: string;       // Plural name (e.g., "users")
    };
    indicator: string;       // Primary key field name
    unit: ComputedRef;       // Single cached unit
    units: ComputedRef;      // Cached unit collection
    action: StoreActions;    // Action methods
    memory: StoreMemory;     // Memory mutation methods
    monitor: StoreMonitor;   // Action status objects
}
```

## Options

```typescript
interface StoreOptions {
    adapter?: ApiAdapter;           // Custom HTTP adapter
    indicator?: string;             // Override primary key field
    hooks?: StoreHooks;             // Lifecycle hooks
    extensions?: Extension[];       // Harlem extensions
}
```

### adapter

Override the HTTP adapter for all actions:

```typescript
const userStore = createStore("user", schema, actions, {
    adapter: defineApiAdapter({
        baseURL: "/api/v2",
        timeout: 30000,
    }),
});
```

### indicator

Override the primary key field (default: field with `indicator: true` in schema):

```typescript
const documentStore = createStore("document", schema, actions, {
    indicator: "uuid",
});
```

### hooks

Execute code before/after every action:

```typescript
const userStore = createStore("user", schema, actions, {
    hooks: {
        before: async () => {
            console.log("Request starting");
        },
        after: (error) => {
            if (error) console.error(error);
        },
    },
});
```

### extensions

Add Harlem extensions:

```typescript
import { createStorageExtension } from "@harlem/extension-storage";

const userStore = createStore("user", schema, actions, {
    extensions: [
        createStorageExtension({ type: "local" }),
    ],
});
```

## Example

```typescript
import { z } from "zod";

enum UserAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
}

const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: [UserAction.CREATE] }),
    email: z.string().meta({ actions: [UserAction.CREATE] }),
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
};

export const userStore = createStore("user", userSchema, userActions);

export type User = z.infer<typeof userSchema>;
```

## Actions Config

```typescript
type ActionsConfig = Record<string, ActionDefinition>;

interface ActionDefinition {
    endpoint: EndpointDefinition;   // Required
    memory?: MemoryDefinition;       // Optional
}
```

## See Also

- [useStoreAlias](use-store-alias.md) - Access store in components
- [Builders](builders.md) - Endpoint and Memory builders
