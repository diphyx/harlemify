import type { z } from "zod";

export type ShapeDefinition = z.ZodObject<z.ZodRawShape>;

export type ShapeInfer<T extends z.ZodObject<any>> = z.infer<T>;

export type Shape = Record<string, unknown>;

export interface ShapeMeta {
    identifier?: string;
    defaults: Record<string, unknown>;
    fields: string[];
}
