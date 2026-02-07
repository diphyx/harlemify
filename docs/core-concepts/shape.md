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

Mark the primary key field with `.meta({ identifier: true })`. This is used for matching items in array mutations (`patch`, `remove`).

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

If no identifier is explicitly marked, harlemify looks for fields named `id` or `_id` as fallback.

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
        id: factory.number().meta({
            identifier: true,
        }),
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
