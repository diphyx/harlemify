# Shape

The shape is the foundation of every harlemify store. It defines your data structure using [Zod](https://zod.dev/) and provides metadata for state management.

## Basic Shape

Use the `shape` helper to define a Zod object schema. It accepts three input forms — pick whichever is most natural for your codebase:

**1. Factory callback** (default — terse, full access to short-form helpers):

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

**2. Raw Zod definition** (when factory shortcuts aren't needed):

```typescript
import { z } from "zod";

const userShape = shape({
    id: z.number(),
    name: z.string(),
    email: z.email(),
});
```

**3. Pre-built `z.object(...)`** (reuse external/shared schemas):

```typescript
import { z } from "zod";

const externalUserSchema = z.object({
    id: z.number(),
    name: z.string(),
});

const userShape = shape(externalUserSchema);
```

All three forms return the same `ShapeCall<T>`. The factory callback provides access to all Zod types:

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

## Composing Shapes

`shape.extend`, `shape.pick`, and `shape.omit` are thin pass-throughs over Zod's native `.extend` / `.pick` / `.omit`, re-decorated with `.defaults()`. Refinements and transforms on the source schema are preserved.

### `shape.extend(base, definition)`

Add new fields to an existing shape, or override existing ones. Accepts a raw Zod definition (same signature as `z.object().extend`). Later fields override earlier ones on key collision.

**Add new fields:**

```typescript
import { z } from "zod";

const profileShape = shape.extend(userShape, {
    bio: z.string(),
    avatarUrl: z.url(),
});
```

**Override existing fields** — for example, to attach Harlemify meta (`identifier`, `alias`) to a pre-built schema without modifying the source:

```typescript
const externalUserSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
});

const userShape = shape.extend(shape(externalUserSchema), {
    id: z.number().meta({ identifier: true }),
    first_name: z.string().meta({ alias: "first-name" }),
    last_name: z.string().meta({ alias: "last-name" }),
});
```

### `shape.pick(base, mask)`

Keep only the keys set to `true` in the mask (same signature as `z.object().pick`):

```typescript
const credentialsShape = shape.pick(userShape, { id: true, name: true });

credentialsShape.defaults();
// { id: 0, name: "" }
```

### `shape.omit(base, mask)`

Drop the keys set to `true` in the mask (same signature as `z.object().omit`):

```typescript
const publicUserShape = shape.omit(userShape, { email: true });
```

## Scalar State Pattern

Shapes must be Zod objects. For a singleton primitive value (counters, totals, tokens, flags), wrap the primitive in a single-field shape and unwrap via a view:

```typescript
const totalShape = shape((factory) => ({
    value: factory.number(),
}));

model({ one }) {
    return { total: one(totalShape) };
}
view({ from }) {
    return { total: from("total", (m) => m.value) };
}

// view.total.value          → number
// model.total.set({ value: 42 })
```

For grouped scalars (pagination `total`/`offset`/`limit`), put them on one shape and expose each via its own view. Pair with [multi-commit](action.md#multiple-commits) when the API returns an envelope.

> **Primitive arrays:** don't `many()` with `{ value: T }` wrappers — `many()` is designed around identified items. Use `one()` with an array field (`shape({ values: f.array(f.string()) })`) and accept that mutations replace the whole array. If you need per-item add/remove, give the items real ids and use `many()` of objects.

> **UI-only state:** use a Vue `ref` in the component — models are overkill for ephemeral local state.

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
