import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const project = data.projects.find((p) => p.id === id);
    if (!project) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }
    // Return partial project - milestones and meta are loaded separately
    // This demonstrates handle + commit for nested field updates
    return {
        id: project.id,
        name: project.name,
        description: project.description,
        active: project.active,
        milestones: [],
        meta: {
            deadline: "",
            budget: 0,
            options: {
                notify: false,
                priority: 0,
            },
        },
    };
});
