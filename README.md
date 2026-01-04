# Harlemify

API state management for Nuxt powered by [Harlem](https://harlemjs.com/)

## Features

- Zod schema validation with field metadata
- Automatic API client with runtime config
- CRUD operations with endpoint status tracking
- SSR support via Harlem SSR plugin

## Installation

```bash
npm install harlemify
```

## Quick Start

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
        },
    },
});
```

```typescript
// stores/user.ts
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
});

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [Endpoint.POST_UNIT]: {
        action: ApiAction.POST,
        url: "/users",
    },
});
```

## Documentation

Full documentation available at [https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
