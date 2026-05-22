# Composables

Vue composables for working with store layers in components. Each composable wraps a specific store layer with reactive state and convenience methods.

## [useStoreAction](use-store-action.md)

Reactive action execution with status, loading, error tracking, and optional isolated mode.

```typescript
const { execute, status, loading, error, reset } = useStoreAction(store, "list");
```

## [useStoreModel](use-store-model.md)

Typed mutation methods for `one` and `many` models, with optional debounce and throttle.

```typescript
const { set, patch, reset } = useStoreModel(store, "current");
const { set, add, remove } = useStoreModel(store, "list");
```

## [useStoreView](use-store-view.md)

Reactive view data as a `ComputedRef` with change tracking.

```typescript
const { data, track } = useStoreView(store, "user");

data.value; // User — standard ComputedRef
data.value.name; // string
```

## [useStoreCompose](use-store-compose.md)

Reactive compose execution with `active` tracking and typed arguments.

```typescript
const { execute, active } = useStoreCompose(store, "loadAll");

const quickAdd = useStoreCompose(store, "quickAdd");
await quickAdd.execute("John", "john@example.com"); // typed args
```

## Destructuring

Use standard JS destructuring to rename and avoid conflicts:

```typescript
// Rename to avoid conflicts between multiple composables
const { set: setCurrent } = useStoreModel(store, "current");
const { set: setList } = useStoreModel(store, "list");

// Non-destructured — use via dot access
const currentModel = useStoreModel(store, "current");
const listModel = useStoreModel(store, "list");
currentModel.set(value);
listModel.set(values);
```
