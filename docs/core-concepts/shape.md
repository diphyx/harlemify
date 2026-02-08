# Shape

The shape is the foundation of every harlemify store. It defines your data structure using [Zod](https://zod.dev/) and provides metadata for state management.

## Basic Shape

Use the `shape` helper to define a Zod object schema:

```typescript
import { shape, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.email(),
    };
});

type User = ShapeInfer<typeof userShape>;
```

The factory callback provides access to all Zod types: primitives (`string`, `number`, `boolean`, `bigint`, `date`), structures (`object`, `array`, `tuple`, `record`, `enum`, `union`, `literal`), string formats (`email`, `url`, `uuid`, `ulid`, `nanoid`, `jwt`, `ipv4`, `ipv6`, `mac`, `hex`, `base64`), and special types (`any`, `unknown`, `never`, `nullable`, `optional`).

## Identifier Meta

The identifier is an **optional** feature that provides easy item matching in `many()` collection mutations (`patch`, `remove`, `add` with `unique`). Not every shape needs an identifier — shapes used with `one()` models work perfectly fine without one.

Mark the primary key field with `.meta({ identifier: true })` when your shape is used in a collection:

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});
```

Shapes without an identifier are completely valid:

```typescript
const configShape = shape((factory) => {
    return {
        theme: factory.enum(["light", "dark"]),
        language: factory.string(),
        notifications: factory.boolean(),
    };
});
```

If no identifier is explicitly marked, harlemify falls back to fields named `id` or `_id` when needed by collection operations.

## Type Inference

Export the inferred type using `ShapeInfer`:

```typescript
export type User = ShapeInfer<typeof userShape>;
// { id: number; name: string; email: string }
```

## Complex Shapes

### Nested Objects

```typescript
const projectShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        meta: factory.object({
            deadline: factory.string(),
            budget: factory.number(),
            options: factory.object({
                notify: factory.boolean(),
                priority: factory.number(),
            }),
        }),
    };
});
```

### Arrays

```typescript
const projectShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        milestones: factory.array(
            factory.object({
                id: factory.number(),
                name: factory.string(),
                done: factory.boolean(),
            }),
        ),
    };
});
```

### Enums

```typescript
const configShape = shape((factory) => {
    return {
        theme: factory.enum(["light", "dark"]),
        language: factory.string(),
    };
});
```

## Custom Identifier

Override the identifier at the model level if your shape doesn't use `id`:

```typescript
const documentShape = shape((factory) => {
    return {
        uuid: factory.string(),
        title: factory.string(),
    };
});

// In model definition
model({ many }) {
    return {
        list: many(documentShape, { identifier: "uuid" }),
    };
},
```

## Next Steps

- [Model](model.md) - Define state containers using shapes
- [View](view.md) - Create computed properties
