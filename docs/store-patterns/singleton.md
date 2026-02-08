# Singleton Store

Single entity management for configuration, settings, or current user.

## Store

```typescript
import { createStore, shape, ModelOneMode, type ShapeInfer } from "@diphyx/harlemify";

const configShape = shape((factory) => ({
    theme: factory.enum(["light", "dark"]),
    language: factory.string(),
    notifications: factory.boolean(),
}));

type Config = ShapeInfer<typeof configShape>;

export const configStore = createStore({
    name: "config",
    model({ one }) {
        return { config: one(configShape) };
    },
    view({ from }) {
        return {
            config: from("config"),
            theme: from("config", (model) => model?.theme ?? "dark"),
            language: from("config", (model) => model?.language ?? "en"),
            notifications: from("config", (model) => model?.notifications ?? true),
        };
    },
    action({ api }) {
        return {
            get: api.get({ url: "/config" }, { model: "config", mode: ModelOneMode.SET }),
            update: api.patch({ url: "/config" }, { model: "config", mode: ModelOneMode.PATCH }),
        };
    },
});
```

## Component Usage

```vue
<script setup lang="ts">
import { configStore } from "~/stores/config";

const { view, action } = configStore;

await action.get();

async function toggleTheme() {
    const newTheme = view.theme.value === "dark" ? "light" : "dark";
    await action.update({ body: { theme: newTheme } });
}
</script>

<template>
    <div v-if="action.get.loading.value">Loading...</div>

    <div v-else-if="view.config.value">
        <p>Theme: {{ view.theme.value }}</p>
        <button @click="toggleTheme">Toggle Theme</button>
        <span v-if="action.update.loading.value">Saving...</span>
    </div>
</template>
```

## Clear Singleton

```typescript
configStore.model.config.reset();
```

## Next Steps

- [Collection Store](collection.md) - List management
- [Nested Store](nested.md) - Complex objects
