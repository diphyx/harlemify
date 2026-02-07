# shape

Creates a Zod object schema for use as a model shape.

## Signature

```typescript
function shape<T>(definition: T | ((factory: ShapeFactory) => T)): ShapeType<T>
```

## Parameters

| Parameter | Type | Description |
|----------|------|-------------|
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

The identifier is used by `ActionManyMode.PATCH`, `ActionManyMode.REMOVE`, and the `unique` option in `ActionManyMode.ADD` to match items in arrays.

If no identifier is marked, harlemify falls back to fields named `id` or `_id`.

## See Also

- [createStore](create-store.md) - Use shapes in store definitions
- [Types](types.md) - Complete type reference
