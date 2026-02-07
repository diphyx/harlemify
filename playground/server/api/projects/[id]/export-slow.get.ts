import { data } from "~/server/utils/data";

// Slow export endpoint for demonstrating ActionConcurrent modes and AbortSignal
export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const project = data.projects.find((p) => p.id === id);

    if (!project) {
        throw createError({ statusCode: 404, message: "Project not found" });
    }

    const query = getQuery(event);
    const delay = Math.min(Number(query.delay) || 2000, 5000);

    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
        exportedAt: new Date().toISOString(),
        projectId: project.id,
        name: project.name,
        milestones: project.milestones.length,
        completedMilestones: project.milestones.filter((m) => m.done).length,
        budget: project.meta.budget,
    };
});
