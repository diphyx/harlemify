import { z } from "zod";

import type { ShapeFactory, ShapeRawDefinition } from "../types/shape";
import { createShape } from "../utils/shape";

export const primitiveField = {
    string: z.string,
    number: z.number,
    boolean: z.boolean,
    bigint: z.bigint,
    date: z.date,
};

export const structureField = {
    object: z.object,
    array: z.array,
    tuple: z.tuple,
    record: z.record,
    map: z.map,
    set: z.set,
    enum: z.enum,
    union: z.union,
    literal: z.literal,
};

export const formatField = {
    email: z.email,
    url: z.url,
    uuid: z.uuid,
    cuid: z.cuid,
    cuid2: z.cuid2,
    ulid: z.ulid,
    nanoid: z.nanoid,
    jwt: z.jwt,
    emoji: z.emoji,
    ipv4: z.ipv4,
    ipv6: z.ipv6,
    mac: z.mac,
    base64: z.base64,
    base64url: z.base64url,
    hex: z.hex,
};

export const specialField = {
    any: z.any,
    unknown: z.unknown,
    never: z.never,
    nullable: z.nullable,
    optional: z.optional,
};

export function shape<T extends ShapeRawDefinition>(definition: T | ((factory: ShapeFactory) => T)) {
    if (typeof definition === "function") {
        return createShape(
            definition({
                ...primitiveField,
                ...structureField,
                ...formatField,
                ...specialField,
            }),
        );
    }

    return createShape(definition);
}
