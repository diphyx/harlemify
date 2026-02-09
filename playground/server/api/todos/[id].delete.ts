import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const index = data.todos.findIndex((t) => t.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Todo not found" });
    }
    const [todo] = data.todos.splice(index, 1);
    return todo;
});
