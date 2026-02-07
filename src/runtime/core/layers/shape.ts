import { z } from "zod";

export function shape<T extends z.ZodRawShape>(definition: T): z.ZodObject<T> {
    return z.object(definition);
}
