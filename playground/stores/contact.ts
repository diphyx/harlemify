import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "../../src/runtime";

export const contactShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        first_name: factory.string().meta({ alias: "first-name" }),
        last_name: factory.string().meta({ alias: "last-name" }),
        email: factory.email(),
    };
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
