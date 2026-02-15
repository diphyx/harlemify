import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    data.config = { ...body };

    return data.config;
});
