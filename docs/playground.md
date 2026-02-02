# Playground

A fully functional Nuxt 3 application demonstrating harlemify features.

## Running

```bash
# Clone the repository
git clone https://github.com/diphyx/harlemify.git
cd harlemify

# Install dependencies
npm install

# Start the playground
npm run dev
```

The playground will be available at `http://localhost:3000`.

## Stores

```
playground/stores/
├── user.ts     # Collection store with custom adapter demo
├── post.ts     # Collection store (*_UNITS endpoints)
└── config.ts   # Singleton store (*_UNIT endpoints)
```

## Features Demonstrated

- **Collection stores**: `user.ts`, `post.ts` - list operations with `*Units` endpoints
- **Singleton store**: `config.ts` - single data with `*Unit` endpoints
- **Custom adapters**: `user.ts` - endpoint-level and store-level adapters
- **Temporary state**: Using `unit` + `memory` mutations for modal selection
- **Loading states**: Using `monitor` for pending/success/failed states
- **CRUD operations**: Create, read, update, delete with type-safe URLs
