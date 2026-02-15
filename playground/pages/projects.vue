<script setup lang="ts">
import { ActionConcurrent, useIsolatedActionStatus, useIsolatedActionError } from "../../src/runtime";
import { projectStore, projectShape, type Project, type ProjectMilestone } from "../stores/project";

const showForm = ref(false);
const form = ref(projectShape.defaults());
const exportResult = ref<any>(null);

const concurrentMode = ref<"BLOCK" | "SKIP" | "CANCEL" | "ALLOW">("BLOCK");
const concurrentResult = ref<any>(null);
const concurrentError = ref<string | null>(null);
const transformedResult = ref<any>(null);
const activeAbortController = ref<AbortController | null>(null);
const signalResult = ref<any>(null);
const signalAborted = ref(false);
const isolatedStatus = useIsolatedActionStatus();
const isolatedError = useIsolatedActionError();
const errorResult = ref<Error | null>(null);

onMounted(() => projectStore.action.list());

async function handleCreate() {
    await projectStore.action.create({
        body: { name: form.value.name, description: form.value.description },
    });
    form.value = projectShape.defaults();
    showForm.value = false;
}

async function handleSelect(p: Project) {
    exportResult.value = null;
    projectStore.model.current.set(p);
    await projectStore.action.get();
}

async function handleDelete(p: Project) {
    if (confirm(`Delete "${p.name}"?`)) {
        projectStore.model.current.set(p);
        await projectStore.action.delete();
        projectStore.model.current.reset();
    }
}

async function handleCheck() {
    await projectStore.action.check({
        params: { id: String(projectStore.view.project.value.id) },
    });
}

async function handleToggle() {
    await projectStore.action.toggle();
}

async function loadMilestones() {
    await projectStore.action.milestones();
}

async function loadMeta() {
    await projectStore.action.meta();
}

async function loadOptions() {
    await projectStore.action.options();
}

async function handleExport(format: "json" | "csv" = "json") {
    exportResult.value = await projectStore.action.export({
        query: { format, includeStats: true },
        headers: { "X-Export-Request": "playground-demo" },
    });
}

function clearSelection() {
    projectStore.model.current.reset();
    exportResult.value = null;
}

async function handleSlowExport() {
    concurrentError.value = null;
    try {
        concurrentResult.value = await projectStore.action.slowExport({
            query: { delay: 2000 },
            timeout: 5000,
            concurrent: ActionConcurrent[concurrentMode.value],
        });
    } catch (e: any) {
        concurrentError.value = `${e.name}: ${e.message}`;
    }
}

async function handleTransformedExport() {
    transformedResult.value = await projectStore.action.export({
        query: { format: "json", includeStats: true },
        transformer: {
            request(api) {
                return { ...api, headers: { ...api.headers, "X-Transformed": "true" } };
            },
            response(data: unknown) {
                const response = data as any;
                return {
                    ...response,
                    transformedAt: new Date().toISOString(),
                    label: `[TRANSFORMED] ${response.summary?.name ?? "unknown"}`,
                };
            },
        },
    });
}

async function handleCancellableExport() {
    signalAborted.value = false;
    activeAbortController.value = new AbortController();
    try {
        signalResult.value = await projectStore.action.slowExport({
            query: { delay: 3000 },
            signal: activeAbortController.value.signal,
            concurrent: ActionConcurrent.ALLOW,
        });
    } catch {
        signalAborted.value = true;
    } finally {
        activeAbortController.value = null;
    }
}

function cancelExport() {
    activeAbortController.value?.abort();
}

async function handleBoundExport() {
    try {
        await projectStore.action.export({
            query: { format: "json" },
            bind: { status: isolatedStatus, error: isolatedError },
        });
    } catch {
        // captured in isolatedError
    }
}

async function handleTriggerError() {
    errorResult.value = null;
    try {
        await projectStore.action.triggerError({
            query: { status: 422, message: "Validation failed" },
        });
    } catch {
        errorResult.value = projectStore.action.triggerError.error.value;
    }
}
</script>

