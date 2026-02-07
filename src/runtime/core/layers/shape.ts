import { z, ZodObject } from "zod";

export { ZodObject };

export type Field = typeof field;

export const field = {
    string: z.string,
    number: z.number,
    boolean: z.boolean,
    array: z.array,
    object: z.object,
    enum: z.enum,
    date: z.date,
    union: z.union,
};

export function shape<T extends z.ZodRawShape>(definition: T | ((field: Field) => T)): z.ZodObject<T> {
    if (typeof definition === "function") {
        return z.object(definition(field));
    }

    return z.object(definition);
}
