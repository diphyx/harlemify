import { config } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    Object.assign(config, body);

    return config;
});
