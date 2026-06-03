# Installation

## Install Package

Install harlemify together with `zod`, which is a peer dependency (used by `shape()`):

```bash
# npm
npm install @diphyx/harlemify zod

# pnpm
pnpm add @diphyx/harlemify zod

# yarn
yarn add @diphyx/harlemify zod
```

> `zod` must come from your project, not from harlemify. Most non-trivial apps already use zod for forms/validation, and having two copies in the bundle causes `instanceof` checks to fail silently across boundaries.

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

See **[Configuration](configuration.md)** for the full list of module options (`action.*`, `model.identifier`, `view.clone`, `logger`).

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
