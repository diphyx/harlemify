import { config } from "~/server/utils/data";

export default defineEventHandler(() => {
    return config;
});
