import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const name = getRouterParam(event, "name") as string;
    if (!data.teams[name]) {
        throw createError({ statusCode: 404, message: "Team not found" });
    }
    const record: Record<string, (typeof data.teams)[string]> = {};

    for (const key of Object.keys(data.teams)) {
        if (key !== name && data.teams[key]) {
            record[key] = data.teams[key];
        }
    }

    data.teams = record;
    return { success: true };
});
