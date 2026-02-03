# Builders

Fluent APIs for defining endpoints and memory targets.

## Endpoint Builder

Creates HTTP endpoint definitions.

### Methods

```typescript
Endpoint.get(url)       // GET request
Endpoint.post(url)      // POST request
Endpoint.put(url)       // PUT request
Endpoint.patch(url)     // PATCH request
Endpoint.delete(url)    // DELETE request
```

### URL Types

```typescript
// Static URL
Endpoint.get("/users")

// Dynamic URL with typed params
Endpoint.get<User>((params) => `/users/${params.id}`)
```

### Chaining

```typescript
// Add custom adapter
Endpoint.get("/users").withAdapter(customAdapter)
```

### Types

```typescript
type EndpointUrl<S> = string | ((params: Partial<S>) => string);

interface EndpointDefinition<S> {
    readonly method: EndpointMethod;
    readonly url: EndpointUrl<S>;
    readonly adapter?: ApiAdapter;
}

interface EndpointChain<S> extends EndpointDefinition<S> {
    withAdapter(adapter: ApiAdapter): EndpointDefinition<S>;
}
```

---

## Memory Builder

Defines where API responses are stored and how they affect state.

### Root Targets

```typescript
Memory.unit()      // Target: state.unit
Memory.units()     // Target: state.units
```

### Nested Targets

```typescript
Memory.unit("field")              // Target: state.unit.field
Memory.unit("field", "nested")    // Target: state.unit.field.nested
```

### Unit Mutations

```typescript
Memory.unit().set()     // Replace unit
Memory.unit().edit()    // Merge into unit
Memory.unit().drop()    // Clear unit (null)
```

### Units Mutations

```typescript
Memory.units().set()                    // Replace array
Memory.units().edit()                   // Shallow merge items (by indicator)
Memory.units().edit({ deep: true })     // Deep merge items (by indicator)
Memory.units().drop()                   // Remove items (by indicator)
Memory.units().add()                    // Append to end
Memory.units().add({ prepend: true })   // Prepend to start
```

### Default Mutations

When mutation not specified, inferred from HTTP method:

| HTTP Method | Unit | Units |
|-------------|------|-------|
| GET | set | set |
| POST | set | add |
| PUT | set | edit |
| PATCH | edit | edit |
| DELETE | drop | drop |

### Types

```typescript
interface MemoryDefinition {
    readonly on: "unit" | "units";
    readonly path: string[];
    readonly mutation?: "set" | "edit" | "drop" | "add";
    readonly position?: "first" | "last";
}

interface UnitMemoryBuilder extends MemoryDefinition {
    set(): MemoryDefinition;
    edit(): MemoryDefinition;
    drop(): MemoryDefinition;
}

interface UnitsMemoryBuilder extends MemoryDefinition {
    set(): MemoryDefinition;
    edit(): MemoryDefinition;
    drop(): MemoryDefinition;
    add(position?: "first" | "last"): MemoryDefinition;
}
```

---

## Complete Example

```typescript
const userActions = {
    get: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`),
        memory: Memory.unit(),
    },
    list: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    create: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
    update: {
        endpoint: Endpoint.patch<User>((p) => `/users/${p.id}`),
        memory: Memory.units().edit(),
    },
    delete: {
        endpoint: Endpoint.delete<User>((p) => `/users/${p.id}`),
        memory: Memory.units().drop(),
    },
    avatar: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}/avatar`),
        memory: Memory.unit("avatar"),
    },
    export: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}/export`).withAdapter(exportAdapter),
        // No memory - returns data without storing
    },
};
```
