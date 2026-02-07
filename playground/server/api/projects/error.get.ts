// Error endpoint for demonstrating action error handling
export default defineEventHandler((event) => {
    const query = getQuery(event);
    const status = Number(query.status) || 500;
    const message = (query.message as string) || "Simulated server error";

    throw createError({ statusCode: status, message });
});
