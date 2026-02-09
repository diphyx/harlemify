<script setup lang="ts">
import { useStoreAction, useStoreModel, useStoreView } from "../../src/runtime";
import { todoStore, todoShape, type Todo } from "../stores/todo";

// useStoreAction — destructured
const { execute, status, loading, error, reset } = useStoreAction(todoStore, "list");

// useStoreAction — non-destructured
const isolatedAction = useStoreAction(todoStore, "list", { isolated: true });
const deleteAction = useStoreAction(todoStore, "delete");
const toggleAction = useStoreAction(todoStore, "toggle");

// useStoreModel — destructured
const { set: setCurrent, patch: patchCurrent, reset: resetCurrent } = useStoreModel(todoStore, "current");
const { add: addList, remove: removeList } = useStoreModel(todoStore, "list");

// useStoreModel — non-destructured
const debouncedModel = useStoreModel(todoStore, "current", { debounce: 500 });
const throttledModel = useStoreModel(todoStore, "current", { throttle: 500 });
const modelLog = ref<string[]>([]);

// useStoreView — destructured
const { data: pendingData } = useStoreView(todoStore, "pending");

// useStoreView — reactive (default)
const todoView = useStoreView(todoStore, "todo");
const todosView = useStoreView(todoStore, "todos");

// useStoreView — without proxy (ComputedRef)
const computedView = useStoreView(todoStore, "todo", { proxy: false });
const defaultView = useStoreView(todoStore, "todo", {
    default: todoShape.defaults({ title: "No todo selected" }),
});
const trackLog = ref<string[]>([]);

// Load data
onMounted(() => execute());

// Track demo
const trackStop = ref<(() => void) | null>(null);
const isTracking = computed(() => !!trackStop.value);

function startTrack() {
    if (trackStop.value) return;
    trackStop.value = todoView.track((value) => {
        trackLog.value.push(`[track] ${value?.title ?? "null"} (done: ${value?.done ?? "-"})`);
    });
}

function stopTrack() {
    trackStop.value?.();
    trackStop.value = null;
}

// Helpers
function selectTodo(todo: Todo) {
    setCurrent(todo);
}

async function deleteTodo(todo: Todo) {
    setCurrent(todo);
    await deleteAction.execute();
}

async function toggleTodo(todo: Todo) {
    setCurrent(todo);
    await toggleAction.execute();
}

// useStoreModel demos
function modelSet() {
    setCurrent({ id: 99, title: "Set via composable", done: false });
    modelLog.value.push("[set] setCurrent({ id: 99, title: 'Set via composable' })");
}

function modelPatch() {
    patchCurrent({ title: "Patched title" });
    modelLog.value.push("[patch] patchCurrent({ title: 'Patched title' })");
}

function modelReset() {
    resetCurrent();
    modelLog.value.push("[reset] resetCurrent()");
}

function modelAdd() {
    const todo = { id: Date.now(), title: "Added via composable", done: false };
    addList(todo);
    modelLog.value.push(`[add] addList({ id: ${todo.id}, title: 'Added via composable' })`);
}

function modelRemove() {
    const first = todoStore.view.todos.value[0];
    if (!first) return;
    removeList(first);
    modelLog.value.push(`[remove] removeList({ id: ${first.id}, title: '${first.title}' })`);
}

function debouncedSet() {
    debouncedModel.set({ id: 88, title: "Debounced (" + Date.now() + ")", done: false });
    modelLog.value.push("[debounce] debouncedModel.set() — waits 500ms");
}

function throttledSet() {
    throttledModel.set({ id: 77, title: "Throttled (" + Date.now() + ")", done: false });
    modelLog.value.push("[throttle] throttledModel.set() — throttled 500ms");
}

function clearModelLog() {
    modelLog.value = [];
}

