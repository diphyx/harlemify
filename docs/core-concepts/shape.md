# Shape

The shape is the foundation of every harlemify store. It defines your data structure using [Zod](https://zod.dev/) and provides metadata for state management.

## Basic Shape

Use the `shape` helper to define a Zod object schema:

```typescript
import { shape, type ShapeInfer } from "@diphyx/harlemify/runtime";

const userShape = shape((factory) => ({
    id: factory.number(),
    name: factory.string(),
    email: factory.email(),
}));

type User = ShapeInfer<typeof userShape>;
// { id: number; name: string; email: string }
```

The factory callback provides access to all Zod types:

- **Primitives** — `string`, `number`, `boolean`, `bigint`, `date`
- **Structures** — `object`, `array`, `tuple`, `record`, `map`, `set`, `enum`, `union`, `literal`
- **String formats** — `email`, `url`, `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `jwt`, `emoji`, `ipv4`, `ipv6`, `mac`, `base64`, `base64url`, `hex`
- **Special** — `any`, `unknown`, `never`, `nullable`, `optional`

## Defaults

Generate a zero-value object from a shape, with optional partial overrides:

```typescript
const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
    active: factory.boolean(),
}));

userShape.defaults();
// { id: 0, name: "", email: "", active: false }

userShape.defaults({ active: true, name: "John" });
// { id: 0, name: "John", email: "", active: true }
```

Overrides are deep-merged via `defu`, so nested objects are merged rather than replaced.

## Meta

### Identifier

Mark the primary key field with `.meta({ identifier: true })` to enable item matching in `many()` collection mutations (`patch`, `remove`, `add` with `unique`):

```typescript
const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));
```

Identifiers are only needed for shapes used with `many()` models. Shapes used with `one()` work without one:

```typescript
const configShape = shape((factory) => ({
    theme: factory.enum(["light", "dark"]),
    language: factory.string(),
    notifications: factory.boolean(),
}));
```

If no identifier is explicitly marked, harlemify falls back to a field named `id`. You can also override the identifier at the model level:

```typescript
const documentShape = shape((factory) => ({
    uuid: factory.string(),
    title: factory.string(),
}));

model({ many }) {
    return {
        list: many(documentShape, { identifier: "uuid" }),
    };
},
```

### Alias

When your API uses different key naming conventions than your shape (e.g. kebab-case `first-name` vs snake_case `first_name`), use `.meta({ alias })` to define the mapping once at the shape level:

```typescript
const contactShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    first_name: factory.string().meta({ alias: "first-name" }),
    last_name: factory.string().meta({ alias: "last-name" }),
    email: factory.email(),
}));
```

Alias remapping is applied automatically during action execution:

- **Inbound (response):** API keys (`first-name`) are remapped to shape keys (`first_name`) before committing to the store
- **Outbound (request body):** Shape keys (`first_name`) are remapped to alias keys (`first-name`) before sending

This eliminates the need for `transformer.request` / `transformer.response` at every call site for key renaming.

## Complex Shapes

### Nested Objects

```typescript
const projectShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    meta: factory.object({
        deadline: factory.string(),
        budget: factory.number(),
        options: factory.object({
            notify: factory.boolean(),
            priority: factory.number(),
        }),
    }),
}));
```

### Arrays

```typescript
const projectShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    milestones: factory.array(
        factory.object({
            id: factory.number(),
            name: factory.string(),
            done: factory.boolean(),
        }),
    ),
}));
```

### Enums

```typescript
const configShape = shape((factory) => ({
    theme: factory.enum(["light", "dark"]),
    language: factory.string(),
}));
```

## Next Steps

- [Model](model.md) — Define state containers using shapes
- [View](view.md) — Create computed properties
