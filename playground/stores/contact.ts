import { z } from "zod";

import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "../../src/runtime";

// Pre-built Zod schema (as if imported from a shared validators package or generated from OpenAPI)
const externalContactSchema = z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.email(),
});

// Wrap with shape() then annotate via shape.extend — adds identifier + alias meta
// without modifying the source schema.
export const contactShape = shape.extend(shape(externalContactSchema), {
    id: z.number().meta({ identifier: true }),
    first_name: z.string().meta({ alias: "first-name" }),
    last_name: z.string().meta({ alias: "last-name" }),
});

export type Contact = ShapeInfer<typeof contactShape>;

export const contactStore = createStore({
    name: "contacts",
    model({ one, many }) {
        return {
            current: one(contactShape),
            list: many(contactShape),
        };
    },
    view({ from }) {
        return {
            contact: from("current"),
            contacts: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
        };
    },
    action({ api }) {
        return {
            list: api.get({ url: "/contacts" }, { model: "list", mode: ModelManyMode.SET }),
            get: api.get(
                {
                    url(view) {
                        return `/contacts/${view.contact.value.id}`;
                    },
                },
                { model: "current", mode: ModelOneMode.SET },
            ),
            create: api.post({ url: "/contacts" }, { model: "list", mode: ModelManyMode.ADD }),
            update: api.patch(
                {
                    url(view) {
                        return `/contacts/${view.contact.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                {
                    url(view) {
                        return `/contacts/${view.contact.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
        };
    },
});
