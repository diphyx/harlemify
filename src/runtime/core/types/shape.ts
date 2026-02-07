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

export interface ShapeFactory {
    // Primitives
    string: typeof z.string;
    number: typeof z.number;
    boolean: typeof z.boolean;
    bigint: typeof z.bigint;
    date: typeof z.date;

    // Structures
    object: typeof z.object;
    array: typeof z.array;
    tuple: typeof z.tuple;
    record: typeof z.record;
    map: typeof z.map;
    set: typeof z.set;
    enum: typeof z.enum;
    union: typeof z.union;
    literal: typeof z.literal;

    // String formats
    email: typeof z.email;
    url: typeof z.url;
    uuid: typeof z.uuid;
    cuid: typeof z.cuid;
    cuid2: typeof z.cuid2;
    ulid: typeof z.ulid;
    nanoid: typeof z.nanoid;
    jwt: typeof z.jwt;
    emoji: typeof z.emoji;
    ipv4: typeof z.ipv4;
    ipv6: typeof z.ipv6;
    mac: typeof z.mac;
    base64: typeof z.base64;
    base64url: typeof z.base64url;
    hex: typeof z.hex;

    // Special
    any: typeof z.any;
    unknown: typeof z.unknown;
    never: typeof z.never;
    nullable: typeof z.nullable;
    optional: typeof z.optional;
}
