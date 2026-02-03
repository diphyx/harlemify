# Endpoint Builder

The Endpoint builder creates HTTP endpoint definitions with a fluent API.

## HTTP Methods

```typescript
Endpoint.get(url)       // GET request
Endpoint.post(url)      // POST request
Endpoint.put(url)       // PUT request
Endpoint.patch(url)     // PATCH request
Endpoint.delete(url)    // DELETE request
```

## Static URLs

For endpoints without parameters:

```typescript
Endpoint.get("/users")
Endpoint.post("/users")
Endpoint.get("/config")
```

## Dynamic URLs

Use a function for URLs with parameters. The function receives typed params from your schema:

```typescript
Endpoint.get<User>((params) => `/users/${params.id}`)
Endpoint.patch<User>((params) => `/users/${params.id}`)
Endpoint.delete<User>((params) => `/users/${params.id}`)
```

**Usage:**
```typescript
await getUser({ id: 123 });
// GET /users/123
```

## Custom Adapters

Chain `.withAdapter()` to override the HTTP adapter for a specific endpoint:

```typescript
const detailAdapter: ApiAdapter<User> = async (request) => {
    const data = await $fetch<User>(request.url, {
        baseURL: "/api",
        method: request.method,
        timeout: 30000,
    });
    return { data };
};

const userActions = {
    get: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`).withAdapter(detailAdapter),
        memory: Memory.unit(),
    },
};
```

See [Custom Adapters](../advanced/adapters.md) for more details.

## Complete Example

```typescript
enum UserAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

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

## Action Options

When calling actions, you can pass additional options:

```typescript
await listUser({
    query: { page: 1, limit: 10 },
    headers: { "X-Custom": "value" },
});
// GET /users?page=1&limit=10
```

| Option | Type | Description |
|--------|------|-------------|
| `query` | `object` | Query parameters |
| `headers` | `object` | Additional headers |
| `body` | `unknown` | Override request body |
| `signal` | `AbortSignal` | For cancellation |
| `validate` | `boolean` | Validate with Zod |
| `adapter` | `ApiAdapter` | Override adapter |

## Next Steps

- [Memory Builder](memory.md) - Control where responses are stored
- [Custom Adapters](../advanced/adapters.md) - Advanced HTTP customization