function clearTrackLog() {
    trackLog.value = [];
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Composables</h1>
            <p><code>useStoreAction</code>, <code>useStoreModel</code>, <code>useStoreView</code></p>
        </div>

        <!-- Todo List -->
        <div class="toolbar">
            <h2 data-testid="todo-count">{{ todosView.data.value?.length ?? 0 }} todos</h2>
            <button class="btn btn-primary" data-testid="reload" @click="execute()">Reload</button>
            <button v-if="todoView.data.id" class="btn btn-sm" data-testid="clear-selection" @click="resetCurrent()">
                Clear
            </button>
        </div>

        <div v-if="loading" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="list" data-testid="todo-list">
            <div
                v-for="todo in todosView.data.value"
                :key="todo.id"
                class="list-item"
                :class="{ 'list-item-selected': todoView.data.id === todo.id }"
                :data-testid="`todo-${todo.id}`"
            >
                <div>
                    <h3 :style="{ textDecoration: todo.done ? 'line-through' : 'none' }" data-testid="todo-title">
                        {{ todo.title }}
                    </h3>
                    <p class="subtitle">{{ todo.done ? "Done" : "Pending" }}</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" data-testid="select-todo" @click="selectTodo(todo)">Select</button>
                    <button class="btn btn-sm" data-testid="toggle-todo" @click="toggleTodo(todo)">
                        {{ todo.done ? "Undo" : "Done" }}
                    </button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-todo" @click="deleteTodo(todo)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <!-- useStoreAction -->
        <div class="section" data-testid="action-section">
            <h2>useStoreAction</h2>

            <div class="demo-block">
                <h3>Destructured</h3>
                <p class="subtitle">
                    <code>const { execute, status, loading, error, reset } = useStoreAction(store, "list")</code>
                </p>
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">status</span>
                        <span class="demo-value" data-testid="action-status">{{ status }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">loading</span>
                        <span class="demo-value" data-testid="action-loading">{{ loading }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">error</span>
                        <span class="demo-value" data-testid="action-error">{{ error ?? "null" }}</span>
                    </div>
                </div>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="action-execute" @click="execute()">execute()</button>
                    <button class="btn btn-sm" data-testid="action-reset" @click="reset()">reset()</button>
                </div>
            </div>

            <div class="demo-block">
                <h3>Non-destructured (isolated)</h3>
                <p class="subtitle">
                    <code>const isolatedAction = useStoreAction(store, "list", { isolated: true })</code>
                </p>
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">isolatedAction.status</span>
                        <span class="demo-value" data-testid="isolated-status">{{ isolatedAction.status }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">isolatedAction.loading</span>
                        <span class="demo-value" data-testid="isolated-loading">{{ isolatedAction.loading }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">global status</span>
                        <span class="demo-value" data-testid="global-status">{{
                            todoStore.action.list.status.value
                        }}</span>
                    </div>
                </div>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="isolated-execute" @click="isolatedAction.execute()">
                        isolatedAction.execute()
                    </button>
                    <button class="btn btn-sm" data-testid="isolated-reset" @click="isolatedAction.reset()">
                        isolatedAction.reset()
                    </button>
                </div>
            </div>
        </div>

        <!-- useStoreModel -->
        <div class="section" data-testid="model-section">
            <h2>useStoreModel</h2>

            <div class="demo-block">
                <h3>Destructured — One Model (current)</h3>
                <p class="subtitle">
                    <code
                        >const { set: setCurrent, patch: patchCurrent, reset: resetCurrent } = useStoreModel(store,
                        "current")</code
                    >
                </p>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="model-set" @click="modelSet">setCurrent()</button>
                    <button class="btn btn-sm" data-testid="model-patch" @click="modelPatch">patchCurrent()</button>
                    <button class="btn btn-sm" data-testid="model-reset" @click="modelReset">resetCurrent()</button>
                </div>
                <pre data-testid="model-current-value">{{ JSON.stringify(todoView.data.value, null, 2) }}</pre>
            </div>

            <div class="demo-block">
                <h3>Destructured — Many Model (list)</h3>
                <p class="subtitle">
                    <code>const { add: addList, remove: removeList } = useStoreModel(store, "list")</code>
                </p>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="model-add" @click="modelAdd">addList()</button>
                    <button class="btn btn-sm" data-testid="model-remove" @click="modelRemove">removeList()</button>
                </div>
            </div>

            <div class="demo-block">
                <h3>Non-destructured — Debounce / Throttle</h3>
                <p class="subtitle">
                    <code>const debouncedModel = useStoreModel(store, "current", { debounce: 500 })</code>
                    <br >
                    <code>const throttledModel = useStoreModel(store, "current", { throttle: 500 })</code>
                </p>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="model-debounce" @click="debouncedSet">
                        debouncedModel.set()
                    </button>
                    <button class="btn btn-sm" data-testid="model-throttle" @click="throttledSet">
                        throttledModel.set()
                    </button>
                </div>
            </div>

            <div v-if="modelLog.length" class="log" data-testid="model-log">
                <div class="log-header">
                    <h4>Model Log</h4>
                    <button class="btn btn-sm" @click="clearModelLog">Clear</button>
                </div>
                <div v-for="(entry, i) in modelLog" :key="i" class="log-entry">{{ entry }}</div>
            </div>
        </div>

        <!-- useStoreView -->
        <div class="section" data-testid="view-section">
            <h2>useStoreView</h2>

            <div class="demo-block">
                <h3>Non-destructured — Data Proxy</h3>
                <p class="subtitle">
                    <code>const todoView = useStoreView(store, "todo")</code>
                </p>
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">todoView.data.value</span>
                        <span class="demo-value" data-testid="view-data-value">{{
                            JSON.stringify(todoView.data.value)
                        }}</span>
                    </div>

                    <div class="demo-item">
                        <span class="demo-label">todoView.data.title (proxy)</span>
                        <span class="demo-value" data-testid="view-data-title">{{
                            todoView.data.title ?? "undefined"
                        }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">todoView.data.done (proxy)</span>
                        <span class="demo-value" data-testid="view-data-done">{{
                            todoView.data.done ?? "undefined"
                        }}</span>
                    </div>
                </div>
            </div>

            <div class="demo-block">
                <h3>Non-destructured — Default Option</h3>
                <p class="subtitle">
                    <code
                        >const defaultView = useStoreView(store, "todo", { default: shape.defaults({ title: "No todo
                        selected" }) })</code
                    >
                </p>
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">defaultView.data.value</span>
                        <span class="demo-value" data-testid="view-default-value">{{
                            JSON.stringify(defaultView.data.value)
                        }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">defaultView.data.title</span>
                        <span class="demo-value" data-testid="view-default-title">{{ defaultView.data.title }}</span>
                    </div>
                </div>
            </div>

            <div class="demo-block">
                <h3>Without Proxy — ComputedRef</h3>
                <p class="subtitle">
                    <code>const computedView = useStoreView(store, "todo", { proxy: false })</code>
                </p>
                <div class="demo-grid">
                    <div class="demo-item">
                        <span class="demo-label">computedView.data.value</span>
                        <span class="demo-value" data-testid="view-computed-value">{{
                            JSON.stringify(computedView.data.value)
                        }}</span>
                    </div>
                    <div class="demo-item">
                        <span class="demo-label">computedView.data.value?.title</span>
                        <span class="demo-value" data-testid="view-computed-title">{{
                            computedView.data.value?.title ?? "undefined"
                        }}</span>
                    </div>
                </div>
            </div>

            <div class="demo-block">
                <h3>Destructured — Pending View</h3>
                <p class="subtitle">
                    <code>const { data: pendingData } = useStoreView(store, "pending")</code>
                </p>
                <pre data-testid="view-pending">{{
                    JSON.stringify(
                        pendingData.value?.map((t: Todo) => t.title),
                        null,
                        2,
                    )
                }}</pre>
            </div>

            <div class="demo-block">
                <h3>Track</h3>
                <p class="subtitle">
                    <code>todoView.track(handler)</code>
                </p>
                <div class="demo-controls">
                    <button class="btn btn-sm" data-testid="track-start" :disabled="isTracking" @click="startTrack">
                        Start Track
                    </button>
                    <button class="btn btn-sm" data-testid="track-stop" :disabled="!isTracking" @click="stopTrack">
                        Stop
                    </button>
                </div>
                <div v-if="trackLog.length" class="log" data-testid="track-log">
                    <div class="log-header">
                        <h4>Track Log</h4>
                        <button class="btn btn-sm" @click="clearTrackLog">Clear</button>
                    </div>
                    <div v-for="(entry, i) in trackLog" :key="i" class="log-entry">{{ entry }}</div>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li>
                    <code>useStoreAction(store, key)</code> - Destructured:
                    <code>{ execute, status, loading, error, reset }</code>
                </li>
                <li>
                    <code>useStoreAction(store, key, { isolated: true })</code> - Non-destructured:
                    <code>isolatedAction.execute()</code>
                </li>
                <li>
                    <code>useStoreModel(store, key)</code> - Destructured:
                    <code>{ set, patch, reset }</code>
                </li>
                <li><code>useStoreModel(store, key)</code> - Destructured many: <code>{ add, remove }</code></li>
                <li>
                    <code>useStoreModel(store, key, { debounce })</code> - Non-destructured:
                    <code>debouncedModel.set()</code>
                </li>
                <li>
                    <code>useStoreModel(store, key, { throttle })</code> - Non-destructured:
                    <code>throttledModel.set()</code>
                </li>
                <li>
                    <code>useStoreView(store, key)</code> - Non-destructured: <code>todoView.data</code>,
                    <code>todoView.track()</code>
                </li>
                <li><code>useStoreView(store, key, { proxy: false })</code> - Raw ComputedRef, no proxy</li>
                <li><code>useStoreView(store, key, { default })</code> - Fallback value when view is null</li>
                <li><code>useStoreView(store, key)</code> - Destructured: <code>{ data: pendingData }</code></li>
                <li>
                    Data proxy: access <code>data.title</code>, <code>data.done</code> directly without
                    <code>.value</code>
                </li>
                <li><code>track(handler)</code> - Watch view changes</li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.section {
    margin-top: 40px;
}

.section > h2 {
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
}

.demo-block {
    margin-top: 20px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.demo-block h3 {
    margin-bottom: 4px;
    font-size: 15px;
}

.demo-block .subtitle {
    margin-bottom: 12px;
    font-size: 12px;
    color: var(--text-dimmed);
}

.demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.demo-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.demo-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
}

.demo-value {
    font-family: monospace;
    font-size: 13px;
    word-break: break-all;
}

.demo-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.log {
    margin-top: 12px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
    max-height: 200px;
    overflow-y: auto;
}

.log-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.log-header h4 {
    font-size: 13px;
    color: var(--text-muted);
}

.log-entry {
    font-family: monospace;
    font-size: 12px;
    padding: 2px 0;
    color: var(--text-muted);
}

.list-item-selected {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent);
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
</style>
