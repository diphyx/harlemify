import type { z } from "zod";
import type { EndpointDefinition, EndpointMethod } from "./endpoint";

export interface SchemaMeta {
    indicator?: boolean;
    methods?: EndpointMethod[];
}

export function getMeta(field: any): SchemaMeta | undefined {
    return (field as z.ZodType).meta() as any;
}

export interface ResolveSchemaOptions<S> {
    indicator?: keyof S;
    endpoint?: EndpointDefinition<Partial<S>>;
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

    for (const key of Object.keys(schema.shape)) {
        const meta = getMeta(schema.shape[key]);

        if (meta?.indicator) {
            output.indicator = key as keyof S;
        }

        if (!options?.endpoint?.method || !meta?.methods) {
            continue;
        }

        if (meta?.methods.includes(options.endpoint.method)) {
            output.keys[key as keyof S] = true;

            if (options?.unit && key in options.unit) {
                (output.values as any)[key] = (options.unit as any)[key];
            }
        }
    }

    return output;
}
