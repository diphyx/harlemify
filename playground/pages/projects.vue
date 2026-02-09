<script setup lang="ts">
import { ActionConcurrent, useIsolatedActionStatus, useIsolatedActionError } from "../../src/runtime";
import { projectStore, projectShape, type Project, type ProjectMilestone } from "../stores/project";

// Form state
const showCreateModal = ref(false);
const form = ref(projectShape.defaults());

// Export result (action without memory)
const exportResult = ref<any>(null);

// Concurrent demo
const concurrentMode = ref<"BLOCK" | "SKIP" | "CANCEL" | "ALLOW">("BLOCK");
const concurrentResult = ref<any>(null);
const concurrentError = ref<string | null>(null);

// Transformer demo
const transformedResult = ref<any>(null);

// Signal demo
const activeAbortController = ref<AbortController | null>(null);
const signalResult = ref<any>(null);
const signalAborted = ref(false);

// Bind demo
const isolatedStatus = useIsolatedActionStatus();
const isolatedError = useIsolatedActionError();

// Error demo
const errorResult = ref<Error | null>(null);

onMounted(() => projectStore.action.list());

async function handleCreate() {
    await projectStore.action.create({
        body: {
            name: form.value.name,
            description: form.value.description,
        },
    });
    form.value = projectShape.defaults();
    showCreateModal.value = false;
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
    if (!projectStore.view.project.value) return;
    await projectStore.action.check({
        params: { id: String(projectStore.view.project.value.id) },
    });
}

async function handleToggle() {
    if (!projectStore.view.project.value) return;
    await projectStore.action.toggle();
}

async function loadMilestones() {
    if (!projectStore.view.project.value) return;
    await projectStore.action.milestones();
}

async function loadMeta() {
    if (!projectStore.view.project.value) return;
    await projectStore.action.meta();
}

async function loadOptions() {
    if (!projectStore.view.project.value) return;
    await projectStore.action.options();
}

async function handleExport(format: "json" | "csv" = "json") {
    if (!projectStore.view.project.value) return;
    exportResult.value = await projectStore.action.export({
        query: { format, includeStats: true },
        headers: { "X-Export-Request": "playground-demo" },
    });
}

function clearSelection() {
    projectStore.model.current.reset();
    exportResult.value = null;
}

