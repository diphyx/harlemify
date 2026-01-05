# Concepts

## Schema

A **schema** defines the structure and field types of your units using [Zod](https://zod.dev/). It describes what fields a unit has, their data types, and provides TypeScript type inference.

### Field Metadata

Schema fields can have metadata:

| Meta Property | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `indicator`   | Marks the field as primary key (used to identify units)        |
| `actions`     | Specifies which API actions include this field in request body |

```typescript
const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT, ApiAction.PATCH],
    }),
    email: z.string().meta({
        actions: [ApiAction.POST],
    }),
    createdAt: z.string(), // No meta = not sent in any request body
});
```

## Unit

A **unit** is a single data entity managed by the store. It represents one record from your API (e.g., a user, a product, an order).

- `unit` refers to a single entity
- `units` refers to a collection of entities

## Memory

**Memory** is the local state where units are stored. The store maintains two separate memory spaces:

| Memory           | Description                 |
| ---------------- | --------------------------- |
| `memorizedUnit`  | Holds a single unit         |
| `memorizedUnits` | Holds a collection of units |

### Unit vs Units

All `*Unit` actions/mutations work with `memorizedUnit`, all `*Units` actions/mutations work with `memorizedUnits`.

**Use `*Unit` for singleton data** - data that cannot be plural:

- App configuration (`/config`)
- User settings (`/settings`)
- Current authenticated user (`/me`)

```typescript
// Singleton store - only *_UNIT endpoints
export const configStore = createStore("config", ConfigSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: "/config",
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: "/config",
    },
});

// Usage
await getUnit(); // Fetch → memorizedUnit
await patchUnit({ id: 1, theme: "dark" }); // Update → memorizedUnit
```

**Use `*Units` for collections/lists:**

- User list (`/users`)
- Product catalog (`/products`)
- Order history (`/orders`)

```typescript
// Collection store - use *_UNITS endpoints
export const productStore = createStore("product", ProductSchema, {
    [Endpoint.GET_UNITS]: { action: ApiAction.GET, url: "/products" },
    [Endpoint.POST_UNITS]: { action: ApiAction.POST, url: "/products" },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: (p) => `/products/${p.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: (p) => `/products/${p.id}`,
    },
});

// Usage
await getUnits(); // Fetch → memorizedUnits
await postUnits([{ id: 0, name: "New" }]); // Create → adds to memorizedUnits
await patchUnits([{ id: 1, price: 99 }]); // Update → updates in memorizedUnits
await deleteUnits([{ id: 1 }]); // Delete → removes from memorizedUnits
```

**Use mutations for temporary local state** (no API call):

```typescript
// Select item for modal - use mutation directly
setMemorizedUnit(selectedUser);
setMemorizedUnit(null); // Clear when modal closes
```

### Mutations vs API Actions

| Method                   | Behavior                                               |
| ------------------------ | ------------------------------------------------------ |
| `setMemorizedUnit(null)` | Clears immediately, no condition check                 |
| `deleteUnit({ id })`     | API call + clears only if indicator matches            |
| `setMemorizedUnits([]) ` | Clears immediately, no condition check                 |
| `deleteUnits([{ id }])`  | API call + removes only items with matching indicators |

### Memory Mutations

| Mutation             | Description                                     |
| -------------------- | ----------------------------------------------- |
| `setMemorizedUnit`   | Replace the single unit (or set to null)        |
| `setMemorizedUnits`  | Replace the entire collection                   |
| `editMemorizedUnit`  | Merge changes into the single unit              |
| `editMemorizedUnits` | Merge changes into matching units in collection |
| `dropMemorizedUnit`  | Remove the single unit if indicator matches     |
| `dropMemorizedUnits` | Remove specific units from collection           |

## API

The **API** client handles HTTP communication with your backend. It provides methods for all REST operations (GET, POST, PUT, PATCH, DELETE) with support for:

- Base URL configuration
- Request timeout
- Dynamic headers (static values, refs, or functions)
- Query parameters
- Request/response error handling
- Abort controller for request cancellation

Each store has its own API instance accessible via the `api` property, or you can create a standalone client using `createApi()`.

## Endpoint

An **endpoint** maps a store action to an API URL.

### Endpoint Properties

| Property | Description                                                 |
| -------- | ----------------------------------------------------------- |
| `action` | The HTTP method (GET, POST, PUT, PATCH, DELETE)             |
| `url`    | Static string or function returning the URL with parameters |

### Available Endpoints

| Endpoint                       | Description               |
| ------------------------------ | ------------------------- |
| `GET_UNIT` / `GET_UNITS`       | Fetch single unit or list |
| `POST_UNIT` / `POST_UNITS`     | Create new unit(s)        |
| `PUT_UNIT` / `PUT_UNITS`       | Replace existing unit(s)  |
| `PATCH_UNIT` / `PATCH_UNITS`   | Partially update unit(s)  |
| `DELETE_UNIT` / `DELETE_UNITS` | Remove unit(s)            |

### Endpoint Status

Each endpoint tracks its request status:

| Status    | Description                    |
| --------- | ------------------------------ |
| `IDLE`    | No request made yet            |
| `PENDING` | Request in progress            |
| `SUCCESS` | Request completed successfully |
| `FAILED`  | Request failed                 |

Access status via `endpointsStatus`:

```typescript
const { endpointsStatus } = userStore;

endpointsStatus.getUnitsIsPending.value; // boolean
endpointsStatus.getUnitsIsSuccess.value; // boolean
endpointsStatus.getUnitsIsFailed.value; // boolean
endpointsStatus.getUnitsIsIdle.value; // boolean
```

## Lifecycle Hooks

Hooks allow you to execute code before and after every API operation:

```typescript
export const userStore = createStore("user", UserSchema, endpoints, {
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
});
```

## Validation

Enable Zod validation before sending data to the API by passing `validate: true` in action options. Validation only checks fields that are included in the action's `meta.actions`:

```typescript
// Validates only fields with ApiAction.POST in their meta.actions
await postUnit(
    { id: 1, name: "John", email: "john@example.com" },
    { validate: true },
);

// Validates only fields with ApiAction.PUT in their meta.actions
await putUnit({ id: 1, name: "John" }, { validate: true });

// PATCH uses schema.partial() for partial validation
await patchUnit({ id: 1, name: "John Doe" }, { validate: true });
```

If validation fails, Zod throws a `ZodError` before the API request is made.
