# Schema

The schema is the foundation of every harlemify store. It defines your data structure using [Zod](https://zod.dev/) and provides metadata for API integration.

## Basic Schema

```typescript
import { z } from "zod";

const userSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string(),
});

type User = z.infer<typeof userSchema>;
```

## Schema Meta

Use `.meta()` to add harlemify-specific configuration to fields.

### Indicator

Marks the primary key field used to identify units:

```typescript
const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string(),
});
```

The indicator is used for:
- Matching items in `Memory.units().edit()`
- Identifying items in `Memory.units().drop()`
- Building dynamic URLs

### Actions

Specifies which actions include this field in the request body:

```typescript
enum UserAction {
    CREATE = "create",
    UPDATE = "update",
}

const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: [UserAction.CREATE, UserAction.UPDATE],
    }),
    email: z.string().meta({
        actions: [UserAction.CREATE],
    }),
    createdAt: z.string(), // No meta = never sent
});
```

**Request body for `create`:**
```json
{ "name": "John", "email": "john@test.com" }
```

**Request body for `update`:**
```json
{ "name": "John" }
```

## Type Inference

Export the inferred type for use in components:

```typescript
export const userStore = createStore("user", userSchema, actions);
export type User = z.infer<typeof userSchema>;
```

## Complex Schemas

### Nested Objects

```typescript
const projectSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string(),
    meta: z.object({
        deadline: z.string(),
        budget: z.number(),
    }),
});
```

### Arrays

```typescript
const projectSchema = z.object({
    id: z.number().meta({ indicator: true }),
    milestones: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            done: z.boolean(),
        })
    ),
});
```

### Enums

```typescript
const configSchema = z.object({
    id: z.number().meta({ indicator: true }),
    theme: z.enum(["light", "dark"]),
});
```

## Custom Indicator

By default, harlemify looks for a field with `indicator: true`. You can override this in store options:

```typescript
const documentSchema = z.object({
    uuid: z.string(),
    title: z.string(),
});

const documentStore = createStore("document", documentSchema, actions, {
    indicator: "uuid",
});
```

## Next Steps

- [Endpoint Builder](endpoint.md) - Define API endpoints
- [Memory Builder](memory.md) - Control state storage
