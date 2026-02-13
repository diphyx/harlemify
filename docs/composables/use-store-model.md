# useStoreModel

Returns typed mutation methods for a store model. Supports both `one` and `many` models, with optional debounce and throttle.

## One Model

```typescript
import { useStoreModel } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const { set, patch, reset } = useStoreModel(userStore, "current");

set({ id: 1, name: "Alice", email: "alice@test.com" });
patch({ name: "Updated" });
reset();
```

## Many Model

Many models include `add` and `remove` in addition to `set`, `patch`, and `reset`:

```typescript
const { set, add, remove, patch, reset } = useStoreModel(userStore, "list");

set(usersArray);
add(newUser);
remove(existingUser);
patch({ id: 1, name: "Updated" });
reset();
```

## Renaming with Destructuring

Use standard JS destructuring to rename and avoid conflicts:

```typescript
const { set: setCurrent, patch: patchCurrent } = useStoreModel(userStore, "current");
const { set: setList, add: addToList } = useStoreModel(userStore, "list");
```

## Debounce

Delays all mutations by the specified milliseconds. Useful for input-driven updates:

```typescript
const model = useStoreModel(userStore, "current", { debounce: 300 });

// Each call resets the timer — only the last call within 300ms executes
model.set(value1); // Cancelled
model.set(value2); // Cancelled
model.set(value3); // Executes after 300ms
```

## Throttle

Limits mutations to at most once per interval. The first call executes immediately:

```typescript
const model = useStoreModel(userStore, "current", { throttle: 500 });

model.set(value1); // Executes immediately
model.set(value2); // Ignored (within 500ms window)
// After 500ms...
model.set(value3); // Executes
```

## Component Example

```vue
<script setup lang="ts">
import { useStoreModel } from "@diphyx/harlemify";
import { userStore } from "~/stores/user";

const { set: setCurrent, patch: patchCurrent, reset: resetCurrent } = useStoreModel(userStore, "current");
const { add: addToList, remove: removeFromList } = useStoreModel(userStore, "list");

// Debounced for search input
const searchModel = useStoreModel(userStore, "current", { debounce: 300 });
</script>

<template>
    <div>
        <button @click="setCurrent({ id: 1, name: 'Alice', email: 'a@b.c' })">Select</button>
        <button @click="patchCurrent({ name: 'Updated' })">Patch</button>
        <button @click="resetCurrent()">Clear</button>
    </div>
</template>
```

## Options

| Option     | Type     | Default | Description                       |
| ---------- | -------- | ------- | --------------------------------- |
| `debounce` | `number` | —       | Debounce delay in milliseconds    |
| `throttle` | `number` | —       | Throttle interval in milliseconds |

## Silent Option

All mutation methods accept a `silent` option to skip pre/post hooks. This works transparently through `useStoreModel`:

```typescript
import { ModelSilent } from "@diphyx/harlemify";

const { set, reset, patch } = useStoreModel(userStore, "current");

set(value, { silent: true });           // Skip both hooks
reset({ silent: ModelSilent.PRE });     // Skip only pre hook
patch({ name: "Updated" }, { silent: ModelSilent.POST }); // Skip only post hook
```

```typescript
const { add, remove, reset } = useStoreModel(userStore, "list");

add(user, { silent: true });
remove({ id: 1 }, { silent: ModelSilent.POST });
reset({ silent: true });
```

## Return Type

### One Model

```typescript
type UseStoreModelOne = {
    set: (value, options?) => void;
    patch: (value, options?) => void;
    reset: (options?) => void;
};
```

### Many Model

```typescript
type UseStoreModelMany = {
    set: (value, options?) => void;
    patch: (value, options?) => void;
    reset: (options?) => void;
    add: (value, options?) => void;
    remove: (value, options?) => void;
};
```

## Next Steps

- [useStoreView](use-store-view.md) - Reactive view data and tracking
- [useStoreAction](use-store-action.md) - Reactive action execution
