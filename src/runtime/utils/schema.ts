import type { z } from "zod";

export interface SchemaMeta<A extends string = string> {
    indicator?: boolean;
    actions?: A[];
}

export function getMeta(field: any): SchemaMeta | undefined {
    return (field as z.ZodType).meta() as any;
}

export interface SchemaFieldInfo<A extends string = string> {
    name: string;
    indicator: boolean;
    actions: A[];
}

const schemaFieldsCache = new WeakMap<z.ZodObject<any>, SchemaFieldInfo<any>[]>();

export function getSchemaFields<T extends z.ZodRawShape, A extends string = string>(
    schema: z.ZodObject<T>,
): SchemaFieldInfo<A>[] {
    const cached = schemaFieldsCache.get(schema);

    if (cached) {
        return cached as SchemaFieldInfo<A>[];
    }

    const fields: SchemaFieldInfo<A>[] = [];

    for (const key in schema.shape) {
        const meta = getMeta(schema.shape[key]);

        fields.push({
            name: key,
            indicator: meta?.indicator ?? false,
            actions: (meta?.actions as A[]) ?? [],
        });
    }

    schemaFieldsCache.set(schema, fields);

    return fields;
}

export function getFieldsForAction<T extends z.ZodRawShape, A extends string = string>(
    schema: z.ZodObject<T>,
    action: A,
): string[] {
    const fields: string[] = [];

    for (const key in schema.shape) {
        const meta = getMeta(schema.shape[key]);

        if (meta?.actions) {
            const actionsSet = new Set(meta.actions);

            if (actionsSet.has(action)) {
                fields.push(key);
            }
        }
    }

    return fields;
}

export interface ResolveSchemaOptions<S> {
    indicator?: keyof S;
    action?: string;
    unit?: Partial<S>;
}

export function resolveSchema<T extends z.ZodRawShape, S extends z.infer<z.ZodObject<T>>>(
    schema: z.ZodObject<T>,
    options?: ResolveSchemaOptions<S>,
) {
    const output = {
        indicator: (options?.indicator ?? "id") as keyof S,
        keys: {} as Record<keyof S, true>,
        values: {} as Partial<S>,
    };

    for (const key in schema.shape) {
        const meta = getMeta(schema.shape[key]);

        if (meta?.indicator) {
            output.indicator = key as keyof S;
        }

        if (!options?.action || !meta?.actions) {
            continue;
        }

        const actionsSet = new Set(meta.actions);

        if (actionsSet.has(options.action)) {
            output.keys[key as keyof S] = true;

            if (options?.unit && key in options.unit) {
                (output.values as any)[key] = (options.unit as any)[key];
            }
        }
    }

    return output;
}
