# shape

Creates a Zod object schema for use as a model shape.

## Signature

```typescript
function shape<T>(definition: T | ((factory: ShapeFactory) => T)): ShapeType<T>;
```

## Parameters

| Parameter    | Type                                  | Description                          |
| ------------ | ------------------------------------- | ------------------------------------ |
| `definition` | `T \| ((factory: ShapeFactory) => T)` | A shape object or a factory function |

## Returns

A `ShapeType<T>` that can be used with `one()` and `many()`.

## Usage

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
        active: factory.boolean(),
    };
});
```

## ShapeFactory

The factory callback provides access to all Zod types:

### Primitives

`string`, `number`, `boolean`, `bigint`, `date`

### Structures

`object`, `array`, `tuple`, `record`, `map`, `set`, `enum`, `union`, `literal`

### String Formats

`email`, `url`, `uuid`, `cuid`, `cuid2`, `ulid`, `nanoid`, `jwt`, `emoji`, `ipv4`, `ipv6`, `mac`, `base64`, `base64url`, `hex`

### Special

`any`, `unknown`, `never`, `nullable`, `optional`

## ShapeInfer

Extract the TypeScript type from a shape:

```typescript
import { type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
    };
});

type User = ShapeInfer<typeof userShape>;
// { id: number; name: string }
```

## Identifier Meta

The identifier is **optional**. It is only relevant for `many()` collection models where item matching is needed. Shapes used with `one()` models do not need an identifier.

Mark a field as the identifier for array matching:

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
    };
});
```

The identifier is used by `ModelManyMode.PATCH`, `ModelManyMode.REMOVE`, and the `unique` option in `ModelManyMode.ADD` to match items in arrays.

**Identifier resolution priority:**

1. `identifier` option passed to `many(shape, { identifier: "uuid" })`
2. Field marked with `.meta({ identifier: true })` in the shape
3. Field named `id` (if present in shape)
4. Field named `_id` (if present in shape)
5. Falls back to `"id"` (may fail at runtime if the field doesn't exist)

## See Also

- [createStore](create-store.md) - Use shapes in store definitions
- [Types](types.md) - Complete type reference
