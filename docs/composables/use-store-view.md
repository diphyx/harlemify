# useStoreView

Returns reactive view data as a `ComputedRef` (optionally transformed by a resolver) and a `track` method for watching changes.

## Basic Usage

```typescript
const { data, track } = useStoreView(userStore, "user");

data.value; // User — standard ComputedRef access
data.value.name; // string
data.value.email; // string
```

In templates, Vue auto-unwraps the `ComputedRef`, so `.value` is not needed:

```vue
<template>
    <p>{{ data.name }}</p>
    <p>{{ data.email }}</p>
</template>
```

## Resolver Argument

Pass an optional resolver as the last argument to transform the view value — `data` then becomes the resolved result (mirrors the store-side `from(model, resolver)`):

```typescript
const { data } = useStoreView(userStore, "users", (users) => users.filter((u) => u.active));
// data: ComputedRef<User[]> — already filtered

const { data: name } = useStoreView(userStore, "user", (user) => user.name);
// data: ComputedRef<string>
```

`data` stays reactive and recomputes on every view change, and `track` operates on the resolved value. Any other reactive value read inside the resolver (a `ref`, a prop) is tracked automatically by Vue:

```typescript
const query = ref("");
const { data } = useStoreView(userStore, "users", (users) => users.filter((u) => u.name.includes(query.value)));
// recomputes when the view OR `query` changes
```

For multiple shapes of the same view, call `useStoreView` once per shape. Prefer a store-side view (`from`/`merge`) when the derivation is shared across components.

> Use the resolver for derived **values**; use `track` for **side-effects**.

## Track

Watch for view changes with an optional stop handle:

```typescript
const { track } = useStoreView(userStore, "user");

const stop = track((value) => {
    console.log("User changed:", value);
});

// Later: stop watching
stop();
```

### Track Options

```typescript
const stop = track(handler, {
    immediate: true, // Fire immediately with current value
    deep: true, // Deep watch nested changes
    debounce: 300, // Debounce handler calls
    throttle: 500, // Throttle handler calls
});
```

| Option      | Type      | Default | Description                                 |
| ----------- | --------- | ------- | ------------------------------------------- |
| `immediate` | `boolean` | `false` | Fire handler immediately with current value |
| `deep`      | `boolean` | `false` | Deep watch for nested property changes      |
| `debounce`  | `number`  | —       | Debounce handler in milliseconds            |
| `throttle`  | `number`  | —       | Throttle handler in milliseconds            |

## Component Example

```vue
<script setup lang="ts">
const { data: userData, track: trackUser } = useStoreView(userStore, "user");
const { data: usersData } = useStoreView(userStore, "users");

const log = ref<string[]>([]);

onMounted(() => {
    trackUser((value) => {
        log.value.push(`Changed to: ${value.name}`);
    });
});
</script>

<template>
    <h2>{{ userData.name }}</h2>
    <p>{{ userData.email }}</p>
    <ul>
        <li v-for="user in usersData" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Return Type

```typescript
// without resolver: T is the view value; with resolver: T is the resolved result
function useStoreView(store, key): UseStoreView<T>;
function useStoreView(store, key, resolver: (value: T) => R): UseStoreView<R>;

type UseStoreView<T> = {
    data: ComputedRef<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};
```

## Next Steps

- [useStoreAction](use-store-action.md) — Reactive action execution
- [useStoreModel](use-store-model.md) — Reactive model mutations
