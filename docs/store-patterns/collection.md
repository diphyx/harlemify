# Collection Store

Use collection stores for managing lists of items with CRUD operations.

## When to Use

- User lists, product catalogs, blog posts
- Data with Create, Read, Update, Delete operations
- Items identified by a unique ID

## Schema

```typescript
import { z } from "zod";

enum ProductAction {
    LIST = "list",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete",
}

const productSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: [ProductAction.CREATE, ProductAction.UPDATE],
    }),
    price: z.number().meta({
        actions: [ProductAction.CREATE, ProductAction.UPDATE],
    }),
    stock: z.number(),
});

export type Product = z.infer<typeof productSchema>;
```

## Actions

```typescript
const productActions = {
    [ProductAction.LIST]: {
        endpoint: Endpoint.get("/products"),
        memory: Memory.units(),
    },
    [ProductAction.CREATE]: {
        endpoint: Endpoint.post("/products"),
        memory: Memory.units().add(),
    },
    [ProductAction.UPDATE]: {
        endpoint: Endpoint.patch<Product>((p) => `/products/${p.id}`),
        memory: Memory.units().edit(),
    },
    [ProductAction.DELETE]: {
        endpoint: Endpoint.delete<Product>((p) => `/products/${p.id}`),
        memory: Memory.units().drop(),
    },
};

export const productStore = createStore("product", productSchema, productActions);
```

## Memory Operations

| Action | Memory | Effect |
|--------|--------|--------|
| List | `Memory.units()` | Replace entire array |
| Create | `Memory.units().add()` | Append new item |
| Update | `Memory.units().edit()` | Update item by indicator |
| Delete | `Memory.units().drop()` | Remove item by indicator |

## Component Usage

```vue
<script setup lang="ts">
import { productStore } from "~/stores/product";

const {
    products,
    listProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    productMonitor,
} = useStoreAlias(productStore);

await listProduct();

async function addProduct() {
    await createProduct({
        id: 0,
        name: "New Product",
        price: 99.99,
    });
}

async function updatePrice(id: number, newPrice: number) {
    await updateProduct({ id, price: newPrice });
}

async function removeProduct(id: number) {
    await deleteProduct({ id });
}
</script>

<template>
    <div>
        <button @click="addProduct" :disabled="productMonitor.create.pending()">
            Add Product
        </button>

        <div v-if="productMonitor.list.pending()">Loading...</div>

        <table v-else>
            <tr v-for="product in products" :key="product.id">
                <td>{{ product.name }}</td>
                <td>${{ product.price }}</td>
                <td>
                    <button @click="updatePrice(product.id, product.price + 10)">
                        +$10
                    </button>
                    <button @click="removeProduct(product.id)">
                        Delete
                    </button>
                </td>
            </tr>
        </table>
    </div>
</template>
```

## Prepend New Items

Add new items to the beginning of the list:

```typescript
const postActions = {
    create: {
        endpoint: Endpoint.post("/posts"),
        memory: Memory.units().add({ prepend: true }),  // Prepend
    },
};
```

## Pagination

Handle paginated lists by appending:

```typescript
const productActions = {
    list: {
        endpoint: Endpoint.get("/products"),
        memory: Memory.units(),           // Replace for first page
    },
    loadMore: {
        endpoint: Endpoint.get("/products"),
        memory: Memory.units().add(),     // Append for subsequent pages
    },
};
```

```typescript
// First page
await listProduct({ query: { page: 1 } });

// Load more
await loadMoreProduct({ query: { page: 2 } });
```

## Next Steps

- [Singleton Store](singleton.md) - Single entity pattern
- [Nested Schema](nested.md) - Complex objects
