# Harlemify

API state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Harlemify simplifies building data-driven Nuxt applications by combining Zod schema validation with Harlem's reactive state management. Define your data models once with field metadata, and get automatic API integration, request status tracking, and unit caching out of the box.

## Features

- ✅ Zod schema validation with field metadata
- ⚡ Automatic API client with runtime config
- 📊 CRUD operations with endpoint status tracking
- 🖥️ SSR support via Harlem SSR plugin

## Installation

```bash
npm install harlemify
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

## Concepts

### Schema

A **schema** defines the structure and field types of your units using [Zod](https://zod.dev/). It describes what fields a unit has, their data types, and provides TypeScript type inference. Optionally, you can enable validation when calling store actions.

Schema fields can have metadata:

| Meta Property | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `indicator`   | Marks the field as primary key (used to identify units)        |
| `actions`     | Specifies which API actions include this field in request body |

### Unit

A **unit** is a single data entity managed by the store. It represents one record from your API (e.g., a user, a product, an order).

### Memory

**Memory** is the local state where units are stored after being fetched from the API. It acts as a client-side cache that keeps your data reactive and accessible across components.

The store maintains two separate memory spaces:

| Memory           | Description                 | Example Use Case              |
| ---------------- | --------------------------- | ----------------------------- |
| `memorizedUnit`  | Holds a single unit         | Currently viewed user profile |
| `memorizedUnits` | Holds a collection of units | List of users in a table      |

These two memory spaces are independent, allowing you to manage a selected item separately from a list of items without conflicts.

### API

The **API** client handles HTTP communication with your backend. It provides methods for all REST operations (GET, POST, PUT, PATCH, DELETE) with support for:

- Base URL configuration
- Request timeout
- Dynamic headers (static values, refs, or functions)
- Query parameters
- Request/response error handling

Each store has its own API instance that can be accessed via `api` property, or you can create a standalone client using `createApi()`.

### Endpoint

An **endpoint** maps a store action to an API URL. Each endpoint defines:

| Property | Description                                                 |
| -------- | ----------------------------------------------------------- |
| `action` | The HTTP method (GET, POST, PUT, PATCH, DELETE)             |
| `url`    | Static string or function returning the URL with parameters |

Available endpoints:

| Endpoint                       | Description               |
| ------------------------------ | ------------------------- |
| `GET_UNIT` / `GET_UNITS`       | Fetch single unit or list |
| `POST_UNIT` / `POST_UNITS`     | Create new unit(s)        |
| `PUT_UNIT` / `PUT_UNITS`       | Replace existing unit(s)  |
| `PATCH_UNIT` / `PATCH_UNITS`   | Partially update unit(s)  |
| `DELETE_UNIT` / `DELETE_UNITS` | Remove unit(s)            |

## Usage

### Creating a Store

```typescript
// stores/user.ts
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
    email: z.string().meta({
        actions: [ApiAction.POST],
    }),
});

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [Endpoint.POST_UNIT]: {
        action: ApiAction.POST,
        url: "/users",
    },
    [Endpoint.POST_UNITS]: {
        action: ApiAction.POST,
        url: "/users/batch",
    },
    [Endpoint.PUT_UNIT]: {
        action: ApiAction.PUT,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [Endpoint.PUT_UNITS]: {
        action: ApiAction.PUT,
        url: "/users/batch",
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: "/users/batch",
    },
    [Endpoint.DELETE_UNIT]: {
        action: ApiAction.DELETE,
        url(params) {
            return `/users/${params.id}`;
        },
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: "/users/batch",
    },
});
```

### Using in Components

```vue
<script setup>
import { userStore } from "~/stores/user";

const { memorizedUnits, endpointsStatus, getUnits, postUnit, deleteUnit } =
    userStore;

await getUnits();
</script>

<template>
    <div v-if="endpointsStatus.getUnitsIsPending.value">Loading...</div>
    <div v-else-if="endpointsStatus.getUnitsIsFailed.value">
        Error loading users
    </div>
    <ul v-else>
        <li v-for="user in memorizedUnits.value" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

### Endpoint Status Tracking

Each endpoint has status getters:

```typescript
const { endpointsStatus } = userStore;

// Check if getUnits is pending
if (endpointsStatus.getUnitsIsPending.value) {
    // show loading
}

// Check if getUnits failed
if (endpointsStatus.getUnitsIsFailed.value) {
    // show error
}

// Check if getUnits succeeded
if (endpointsStatus.getUnitsIsSuccess.value) {
    // show data
}

// Available for all endpoints:
// getUnitIsIdle, getUnitIsPending, getUnitIsSuccess, getUnitIsFailed
// getUnitsIsIdle, getUnitsIsPending, getUnitsIsSuccess, getUnitsIsFailed
// postUnitIsIdle, postUnitIsPending, postUnitIsSuccess, postUnitIsFailed
// postUnitsIsIdle, postUnitsIsPending, postUnitsIsSuccess, postUnitsIsFailed
// ... and so on for PUT, PATCH, DELETE (single and batch)
```

