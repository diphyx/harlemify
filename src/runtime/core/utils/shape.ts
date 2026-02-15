import { defu } from "defu";
import { z } from "zod";

import type {
    ShapeCall,
    ShapeDefinition,
    ShapeFieldDefinition,
    ShapeInfer,
    ShapeRawDefinition,
    ShapeType,
    ZodFieldDefinition,
} from "../types/shape";
import { isPlainObject, isEmptyRecord } from "./base";

// Internal utils

function resolveShapeFields(shape: ShapeType<unknown>): Record<string, unknown> | undefined {
    if (!("shape" in shape) || typeof shape.shape !== "object" || !shape.shape) {
        return undefined;
    }

    return shape.shape as Record<string, unknown>;
}

function resolveFieldMeta(field: unknown): ShapeFieldDefinition["meta"] | undefined {
    return (field as { meta?: () => ShapeFieldDefinition["meta"] | undefined })?.meta?.();
}

// Zero-value resolvers

function resolveZeroValue(field: ShapeType<unknown>): unknown {
    const definition = (field as ShapeType<unknown> & { def?: ZodFieldDefinition }).def;

    if (!definition?.type) {
        return undefined;
    }

    switch (definition.type) {
        case "string": {
            return "";
        }
        case "number": {
            return 0;
        }
        case "boolean": {
            return false;
        }
        case "bigint": {
            return BigInt(0);
        }
        case "date": {
            return new Date(0);
        }
        case "array": {
            return [];
        }
        case "record": {
            return {};
        }
        case "map": {
            return new Map();
        }
        case "set": {
            return new Set();
        }
        case "object": {
            const output: Record<string, unknown> = {};

            if (definition.shape) {
                for (const [key, value] of Object.entries(definition.shape)) {
                    output[key] = resolveZeroValue(value);
                }
            }

            return output;
        }
        case "enum": {
            if (definition.entries) {
                return Object.values(definition.entries)[0];
            }

            return undefined;
        }
        case "literal": {
            if (definition.values) {
                return definition.values[0];
            }

            return undefined;
        }
        case "tuple": {
            if (definition.items) {
                return definition.items.map(resolveZeroValue);
            }

            return [];
        }
        case "union": {
            if (definition.options?.[0]) {
                return resolveZeroValue(definition.options[0]);
            }

            return undefined;
        }
        case "default": {
            if (typeof definition.defaultValue === "function") {
                return definition.defaultValue();
            }

            return definition.defaultValue;
        }
        case "optional":
        case "nullable": {
            if (definition.innerType) {
                return resolveZeroValue(definition.innerType);
            }

            return undefined;
        }
        default: {
            return undefined;
        }
    }
}

// Alias resolvers

function resolveAliasObject(data: Record<string, unknown>, mapping: Record<string, string>): Record<string, unknown> {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
        output[mapping[key] ?? key] = value;
    }

    return output;
}

export function resolveAliasInbound<T = unknown>(data: T, aliases?: Record<string, string>): T {
    if (isEmptyRecord(aliases)) {
        return data;
    }

    const reverse: Record<string, string> = {};
    for (const [shapeKey, aliasKey] of Object.entries(aliases)) {
        reverse[aliasKey] = shapeKey;
    }

    if (Array.isArray(data)) {
        return data.map((item) => {
            if (isPlainObject(item)) {
                return resolveAliasObject(item, reverse);
            }

            return item;
        }) as T;
    }

    if (isPlainObject(data)) {
        return resolveAliasObject(data, reverse) as T;
    }

    return data;
}

export function resolveAliasOutbound<T = unknown>(data: T, aliases?: Record<string, string>): T {
    if (isEmptyRecord(aliases)) {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map((item) => {
            if (isPlainObject(item)) {
                return resolveAliasObject(item, aliases);
            }

            return item;
        }) as T;
    }

    if (isPlainObject(data)) {
        return resolveAliasObject(data, aliases) as T;
    }

    return data;
}

// Shape resolvers

export function resolveShapeIdentifier(shape: ShapeType<unknown>, ...overrides: (string | undefined)[]): string {
    for (const key of overrides) {
        if (key) {
            return key;
        }
    }

    const fields = resolveShapeFields(shape);
    if (!fields) {
        return "id";
    }

    for (const [key, field] of Object.entries(fields)) {
        const meta = resolveFieldMeta(field);
        if (meta?.identifier) {
            return key;
        }
    }

    return "id";
}

export function resolveShapeAliases(shape: ShapeType<unknown>): Record<string, string> {
    const output: Record<string, string> = {};

    const fields = resolveShapeFields(shape);
    if (!fields) {
        return output;
    }

    for (const [key, field] of Object.entries(fields)) {
        const meta = resolveFieldMeta(field);
        if (meta?.alias) {
            output[key] = meta.alias as string;
        }
    }

    return output;
}

export function resolveZeroValues<T extends ShapeDefinition>(shape: T): ShapeInfer<T> {
    const output: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(shape.shape)) {
        output[key] = resolveZeroValue(field as ShapeType<unknown>);
    }

    return output as ShapeInfer<T>;
}

// Create shape

export function createShape<T extends ShapeRawDefinition>(definition: T): ShapeCall<T> {
    const object = z.object(definition);

    const shape = Object.assign(object, {
        defaults(overrides?: Partial<ShapeInfer<typeof object>>) {
            const zero = resolveZeroValues(object);

            if (overrides) {
                return defu(overrides, zero) as ShapeInfer<typeof object>;
            }

            return zero;
        },
    });

    return shape;
}
