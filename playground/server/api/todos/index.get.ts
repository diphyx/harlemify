import { data } from "~/server/utils/data";

export default defineEventHandler(() => {
    return data.todos;
});
