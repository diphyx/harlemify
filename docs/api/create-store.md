# createStore

Creates a new store with model, view, and action layers.

## Signature

```typescript
function createStore<M, VD, AD>(config: StoreConfig<M, VD, AD>): Store<M, VD, AD>;
```

## Parameters

### StoreConfig

```typescript
interface StoreConfig<M, VD, AD> {
    name: string;
    model: (factory: ModelFactory) => M;
    view: (factory: ViewFactory<M>) => VD;
    action: (factory: ActionFactory<M, StoreView<M, VD>>) => AD;
}
```

| Property | Type              | Description                                                         |
| -------- | ----------------- | ------------------------------------------------------------------- |
| `name`   | `string`          | Unique store name (used for Harlem registration and logging)        |
| `model`  | `(factory) => M`  | Function that receives a ModelFactory and returns model definitions |
| `view`   | `(factory) => VD` | Function that receives a ViewFactory and returns view definitions   |
| `action` | `(factory) => AD` | Function that receives an ActionFactory and returns action chains   |

## Returns: Store

```typescript
interface Store<M, VD, AD> {
    model: StoreModel<M>;
    view: StoreView<M, VD>;
    action: StoreAction<M, StoreView<M, VD>, AD>;
}
```

### model

The model committer function for direct state mutations:

```typescript
type StoreModel<M> = ActionCommitter<M>;
```

```typescript
// One-model mutations
store.model(key, ActionOneMode.SET, value);
store.model(key, ActionOneMode.PATCH, partialValue);
store.model(key, ActionOneMode.PATCH, partialValue, { deep: true });
store.model(key, ActionOneMode.RESET);

// Many-model mutations
store.model(key, ActionManyMode.SET, array);
store.model(key, ActionManyMode.ADD, item);
store.model(key, ActionManyMode.ADD, item, { prepend: true, unique: true });
store.model(key, ActionManyMode.PATCH, partialItem);
store.model(key, ActionManyMode.PATCH, partialItem, { by: "email", deep: true });
store.model(key, ActionManyMode.REMOVE, item);
store.model(key, ActionManyMode.REMOVE, item, { by: "email" });
store.model(key, ActionManyMode.RESET);
```

### view

Object containing `ComputedRef` values for each view definition:

```typescript
store.view.user.value; // User | null
store.view.users.value; // User[]
store.view.count.value; // number
```

### action

Object containing callable action functions with metadata:

```typescript
await store.action.fetch();
await store.action.fetch(payload);

store.action.fetch.loading; // ComputedRef<boolean>
store.action.fetch.status; // Readonly<Ref<ActionStatus>>
store.action.fetch.error; // Readonly<Ref<ActionError | null>>
store.action.fetch.data; // DeepReadonly<T> | null
store.action.fetch.reset(); // Reset status, error, and data
```

## Factories

### ModelFactory

```typescript
interface ModelFactory {
    one<S>(shape: ShapeType<S>, options?: ModelOneOptions<S>): ModelOneDefinition<S>;
    many<S>(shape: ShapeType<S>, options?: ModelManyOptions<S>): ModelManyDefinition<S>;
}
```

### ViewFactory

```typescript
interface ViewFactory<M> {
    from<K extends keyof M>(source: K): ViewFromDefinition;
    from<K extends keyof M, R>(source: K, resolver: (value) => R): ViewFromDefinition;
    merge<K extends readonly (keyof M)[], R>(sources: K, resolver: (...values) => R): ViewMergeDefinition;
}
```

### ActionFactory

```typescript
interface ActionFactory<M, V> {
    api: ActionApiFactory<M, V>;
    handle<R>(callback: (context) => Promise<R>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, void>;
}
```

### ActionApiFactory

```typescript
interface ActionApiFactory<M, V> {
    (definition: ActionApiDefinition<V>): ActionApiChain<M, V, unknown>;
    get(definition): ActionApiChain;
    head(definition): ActionApiChain;
    post(definition): ActionApiChain;
    put(definition): ActionApiChain;
    patch(definition): ActionApiChain;
    delete(definition): ActionApiChain;
}
```

## Example

```typescript
import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});

type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
    view({ from }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
        };
    },
    action({ api, commit }) {
        return {
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
            get: api
                .get({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.SET),
            create: api
                .post({
                    url: "/users",
                })
                .commit("list", ActionManyMode.ADD),
            clear: commit("list", ActionManyMode.RESET),
        };
    },
});
```

## See Also

- [shape](shape.md) - Define data shapes
- [Types](types.md) - Complete type reference
