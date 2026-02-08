# createStore

Creates a new store with model, view, and action layers.

## Signature

```typescript
function createStore<MD, VD, AD>(config: StoreConfig<MD, VD, AD>): Store<MD, VD, AD>;
```

## Config

| Property | Type               | Description                                    |
| -------- | ------------------ | ---------------------------------------------- |
| `name`   | `string`           | Unique store name (used for Harlem and logging) |
| `model`  | `(factory) => MD`  | Returns model definitions via `one` / `many`    |
| `view`   | `(factory) => VD`  | Returns view definitions via `from` / `merge`   |
| `action` | `(factory) => AD`  | Returns action definitions via `api` / `handler` |

## Returns: Store

| Property | Type           | Description                              |
| -------- | -------------- | ---------------------------------------- |
| `model`  | `StoreModel`   | Typed mutation methods per model key     |
| `view`   | `StoreView`    | `ComputedRef` values per view definition |
| `action` | `StoreAction`  | Callable actions with status metadata    |

## Example

```typescript
import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));

type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return { current: one(userShape), list: many(userShape) };
    },
    view({ from }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (model) => model.length),
        };
    },
    action({ api }) {
        return {
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
            get: api.get(
                { url: (view) => `/users/${view.user.value?.id}` },
                { model: "current", mode: ModelOneMode.SET },
            ),
            create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
        };
    },
});
```

## See Also

- [Types](types.md) - Full type signatures for all factories and interfaces
- [shape](shape.md) - Define data shapes