<template>
    <PageLayout title="Projects">
        <template #subtitle>
            Advanced store with <code>handle + commit</code>, <code>concurrent</code>, <code>transformer</code>,
            <code>signal</code>, <code>bind</code>
        </template>

        <div class="toolbar">
            <h2 data-testid="project-count">{{ projectStore.view.count.value }} projects</h2>
            <button class="btn btn-primary" data-testid="add-project" @click="showForm = !showForm">Add Project</button>
        </div>

        <div v-if="showForm" class="inline-form" data-testid="project-form">
            <h3>Create Project</h3>
            <form @submit.prevent="handleCreate">
                <div class="form-row">
                    <input v-model="form.name" placeholder="Project name" required data-testid="input-name" >
                    <input v-model="form.description" placeholder="Description" data-testid="input-description" >
                    <button type="submit" class="btn btn-sm btn-primary" data-testid="save-project">Create</button>
                    <button type="button" class="btn btn-sm" data-testid="cancel-form" @click="showForm = false">
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <div v-if="projectStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="project-grid">
            <div
                v-for="p in projectStore.view.projects.value"
                :key="p.id"
                class="card"
                :class="{ 'card-selected': projectStore.view.project.value.id === p.id }"
                :data-testid="`project-${p.id}`"
            >
                <div class="card-body">
                    <h3 data-testid="project-name">{{ p.name }}</h3>
                    <p class="subtitle" data-testid="project-desc">{{ p.description }}</p>
                    <p class="meta-info">
                        <span :class="['status-badge', p.active ? 'active' : 'inactive']" data-testid="project-status">
                            {{ p.active ? "Active" : "Inactive" }}
                        </span>
                        <span class="milestone-count" data-testid="milestone-count">
                            {{ p.milestones.filter((m: ProjectMilestone) => m.done).length }}/{{ p.milestones.length }}
                            milestones
                        </span>
                    </p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" data-testid="select-project" @click="handleSelect(p)">Select</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-project" @click="handleDelete(p)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- Selected project actions -->
        <div v-if="projectStore.view.project.value.id" class="section" data-testid="project-detail">
            <h2>
                {{ projectStore.view.project.value.name }}
                <button
                    class="btn btn-sm"
                    data-testid="clear-selection"
                    style="margin-left: 8px"
                    @click="clearSelection"
                >
                    Clear
                </button>
            </h2>

            <div class="action-row" data-testid="action-buttons">
                <button class="btn btn-sm" data-testid="check-project" @click="handleCheck">
                    Check <code>head()</code>
                </button>
                <button class="btn btn-sm" data-testid="toggle-active" @click="handleToggle">
                    {{ projectStore.view.isActive.value ? "Deactivate" : "Activate" }}
                </button>
                <button class="btn btn-sm" data-testid="load-milestones" @click="loadMilestones">Milestones</button>
                <button class="btn btn-sm" data-testid="load-meta" @click="loadMeta">Meta</button>
                <button class="btn btn-sm" data-testid="load-options" @click="loadOptions">Options</button>
                <button class="btn btn-sm" data-testid="export-json" @click="handleExport('json')">Export JSON</button>
                <button class="btn btn-sm" data-testid="export-csv" @click="handleExport('csv')">Export CSV</button>
            </div>

            <!-- Advanced Features -->
            <div class="section" data-testid="advanced-features">
                <h2>Advanced Features</h2>

                <div class="demo-box" data-testid="concurrent-demo">
                    <h4>Concurrent Modes</h4>
                    <div class="demo-row">
                        <select v-model="concurrentMode" data-testid="concurrent-select">
                            <option value="BLOCK">BLOCK</option>
                            <option value="SKIP">SKIP</option>
                            <option value="CANCEL">CANCEL</option>
                            <option value="ALLOW">ALLOW</option>
                        </select>
                        <button class="btn btn-sm" data-testid="slow-export" @click="handleSlowExport">
                            Slow Export (2s)
                        </button>
                    </div>
                    <div v-if="concurrentError" class="error-box" data-testid="concurrent-error">
                        {{ concurrentError }}
                    </div>
                    <pre v-if="concurrentResult" data-testid="concurrent-result">{{
                        JSON.stringify(concurrentResult, null, 2)
                    }}</pre>
                </div>

                <div class="demo-box" data-testid="transformer-demo">
                    <h4>Transformer</h4>
                    <button class="btn btn-sm" data-testid="transformed-export" @click="handleTransformedExport">
                        Export with Transformer
                    </button>
                    <pre v-if="transformedResult" data-testid="transformer-result">{{
                        JSON.stringify(transformedResult, null, 2)
                    }}</pre>
                </div>

                <div class="demo-box" data-testid="signal-demo">
                    <h4>Signal (AbortController)</h4>
                    <div class="demo-row">
                        <button class="btn btn-sm" data-testid="cancellable-export" @click="handleCancellableExport">
                            Start (3s)
                        </button>
                        <button
                            class="btn btn-sm btn-danger"
                            data-testid="cancel-export"
                            :disabled="!activeAbortController"
                            @click="cancelExport"
                        >
                            Cancel
                        </button>
                    </div>
                    <div v-if="signalAborted" class="error-box" data-testid="signal-aborted">Request was aborted</div>
                    <pre v-if="signalResult" data-testid="signal-result">{{
                        JSON.stringify(signalResult, null, 2)
                    }}</pre>
                </div>

                <div class="demo-box" data-testid="bind-demo">
                    <h4>Bind (Isolated Status)</h4>
                    <div class="demo-row">
                        <button class="btn btn-sm" data-testid="bound-export" @click="handleBoundExport">
                            Export with Bind
                        </button>
                        <span class="status-text" data-testid="bound-status">{{ isolatedStatus }}</span>
                    </div>
                    <div v-if="isolatedError" class="error-box" data-testid="bound-error">{{ isolatedError }}</div>
                </div>

                <div class="demo-box" data-testid="error-demo">
                    <h4>Error Handling</h4>
                    <div class="demo-row">
                        <button class="btn btn-sm btn-danger" data-testid="trigger-error" @click="handleTriggerError">
                            Trigger Error
                        </button>
                        <span class="status-text" data-testid="error-action-status">{{
                            projectStore.action.triggerError.status.value
                        }}</span>
                    </div>
                    <div v-if="errorResult" class="error-box" data-testid="error-result">
                        <strong>{{ errorResult.name }}</strong
                        >: {{ errorResult.message }}
                    </div>
                </div>
            </div>
        </div>

        <template #aside>
            <div v-if="projectStore.view.project.value.id" class="aside-panel" data-testid="project-state">
                <div class="aside-panel-title">view.project</div>
                <pre class="aside-pre">{{ JSON.stringify(projectStore.view.project.value, null, 2) }}</pre>
            </div>

            <div v-if="projectStore.view.project.value.id" class="aside-panel" data-testid="cloned-sorted-milestones">
                <div class="aside-panel-title">view.sortedMilestones (clone: deep)</div>
                <pre class="aside-pre">{{ JSON.stringify(projectStore.view.sortedMilestones.value, null, 2) }}</pre>
            </div>

            <div v-if="exportResult" class="aside-panel" data-testid="export-result">
                <div class="aside-panel-title">Export Result (no model)</div>
                <pre class="aside-pre">{{ JSON.stringify(exportResult, null, 2) }}</pre>
            </div>

            <ActionStatus
                :actions="{
                    get: projectStore.action.get,
                    list: projectStore.action.list,
                    create: projectStore.action.create,
                    delete: projectStore.action.delete,
                    toggle: projectStore.action.toggle,
                    check: projectStore.action.check,
                    milestones: projectStore.action.milestones,
                    meta: projectStore.action.meta,
                    options: projectStore.action.options,
                    export: projectStore.action.export,
                    slowExport: projectStore.action.slowExport,
                    triggerError: projectStore.action.triggerError,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
                <li><code>api.get().handle().commit()</code> - Full action chain</li>
                <li>
                    <code>handle(async (&#123; api, commit, view &#125;) => ...)</code> - Custom handle with nested
                    commit
                </li>
                <li>
                    <code>commit("current", ActionOneMode.PATCH, &#123; milestones &#125;)</code> - Nested field update
                </li>
                <li><code>commit(..., &#123; deep: true &#125;)</code> - Deep merge for nested objects</li>
                <li><code>ActionManyMode.ADD, &#123; prepend: true &#125;</code> - Prepend to list</li>
                <li><strong>Action without memory</strong> - Export returns data without committing</li>
                <li><code>action(&#123; query, headers &#125;)</code> - Call-time payload options</li>
                <li><code>ActionConcurrent.BLOCK/SKIP/CANCEL/ALLOW</code> - Concurrent control</li>
                <li><code>action(&#123; transformer &#125;)</code> - Transform response at call-time</li>
                <li><code>action(&#123; signal &#125;)</code> - Cancellable requests</li>
                <li><code>action(&#123; bind &#125;)</code> - Isolated status/error tracking</li>
                <li><code>useIsolatedActionStatus/Error()</code> - Composables for bind</li>
                <li><code>action.error</code> - Reactive error state</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>

<style scoped>
.card-selected {
    border-color: var(--blue);
    box-shadow:
        0 0 0 1px var(--blue-dim),
        var(--shadow-md);
}

.meta-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
}

.status-badge {
    font-family: var(--mono);
    font-size: 0.65rem;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    text-transform: uppercase;
}

.status-badge.active {
    background: var(--green-dim);
    color: var(--green);
}

.status-badge.inactive {
    background: var(--bg-inset);
    color: var(--text-4);
}

.milestone-count {
    color: var(--text-4);
    font-size: 0.72rem;
}

.action-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
}

.action-row code {
    font-family: var(--mono);
    font-size: 0.6rem;
    opacity: 0.5;
}

.demo-box {
    margin-top: 8px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
}

.demo-box h4 {
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 10px;
}

.demo-box pre {
    margin-top: 8px;
    background: var(--bg);
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-2);
    line-height: 1.6;
    overflow-x: auto;
}

.demo-row {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.demo-row select {
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-inset);
    color: var(--text);
    font-family: var(--sans);
    font-size: 0.78rem;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.demo-row select:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px var(--blue-dim);
}

.status-text {
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--text-3);
}

.error-box {
    margin-top: 8px;
    padding: 8px 12px;
    background: var(--red-dim);
    border: 1px solid rgba(240, 101, 114, 0.15);
    border-radius: 8px;
    color: var(--red);
    font-size: 0.78rem;
}
</style>