### Validation

Enable Zod validation before sending data to the API by passing `validate: true` in the action options:

```typescript
const { postUnit, putUnit, patchUnit } = userStore;

// Validate unit before POST
await postUnit(
    { id: 1, name: "John", email: "john@example.com" },
    { validate: true },
);

// Validate unit before PUT
await putUnit(
    { id: 1, name: "John", email: "john@example.com" },
    { validate: true },
);

// Validate partial unit before PATCH (uses schema.partial())
await patchUnit({ id: 1, name: "John Doe" }, { validate: true });
```

If validation fails, Zod will throw a `ZodError` before the API request is made.

### Memory Mutations

Manually manipulate memorized data:

```typescript
const {
    memorizedUnit,
    memorizedUnits,
    setMemorizedUnit,
    setMemorizedUnits,
    editMemorizedUnit,
    editMemorizedUnits,
    dropMemorizedUnit,
    dropMemorizedUnits,
} = userStore;

// Set single unit
setMemorizedUnit({ id: 1, name: "John", email: "john@example.com" });

// Set all units
setMemorizedUnits([
    { id: 1, name: "John", email: "john@example.com" },
    { id: 2, name: "Jane", email: "jane@example.com" },
]);

// Clear single unit
setMemorizedUnit(null);

// Clear all units
setMemorizedUnits([]);

// Edit single unit (merge)
editMemorizedUnit({ id: 1, name: "John Doe" });

// Edit multiple units (merge)
editMemorizedUnits([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Doe" },
]);

// Drop single unit from memory
dropMemorizedUnit({ id: 1 });

// Drop multiple units from memory
dropMemorizedUnits([{ id: 1 }, { id: 2 }]);
```

### Per-Store API Options

Override module API options for specific stores:

```typescript
const userStore = createStore("user", UserSchema, endpoints, {
    api: {
        url: "https://other-api.example.com",
        timeout: 5000,
    },
});
```

### Dynamic API Headers

Use refs or functions for dynamic headers:

```typescript
import { ref } from "vue";

const token = ref("initial-token");

const userStore = createStore("user", UserSchema, endpoints, {
    api: {
        headers: {
            // Static value
            "Content-Type": "application/json",
            // Ref (reactive)
            Authorization: token,
            // Function (called on each request)
            "X-Request-Id": () => crypto.randomUUID(),
        },
    },
});

// Update token later
token.value = "new-token";
```

### Standalone API Client

Use `createApi` for standalone API calls:

```typescript
import { createApi } from "harlemify";

const api = createApi({
    url: "https://api.example.com",
    timeout: 10000,
    headers: {
        Authorization: "Bearer token",
    },
});

const users = await api.get("/users");
const user = await api.post("/users", { body: { name: "John" } });
await api.put("/users/1", { body: { name: "John Doe" } });
await api.patch("/users/1", { body: { name: "Johnny" } });
await api.del("/users/1");
```

## API Reference

### Module Options

| Option        | Type     | Default     | Description                     |
| ------------- | -------- | ----------- | ------------------------------- |
| `api.url`     | `string` | `undefined` | Base URL for API requests       |
| `api.timeout` | `number` | `undefined` | Request timeout in milliseconds |

### createStore(name, schema, endpoints?, options?)

| Parameter            | Type                 | Description                    |
| -------------------- | -------------------- | ------------------------------ |
| `name`               | `string`             | Store name                     |
| `schema`             | `z.ZodObject`        | Zod schema with field metadata |
| `endpoints`          | `EndpointDefinition` | Endpoint definitions           |
| `options.api`        | `ApiOptions`         | Override API options           |
| `options.extensions` | `Extension[]`        | Harlem extensions              |

### EndpointStatus

| Value     | Description         |
| --------- | ------------------- |
| `IDLE`    | No request made yet |
| `PENDING` | Request in progress |
| `SUCCESS` | Request completed   |
| `FAILED`  | Request failed      |

### ApiAction

| Value    | Description    |
| -------- | -------------- |
| `GET`    | GET request    |
| `POST`   | POST request   |
| `PUT`    | PUT request    |
| `PATCH`  | PATCH request  |
| `DELETE` | DELETE request |

## License

MIT
