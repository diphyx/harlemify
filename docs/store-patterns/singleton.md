# Singleton Store

Use singleton stores for single entities like configuration, settings, or the current user.

## When to Use

- Application configuration
- User settings/preferences
- Current authenticated user
- Any data with only one instance

## Schema

```typescript
import { z } from "zod";

enum ConfigAction {
    GET = "get",
    UPDATE = "update",
}

const configSchema = z.object({
    id: z.number().meta({ indicator: true }),
    theme: z.enum(["light", "dark"]).meta({
        actions: [ConfigAction.UPDATE],
    }),
    language: z.string().meta({
        actions: [ConfigAction.UPDATE],
    }),
    notifications: z.boolean().meta({
        actions: [ConfigAction.UPDATE],
    }),
});

export type Config = z.infer<typeof configSchema>;
```

## Actions

```typescript
const configActions = {
    [ConfigAction.GET]: {
        endpoint: Endpoint.get("/config"),
        memory: Memory.unit(),
    },
    [ConfigAction.UPDATE]: {
        endpoint: Endpoint.patch("/config"),
        memory: Memory.unit().edit(),
    },
};

export const configStore = createStore("config", configSchema, configActions);
```

## Memory Operations

| Action | Memory | Effect |
|--------|--------|--------|
| Get | `Memory.unit()` | Set unit state |
| Update | `Memory.unit().edit()` | Merge into unit state |

## Component Usage

```vue
<script setup lang="ts">
import { configStore } from "~/stores/config";

const { config, getConfig, updateConfig, configMonitor } = useStoreAlias(configStore);

await getConfig();

async function toggleTheme() {
    const newTheme = config.value?.theme === "dark" ? "light" : "dark";
    await updateConfig({ id: config.value!.id, theme: newTheme });
}

async function changeLanguage(lang: string) {
    await updateConfig({ id: config.value!.id, language: lang });
}

async function toggleNotifications() {
    await updateConfig({
        id: config.value!.id,
        notifications: !config.value?.notifications,
    });
}
</script>

<template>
    <div v-if="configMonitor.get.pending()">Loading...</div>

    <div v-else-if="config">
        <div>
            <label>Theme: {{ config.theme }}</label>
            <button @click="toggleTheme">Toggle</button>
        </div>

        <div>
            <label>Language:</label>
            <select :value="config.language" @change="changeLanguage($event.target.value)">
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
            </select>
        </div>

        <div>
            <label>
                <input
                    type="checkbox"
                    :checked="config.notifications"
                    @change="toggleNotifications"
                />
                Enable Notifications
            </label>
        </div>

        <span v-if="configMonitor.update.pending()">Saving...</span>
    </div>
</template>
```

## Current User Pattern

```typescript
enum MeAction {
    GET = "get",
    UPDATE = "update",
}

const meSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: [MeAction.UPDATE] }),
    email: z.string(),
    avatar: z.string().meta({ actions: [MeAction.UPDATE] }),
});

const meActions = {
    [MeAction.GET]: {
        endpoint: Endpoint.get("/me"),
        memory: Memory.unit(),
    },
    [MeAction.UPDATE]: {
        endpoint: Endpoint.patch("/me"),
        memory: Memory.unit().edit(),
    },
};

export const meStore = createStore("me", meSchema, meActions);
```

## Clear Singleton

Use memory to clear the unit state (e.g., on logout):

```typescript
const { meMemory } = useStoreAlias(meStore);

function logout() {
    meMemory.set(null);
}
```

## Next Steps

- [Collection Store](collection.md) - List management
- [Nested Schema](nested.md) - Complex objects
