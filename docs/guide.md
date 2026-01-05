# API

## Store Actions

Each store provides API actions for CRUD operations. All actions are async and update memory automatically.

### GET Actions

#### `getUnit(unit?, options?)`

Fetches a single unit and stores it in `memorizedUnit`.

```typescript
// Singleton (no params needed)
await getUnit();

// With identifier
await getUnit({ id: 1 });
```

#### `getUnits(options?)`

Fetches a collection and stores it in `memorizedUnits`.

```typescript
await getUnits();
```

### POST Actions

#### `postUnit(unit, options?)`

Creates a single unit and stores it in `memorizedUnit`.

```typescript
await postUnit({ id: 0, name: "New Item", price: 99 });
```

#### `postUnits(units, options?)`

Creates multiple units. Each unit is posted individually and added to `memorizedUnits` progressively. New items are added at the beginning by default.

```typescript
await postUnits([
    { id: 0, name: "Item 1", price: 10 },
    { id: 0, name: "Item 2", price: 20 },
]);

// Add at end instead of beginning
await postUnits([{ id: 0, name: "Item" }], {
    position: StoreMemoryPosition.LAST,
});
```

### PUT Actions

#### `putUnit(unit, options?)`

Replaces a single unit entirely and stores it in `memorizedUnit`.

```typescript
await putUnit({ id: 1, name: "Updated Item", price: 150 });
```

#### `putUnits(units, options?)`

Replaces multiple units. Each unit is updated individually and `memorizedUnits` is updated progressively.

```typescript
await putUnits([
    { id: 1, name: "Updated 1", price: 100 },
    { id: 2, name: "Updated 2", price: 200 },
]);
```

### PATCH Actions

#### `patchUnit(unit, options?)`

Partially updates a single unit and merges changes into `memorizedUnit`.

```typescript
await patchUnit({ id: 1, price: 199 });
```

#### `patchUnits(units, options?)`

Partially updates multiple units. Each unit is patched individually and `memorizedUnits` is updated progressively.

```typescript
await patchUnits([
    { id: 1, price: 99 },
    { id: 2, price: 149 },
]);
```

### DELETE Actions

#### `deleteUnit(unit, options?)`

Deletes a single unit and removes it from `memorizedUnit` if indicator matches.

```typescript
await deleteUnit({ id: 1 });
```

#### `deleteUnits(units, options?)`

Deletes multiple units. Each unit is deleted individually and removed from `memorizedUnits` progressively.

```typescript
await deleteUnits([{ id: 1 }, { id: 2 }]);
```

## Options

All actions accept an optional `options` object:

| Option     | Description                                                          |
| ---------- | -------------------------------------------------------------------- |
| `query`    | Query parameters appended to the URL                                 |
| `headers`  | Additional headers for this request                                  |
| `body`     | Override the auto-generated request body                             |
| `validate` | Enable Zod validation before sending (POST/PUT/PATCH)                |
| `position` | Where to add new items: `FIRST` (default) or `LAST` (postUnits only) |
| `signal`   | AbortSignal for request cancellation                                 |

```typescript
await getUnits({
    query: { page: 1, limit: 10 },
    headers: { "X-Custom": "value" },
});

await postUnits([{ id: 0, name: "Test" }], {
    validate: true,
});

// With abort controller
const controller = new AbortController();
await getUnits({ signal: controller.signal });
// Cancel the request
controller.abort();
```

## Standalone API Client

Use `createApi()` for direct HTTP requests without a store.

```typescript
import { createApi } from "@diphyx/harlemify";

const api = createApi({
    url: "https://api.example.com",
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
    },
});

// GET
const users = await api.get("/users", { query: { page: 1 } });

// POST
const newUser = await api.post("/users", { body: { name: "John" } });

// PUT
await api.put("/users/1", { body: { name: "John Doe" } });

// PATCH
await api.patch("/users/1", { body: { name: "Johnny" } });

// DELETE
await api.del("/users/1");
```

## Configuration

Configure the API globally in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
            headers: {
                "Content-Type": "application/json",
            },
        },
    },
});
```

Or per-store:

```typescript
export const myStore = createStore(
    "myStore",
    MySchema,
    {
        /* endpoints */
    },
    {
        api: {
            url: "https://other-api.example.com",
            timeout: 30000,
        },
    },
);
```

## Store Options

The `createStore` function accepts an optional fourth parameter for store-level configuration:

```typescript
export const myStore = createStore(
    "myStore",
    MySchema,
    {
        /* endpoints */
    },
    {
        api: {
            /* API options */
        },
        indicator: "id",
        hooks: {
            before: async () => {
                console.log("Request starting...");
            },
            after: async (error) => {
                if (error) {
                    console.error("Request failed:", error);
                } else {
                    console.log("Request completed");
                }
            },
        },
        extensions: [],
    },
);
```

| Option       | Type          | Description                         |
| ------------ | ------------- | ----------------------------------- |
| `api`        | `ApiOptions`  | Override API options for this store |
| `indicator`  | `string`      | Override the primary key field name |
| `hooks`      | `StoreHooks`  | Lifecycle hooks for API operations  |
| `extensions` | `Extension[]` | Harlem extensions                   |

### Lifecycle Hooks

Hooks allow you to execute code before and after every API operation:

```typescript
interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}
```

- `before`: Called before every API request starts
- `after`: Called after every API request completes (receives error if failed)

Both hooks support async functions.
