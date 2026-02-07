import type { z } from "zod";

export type ShapeDefinition = z.ZodObject<z.ZodRawShape>;

export type ShapeType<S> = z.ZodType<S>;

export type ShapeInfer<T extends z.ZodType<any>> = z.infer<T>;

export type Shape = Record<string, unknown>;

export interface ShapeMeta {
    identifier?: string;
    defaults: Record<string, unknown>;
    fields: string[];
}
