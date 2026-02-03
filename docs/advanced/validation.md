# Validation

Validate data with Zod before sending requests.

## Enable Validation

Pass `validate: true` in action options:

```typescript
await createUser(
    { id: 0, name: "John", email: "john@test.com" },
    { validate: true }
);
```

## How It Works

1. Harlemify validates the data against your Zod schema
2. If validation fails, a `ZodError` is thrown **before** the request
3. If validation passes, the request proceeds normally

## Error Handling

```typescript
import { ZodError } from "zod";

async function handleSubmit(data: UserInput) {
    try {
        await createUser(data, { validate: true });
    } catch (error) {
        if (error instanceof ZodError) {
            // Validation failed
            const issues = error.issues;
            issues.forEach((issue) => {
                console.log(`${issue.path.join(".")}: ${issue.message}`);
            });
        } else {
            // Network or other error
            throw error;
        }
    }
}
```

## Form Integration

```vue
<script setup lang="ts">
import { ZodError } from "zod";

const { createUser } = useStoreAlias(userStore);

const form = reactive({ name: "", email: "" });
const errors = ref<Record<string, string>>({});

async function submit() {
    errors.value = {};

    try {
        await createUser(
            { id: 0, ...form },
            { validate: true }
        );
    } catch (error) {
        if (error instanceof ZodError) {
            error.issues.forEach((issue) => {
                const field = issue.path[0] as string;
                errors.value[field] = issue.message;
            });
        }
    }
}
</script>

<template>
    <form @submit.prevent="submit">
        <div>
            <input v-model="form.name" placeholder="Name" />
            <span v-if="errors.name">{{ errors.name }}</span>
        </div>

        <div>
            <input v-model="form.email" placeholder="Email" />
            <span v-if="errors.email">{{ errors.email }}</span>
        </div>

        <button type="submit">Create</button>
    </form>
</template>
```

## Schema with Validation Rules

Define validation rules in your schema:

```typescript
const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z
        .string()
        .min(2, "Name must be at least 2 characters")
        .max(50, "Name must be less than 50 characters")
        .meta({ actions: [UserAction.CREATE, UserAction.UPDATE] }),
    email: z
        .string()
        .email("Invalid email address")
        .meta({ actions: [UserAction.CREATE] }),
    age: z
        .number()
        .min(0, "Age must be positive")
        .max(150, "Age must be realistic")
        .optional()
        .meta({ actions: [UserAction.CREATE, UserAction.UPDATE] }),
});
```

## When to Use

**Use validation when:**
- Processing user input
- Data comes from untrusted sources
- You want to catch errors before network requests

**Skip validation when:**
- Data is already validated elsewhere
- Updating with known-good data from the server
- Performance is critical
