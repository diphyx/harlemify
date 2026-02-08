import type { ShapeDefinition, ShapeMeta, ShapeType } from "../types/shape";

interface ShapeFieldDef {
    meta?: { identifier?: boolean };
    defaultValue?: unknown;
}

export function resolveShape(shape: ShapeDefinition): ShapeMeta {
    const meta: ShapeMeta = {
        identifier: undefined,
        defaults: {},
        fields: [],
    };

    for (const [key, field] of Object.entries(shape.shape)) {
        meta.fields.push(key);

        const fieldDefinition = (field as ShapeType<unknown> & { def?: ShapeFieldDef }).def;

        if (fieldDefinition?.meta?.identifier) {
            meta.identifier = key;
        }

        if (fieldDefinition?.defaultValue !== undefined) {
            if (typeof fieldDefinition.defaultValue === "function") {
                meta.defaults[key] = fieldDefinition.defaultValue();

                continue;
            }

            meta.defaults[key] = fieldDefinition.defaultValue;
        }
    }

    if (!meta.identifier) {
        if (meta.fields.includes("id")) {
            meta.identifier = "id";
        } else if (meta.fields.includes("_id")) {
            meta.identifier = "_id";
        }
    }

    return meta;
}
