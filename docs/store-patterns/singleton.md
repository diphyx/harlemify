# Singleton Store

Use singleton stores for single entities like configuration, settings, or the current user.

## When to Use

- Application configuration
- User settings/preferences
- Current authenticated user
- Any data with only one instance

## Shape

```typescript
import { shape, type ShapeInfer } from "@diphyx/harlemify";

const configShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        theme: factory.enum(["light", "dark"]),
        language: factory.string(),
        notifications: factory.boolean(),
    };
});

type Config = ShapeInfer<typeof configShape>;
```

## Store

```typescript
import { createStore, ActionOneMode } from "@diphyx/harlemify";

export const configStore = createStore({
    name: "config",
    model({ one }) {
        return {
            config: one(configShape),
        };
    },
    view({ from }) {
        return {
            config: from("config"),
            theme: from("config", (model) => {
                return model?.theme ?? "dark";
            }),
            language: from("config", (model) => {
                return model?.language ?? "en";
            }),
            notifications: from("config", (model) => {
                return model?.notifications ?? true;
            }),
        };
    },
    action({ api }) {
        return {
            get: api.get({ url: "/config" }).commit("config", ActionOneMode.SET),
            update: api.patch({ url: "/config" }).commit("config", ActionOneMode.PATCH),
        };
    },
});
```

## Mutation Operations

| Action | Commit Mode           | Effect                    |
| ------ | --------------------- | ------------------------- |
| Get    | `ActionOneMode.SET`   | Set the entire value      |
| Update | `ActionOneMode.PATCH` | Merge into existing value |

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

async function changeLanguage(lang: string) {
    await action.update({ body: { language: lang } });
}

async function toggleNotifications() {
    await action.update({ body: { notifications: !view.notifications.value } });
}
</script>

<template>
    <div v-if="action.get.loading.value">Loading...</div>

    <div v-else-if="view.config.value">
        <div>
            <label>Theme: {{ view.theme.value }}</label>
            <button @click="toggleTheme">Toggle</button>
        </div>

        <div>
            <label>Language:</label>
            <select :value="view.language.value" @change="changeLanguage(($event.target as HTMLSelectElement).value)">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </select>
        </div>

        <div>
            <label>
                <input type="checkbox" :checked="view.notifications.value" @change="toggleNotifications" />
                Enable Notifications
            </label>
        </div>

        <span v-if="action.update.loading.value">Saving...</span>
    </div>
</template>
```

## Current User Pattern

```typescript
const meShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
        avatar: factory.string(),
    };
});

export const meStore = createStore({
    name: "me",
    model({ one }) {
        return {
            user: one(meShape),
        };
    },
    view({ from }) {
        return {
            me: from("user"),
            name: from("user", (model) => {
                return model?.name ?? "Guest";
            }),
            isLoggedIn: from("user", (model) => {
                return model !== null;
            }),
        };
    },
    action({ api, commit }) {
        return {
            get: api.get({ url: "/me" }).commit("user", ActionOneMode.SET),
            update: api.patch({ url: "/me" }).commit("user", ActionOneMode.PATCH),
            logout: commit("user", ActionOneMode.RESET),
        };
    },
});
```

## Clear Singleton

Use the model committer or a commit-only action to clear state:

```typescript
// Via commit-only action
await meStore.action.logout();

// Via model committer
meStore.model("user", ActionOneMode.RESET);
```

## Next Steps

- [Collection Store](collection.md) - List management
- [Nested Store](nested.md) - Complex objects
