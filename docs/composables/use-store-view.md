# useStoreView

Returns reactive view data with proxy access and a `track` method for watching changes.

## Basic Usage

```typescript
const { data, track } = useStoreView(userStore, "user");

data.value; // User — standard ref access
data.name; // string — proxy access without .value
data.email; // string — proxy access without .value
```

## Data Proxy

The `data` object is a proxy that supports both `.value` for the full ref value and direct property access:

```typescript
const { data } = useStoreView(userStore, "user");

// Standard access
data.value; // User

// Proxy access — reads from the current .value
data.name; // equivalent to data.value.name
data.email; // equivalent to data.value.email
```

This is useful in templates where you want to avoid repeated `.value` checks:

```vue
<template>
    <p>{{ data.name }}</p>
    <p>{{ data.email }}</p>
</template>
```

## Without Proxy

Pass `proxy: false` to get a standard Vue `ComputedRef` instead:

```typescript
const { data } = useStoreView(userStore, "user", { proxy: false });

data.value; // User — standard ComputedRef
data.value.name; // access via .value in script
```

In templates, Vue auto-unwraps the `ComputedRef`, so `.value` is not needed:

```vue
<template>
    <p>{{ data.name }}</p>
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
        <li v-for="user in usersData.value" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Options

| Option  | Type      | Default | Description                                                             |
| ------- | --------- | ------- | ----------------------------------------------------------------------- |
| `proxy` | `boolean` | `true`  | When `true`, returns a proxy. When `false`, returns a raw `ComputedRef` |

## Return Type

### With Proxy (default)

```typescript
type UseStoreViewProxy<T> = {
    data: { value: T } & { [K in keyof T]: T[K] };
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};
```

### Without Proxy

```typescript
type UseStoreViewComputed<T> = {
    data: ComputedRef<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};
```

## Next Steps

- [useStoreAction](use-store-action.md) — Reactive action execution
- [useStoreModel](use-store-model.md) — Reactive model mutations
