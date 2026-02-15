# Installation

## Install Package

```bash
# npm
npm install @diphyx/harlemify

# pnpm
pnpm add @diphyx/harlemify

# yarn
yarn add @diphyx/harlemify
```

## Configure Nuxt

Add harlemify to your Nuxt config:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        action: {
            endpoint: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

## Configuration Options

| Option              | Type                      | Description                                          |
| ------------------- | ------------------------- | ---------------------------------------------------- |
| `action.endpoint`   | `string`                  | Base endpoint URL prepended to all action API URLs   |
| `action.headers`    | `Record<string, string>`  | Default headers for all API requests                 |
| `action.query`      | `Record<string, unknown>` | Default query parameters for all API requests        |
| `action.timeout`    | `number`                  | Request timeout in milliseconds                      |
| `action.concurrent` | `ActionConcurrent`        | Default concurrency strategy for all actions         |
| `model.identifier`  | `string`                  | Default identifier field for array mutations         |
| `view.clone`        | `ViewClone`               | Default clone strategy for all views                 |
| `logger`            | `number`                  | Consola log level (`-999` = silent, `999` = verbose) |

## Auto-Imports

Harlemify automatically imports the following in your Nuxt project:

- `createStore`
- `useStoreAction`
- `useStoreModel`
- `useStoreView`
- `useStoreCompose`
- `useIsolatedActionStatus`
- `useIsolatedActionError`

Types and enums must be imported manually:

```typescript
import { shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify/runtime";
```

## Next Step

Now you're ready to create your first store.

[Your First Store →](first-store.md)
