# View

Views are reactive computed properties derived from model state. They are Vue `ComputedRef` values that automatically update when the underlying model changes.

## View Factory

The view factory is destructured from the first parameter of the `view` function:

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        users: from("list"),
    };
},
```

## from (Single Source)

`from(source)` creates a direct view that mirrors a single model's state:

```typescript
view({ from }) {
    return {
        user: from("current"),     // ComputedRef<User | null>
        users: from("list"),       // ComputedRef<User[]>
    };
},
```

### from with Resolver

Add a resolver function to transform the data:

```typescript
view({ from }) {
    return {
        userName: from("current", (model) => {
            return model?.name ?? "unknown";
        }),
        // ComputedRef<string>

        count: from("list", (model) => {
            return model.length;
        }),
        // ComputedRef<number>

        emails: from("list", (model) => {
            return model.map((u) => u.email);
        }),
        // ComputedRef<string[]>

        isActive: from("current", (model) => {
            return model?.active ?? false;
        }),
        // ComputedRef<boolean>
    };
},
```

## merge (Multiple Sources)

`merge(sources, resolver)` combines multiple model sources into a single computed value:

```typescript
view({ from, merge }) {
    return {
        summary: merge(["current", "list"], (current, list) => {
            return {
                selected: current?.name ?? null,
                total: list.length,
                emails: list.map((u) => u.email),
            };
        }),
        // ComputedRef<{ selected: string | null; total: number; emails: string[] }>
    };
},
```

The resolver receives the model values in the same order as the sources array.

## Accessing Views

Views are accessed via `store.view` and are `ComputedRef` values:

```typescript
const { view } = userStore;

// Read values
view.user.value           // User | null
view.users.value          // User[]
view.userName.value       // string
view.count.value          // number
view.summary.value        // { selected: string | null; total: number; ... }
```

## Using Views in Templates

```vue
<template>
    <div>
        <p>Selected: {{ view.userName.value }}</p>
        <p>Total: {{ view.count.value }}</p>

        <ul>
            <li v-for="user in view.users.value" :key="user.id">
                {{ user.name }}
            </li>
        </ul>
    </div>
</template>
```

## Views in Actions

Views are available inside action handlers as readonly values:

```typescript
action({ api, handle }) {
    return {
        sort: handle(async ({ view, commit }) => {
            const sorted = [...view.users.value].sort((a, b) => {
                return a.name.localeCompare(b.name);
            });
            commit("list", ActionManyMode.SET, sorted);
        }),
    };
},
```

## Dynamic URLs from Views

Action API definitions can reference views to build dynamic URLs:

```typescript
action({ api }) {
    return {
        get: api
            .get({
                url(view) {
                    return `/users/${view.user.value?.id}`;
                },
            })
            .commit("current", ActionOneMode.SET),
    };
},
```

## Next Steps

- [Action](action.md) - Define async operations
- [Store Patterns](../store-patterns/README.md) - See complete store examples
