# useStoreView

Returns reactive view data as a `ComputedRef` with a `track` method for watching changes.

## Basic Usage

```typescript
const { data, track } = useStoreView(userStore, "user");

data.value; // User — standard ComputedRef access
data.value.name; // string
data.value.email; // string
```

In templates, Vue auto-unwraps the `ComputedRef`:

```vue
<template>
    <p>{{ data.name }}</p>
    <p>{{ data.email }}</p>
</template>
```

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
type UseStoreView<T> = {
    data: ComputedRef<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};
```

## Next Steps

- [useStoreAction](use-store-action.md) — Reactive action execution
- [useStoreModel](use-store-model.md) — Reactive model mutations