// Concurrent demo
async function handleSlowExport() {
    if (!projectStore.view.project.value) return;
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

// Transformer demo
async function handleTransformedExport() {
    if (!projectStore.view.project.value) return;

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

// Signal demo
async function handleCancellableExport() {
    if (!projectStore.view.project.value) return;
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

// Bind demo
async function handleBoundExport() {
    if (!projectStore.view.project.value) return;

    try {
        await projectStore.action.export({
            query: { format: "json" },
            bind: {
                status: isolatedStatus,
                error: isolatedError,
            },
        });
    } catch {
        // Error is captured in isolatedError ref
    }
}

// Error demo
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
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Projects</h1>
            <p>
                Advanced store with <code>handle + commit</code> chains, <code>concurrent</code>,
                <code>transformer</code>, <code>signal</code>, <code>bind</code>
            </p>
        </div>

        <div class="toolbar">
            <h2 data-testid="project-count">{{ projectStore.view.count.value }} projects</h2>
            <button class="btn btn-primary" data-testid="add-project" @click="showCreateModal = true">
                Add Project
            </button>
        </div>

        <div v-if="projectStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="project-grid">
            <div
                v-for="p in projectStore.view.projects.value"
                :key="p.id"
                class="card"
                :class="{ 'card-selected': projectStore.view.project.value?.id === p.id }"
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

        <!-- Selected Project Detail -->
        <div v-if="projectStore.view.project.value" class="detail" data-testid="project-detail">
            <div class="detail-header">
                <h3>Selected: {{ projectStore.view.project.value.name }}</h3>
                <button class="btn btn-sm" data-testid="clear-selection" @click="clearSelection">Clear</button>
            </div>

            <!-- Actions -->
            <div class="action-buttons" data-testid="action-buttons">
                <button class="btn btn-sm" data-testid="check-project" @click="handleCheck">
                    Check <code>api.head()</code>
                </button>
                <button class="btn btn-sm" data-testid="toggle-active" @click="handleToggle">
                    {{ projectStore.view.isActive.value ? "Deactivate" : "Activate" }}
                </button>
                <button class="btn btn-sm" data-testid="load-milestones" @click="loadMilestones">
                    Load Milestones <code>handle + commit</code>
                </button>
                <button class="btn btn-sm" data-testid="load-meta" @click="loadMeta">
                    Load Meta <code>handle + commit</code>
                </button>
                <button class="btn btn-sm" data-testid="load-options" @click="loadOptions">
                    Load Options <code>deep patch</code>
                </button>
                <button class="btn btn-sm" data-testid="export-json" @click="handleExport('json')">
                    Export JSON <code>query</code>
                </button>
                <button class="btn btn-sm" data-testid="export-csv" @click="handleExport('csv')">
                    Export CSV <code>headers</code>
                </button>
            </div>

            <!-- Sorted Milestones (clone: "deep") -->
            <div class="state-section" data-testid="cloned-sorted-milestones">
                <h4>Sorted Milestones (view.sortedMilestones, clone: "deep")</h4>
                <pre>{{ JSON.stringify(projectStore.view.sortedMilestones.value, null, 2) }}</pre>
            </div>

            <!-- Raw State -->
            <div class="state-section" data-testid="project-state">
                <h4>project (view.project)</h4>
                <pre>{{ JSON.stringify(projectStore.view.project.value, null, 2) }}</pre>
            </div>

            <!-- Export Result (action without memory) -->
            <div v-if="exportResult" class="state-section export-result" data-testid="export-result">
                <h4>Export Result (returned data, not stored in model)</h4>
                <pre>{{ JSON.stringify(exportResult, null, 2) }}</pre>
            </div>

            <!-- Advanced Features -->
            <div class="advanced-features" data-testid="advanced-features">
                <h3>Advanced Features</h3>

                <!-- Concurrent Demo -->
                <div class="feature-demo" data-testid="concurrent-demo">
                    <h4>ActionConcurrent Modes</h4>
                    <div class="demo-controls">
                        <select v-model="concurrentMode" data-testid="concurrent-select">
                            <option value="BLOCK">BLOCK (throw error)</option>
                            <option value="SKIP">SKIP (return pending)</option>
                            <option value="CANCEL">CANCEL (abort previous)</option>
                            <option value="ALLOW">ALLOW (run parallel)</option>
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

                <!-- Transformer Demo -->
                <div class="feature-demo" data-testid="transformer-demo">
                    <h4>Call-time Transformer</h4>
                    <button class="btn btn-sm" data-testid="transformed-export" @click="handleTransformedExport">
                        Export with Transformer
                    </button>
                    <pre v-if="transformedResult" data-testid="transformer-result">{{
                        JSON.stringify(transformedResult, null, 2)
                    }}</pre>
                </div>

                <!-- Signal Demo -->
                <div class="feature-demo" data-testid="signal-demo">
                    <h4>Call-time Signal (AbortController)</h4>
                    <div class="demo-controls">
                        <button class="btn btn-sm" data-testid="cancellable-export" @click="handleCancellableExport">
                            Start Slow Export (3s)
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

                <!-- Bind Demo -->
                <div class="feature-demo" data-testid="bind-demo">
                    <h4>Call-time Bind (Isolated Status/Error)</h4>
                    <div class="demo-controls">
                        <button class="btn btn-sm" data-testid="bound-export" @click="handleBoundExport">
                            Export with Bind
                        </button>
                        <span class="monitor-state" data-testid="bound-status"> isolated: {{ isolatedStatus }} </span>
                    </div>
                    <div v-if="isolatedError" class="error-box" data-testid="bound-error">
                        {{ isolatedError }}
                    </div>
                </div>

                <!-- Error Demo -->
                <div class="feature-demo" data-testid="error-demo">
                    <h4>Error Handling</h4>
                    <div class="demo-controls">
                        <button class="btn btn-sm btn-danger" data-testid="trigger-error" @click="handleTriggerError">
                            Trigger Server Error
                        </button>
                        <span class="monitor-state" data-testid="error-action-status">
                            {{ projectStore.action.triggerError.status.value }}
                        </span>
                    </div>
                    <div v-if="errorResult" class="error-box" data-testid="error-result">
                        <p>
                            <strong>{{ errorResult.name }}</strong
                            >: {{ errorResult.message }}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-get">
                    <span class="monitor-label">get</span>
                    <span class="monitor-state" :data-status="projectStore.action.get.status.value">{{
                        projectStore.action.get.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-list">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="projectStore.action.list.status.value">{{
                        projectStore.action.list.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-create">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="projectStore.action.create.status.value">{{
                        projectStore.action.create.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-delete">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="projectStore.action.delete.status.value">{{
                        projectStore.action.delete.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-toggle">
                    <span class="monitor-label">toggle</span>
                    <span class="monitor-state" :data-status="projectStore.action.toggle.status.value">{{
                        projectStore.action.toggle.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-check">
                    <span class="monitor-label">check</span>
                    <span class="monitor-state" :data-status="projectStore.action.check.status.value">{{
                        projectStore.action.check.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-milestones">
                    <span class="monitor-label">milestones</span>
                    <span class="monitor-state" :data-status="projectStore.action.milestones.status.value">{{
                        projectStore.action.milestones.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-meta">
                    <span class="monitor-label">meta</span>
                    <span class="monitor-state" :data-status="projectStore.action.meta.status.value">{{
                        projectStore.action.meta.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-options">
                    <span class="monitor-label">options</span>
                    <span class="monitor-state" :data-status="projectStore.action.options.status.value">{{
                        projectStore.action.options.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-export">
                    <span class="monitor-label">export</span>
                    <span class="monitor-state" :data-status="projectStore.action.export.status.value">{{
                        projectStore.action.export.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-slowExport">
                    <span class="monitor-label">slowExport</span>
                    <span class="monitor-state" :data-status="projectStore.action.slowExport.status.value">{{
                        projectStore.action.slowExport.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-triggerError">
                    <span class="monitor-label">triggerError</span>
                    <span class="monitor-state" :data-status="projectStore.action.triggerError.status.value">{{
                        projectStore.action.triggerError.status.value
                    }}</span>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>api.get().handle().commit()</code> - Full action chain</li>
                <li>
                    <code>handle(async (&#123; api, commit, view &#125;) => ...)</code> - Custom handle with nested
                    commit
                </li>
                <li>
                    <code>commit("current", ActionOneMode.PATCH, &#123; milestones &#125;)</code> - Nested field update
                </li>
                <li><code>commit(..., &#123; deep: true &#125;)</code> - Deep merge for nested objects</li>
                <li><code>ActionManyMode.ADD, &#123; prepend: true &#125;</code> - New projects prepend to list</li>
                <li><strong>Action without memory</strong> - Export returns data without committing to model</li>
                <li><code>action(&#123; query, headers &#125;)</code> - Call-time payload options</li>
                <li><code>ActionConcurrent.BLOCK/SKIP/CANCEL/ALLOW</code> - Concurrent action control modes</li>
                <li><code>action(&#123; transformer: fn &#125;)</code> - Transform response at call-time</li>
                <li><code>action(&#123; signal: abortController.signal &#125;)</code> - Cancellable requests</li>
                <li>
                    <code>action(&#123; bind: &#123; status, error &#125; &#125;)</code> - Isolated status/error
                    tracking
                </li>
                <li>
                    <code>useIsolatedActionStatus()</code> / <code>useIsolatedActionError()</code> - Composables for
                    bind
                </li>
                <li><code>action.error</code> - Reactive error state with typed ActionError</li>
                <li><code>shape.defaults()</code> - Auto-generate zero-value form data from shape</li>
            </ul>
        </div>

        <!-- Create Modal -->
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
            <div class="modal" data-testid="project-modal">
                <h2>Create Project</h2>
                <form @submit.prevent="handleCreate">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="form.name" required placeholder="Project name" data-testid="input-name" >
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input v-model="form.description" placeholder="Description" data-testid="input-description" >
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" data-testid="cancel-modal" @click="showCreateModal = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" data-testid="save-project">Create</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card-selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
}

.meta-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: white;
}

.status-badge.active {
    background-color: #22c55e;
}

.status-badge.inactive {
    background-color: #6b7280;
}

.milestone-count {
    color: var(--text-muted);
    font-size: 12px;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
}

.action-buttons code {
    font-size: 10px;
    opacity: 0.7;
}

.state-section {
    margin-top: 16px;
}

.state-section h4 {
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-muted);
}

.export-result {
    background: var(--bg-tertiary);
    padding: 12px;
    border-radius: 8px;
}

.advanced-features {
    margin-top: 24px;
}

.advanced-features > h3 {
    margin-bottom: 16px;
}

.feature-demo {
    margin-top: 16px;
    padding: 16px;
    background: var(--bg-tertiary);
    border-radius: 8px;
}

.feature-demo h4 {
    margin-bottom: 12px;
    font-size: 14px;
}

.demo-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 12px;
}

.demo-controls select {
    padding: 6px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    color: var(--text);
    font-size: 13px;
}

.error-box {
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #ef4444;
    font-size: 13px;
}

.feature-info {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.feature-info h3 {
    margin-bottom: 12px;
}

.feature-info ul {
    margin: 0;
    padding-left: 20px;
}

.feature-info li {
    margin-bottom: 8px;
}

.feature-info code {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
}

.monitor-status {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.monitor-status h3 {
    margin-bottom: 12px;
}

.monitor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.monitor-label {
    font-weight: 600;
    font-size: 14px;
}

.monitor-state {
    font-family: monospace;
    font-size: 13px;
    color: var(--text-muted);
}

.monitor-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.flag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.flag[data-flag="idle"] {
    background: #6b7280;
    color: white;
}

.flag[data-flag="pending"] {
    background: #f59e0b;
    color: white;
}

.flag[data-flag="success"] {
    background: #10b981;
    color: white;
}

.flag[data-flag="failed"] {
    background: #ef4444;
    color: white;
}
</style>
