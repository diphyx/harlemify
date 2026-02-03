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
        api: {
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
            },
        },
    },
});
```

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `api.adapter.baseURL` | `string` | Base URL for all API requests |
| `api.adapter.timeout` | `number` | Request timeout in milliseconds |
| `api.adapter.retry` | `number` | Number of retry attempts |
| `api.headers` | `object` | Global headers for all requests |
| `api.query` | `object` | Global query parameters |

## Next Step

Now you're ready to create your first store.

[Your First Store →](first-store.md)
