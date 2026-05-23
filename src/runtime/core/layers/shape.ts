import { z } from "zod";

import type { ShapeCall, ShapeFactory, ShapeRawDefinition } from "../types/shape";
import { createShape, decorateShape } from "../utils/shape";

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

const factory: ShapeFactory = {
    ...primitiveField,
    ...structureField,
    ...formatField,
    ...specialField,
};

function shapeFn<T extends ShapeRawDefinition>(
    definition: T | z.ZodObject<T> | ((factory: ShapeFactory) => T),
): ShapeCall<T> {
    if (definition instanceof z.ZodObject) {
        return decorateShape(definition);
    }

    if (typeof definition === "function") {
        return createShape(definition(factory));
    }

    return createShape(definition);
}

function shapeExtend<B extends ShapeRawDefinition, E extends ShapeRawDefinition>(
    base: ShapeCall<B>,
    extension: E,
): ShapeCall<B & E> {
    return decorateShape(base.extend(extension)) as unknown as ShapeCall<B & E>;
}

function shapePick<B extends ShapeRawDefinition, M extends { [K in keyof B]?: true }>(
    base: ShapeCall<B>,
    mask: M,
): ShapeCall<Pick<B, Extract<keyof B, keyof M>>> {
    return decorateShape(base.pick(mask as never)) as unknown as ShapeCall<Pick<B, Extract<keyof B, keyof M>>>;
}

function shapeOmit<B extends ShapeRawDefinition, M extends { [K in keyof B]?: true }>(
    base: ShapeCall<B>,
    mask: M,
): ShapeCall<Omit<B, Extract<keyof B, keyof M>>> {
    return decorateShape(base.omit(mask as never)) as unknown as ShapeCall<Omit<B, Extract<keyof B, keyof M>>>;
}

export const shape = Object.assign(shapeFn, {
    extend: shapeExtend,
    pick: shapePick,
    omit: shapeOmit,
});
