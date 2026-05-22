<script setup lang="ts">
import { useStoreAction, useStoreModel, useStoreView } from "../../src/runtime";
import { todoStore, type Todo } from "../stores/todo";

const { execute, status, loading, error, reset } = useStoreAction(todoStore, "list");
const isolatedAction = useStoreAction(todoStore, "list", { isolated: true });
const deleteAction = useStoreAction(todoStore, "delete");
const toggleAction = useStoreAction(todoStore, "toggle");
const renameAction = useStoreAction(todoStore, "rename");

const { set: setCurrent, patch: patchCurrent, reset: resetCurrent } = useStoreModel(todoStore, "current");
const { add: addList, remove: removeList } = useStoreModel(todoStore, "list");
const debouncedModel = useStoreModel(todoStore, "current", { debounce: 500 });
const throttledModel = useStoreModel(todoStore, "current", { throttle: 500 });
const modelLog = ref<string[]>([]);

const pendingView = useStoreView(todoStore, "pending");
const todoView = useStoreView(todoStore, "todo");
const todosView = useStoreView(todoStore, "todos");
const trackLog = ref<string[]>([]);

onMounted(() => execute());

const trackStop = ref<(() => void) | null>(null);
const isTracking = computed(() => !!trackStop.value);

function startTrack() {
    if (trackStop.value) return;
    trackStop.value = todoView.track((value) => {
        trackLog.value.push(`[track] ${value.title} (done: ${value.done})`);
    });
}

function stopTrack() {
    trackStop.value?.();
    trackStop.value = null;
}

function selectTodo(todo: Todo) {
    setCurrent(todo);
}
async function deleteTodo(todo: Todo) {
    setCurrent(todo);
    await deleteAction.execute();
}
async function toggleTodo(todo: Todo) {
    await toggleAction.execute({ payload: todo });
}
async function renameTodo(todo: Todo) {
    setCurrent(todo);
    await renameAction.execute({ payload: todo.title + " (edited)" });
}
async function renameDefault(todo: Todo) {
    setCurrent(todo);
    await renameAction.execute();
}

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
    modelLog.value.push(`[add] addList({ id: ${todo.id} })`);
}
function modelRemove() {
    const first = todoStore.view.todos.value[0];
    if (!first) return;
    removeList(first);
    modelLog.value.push(`[remove] removeList({ id: ${first.id} })`);
}
function debouncedSet() {
    debouncedModel.set({ id: 88, title: "Debounced (" + Date.now() + ")", done: false });
    modelLog.value.push("[debounce] debouncedModel.set()");
}
function throttledSet() {
    throttledModel.set({ id: 77, title: "Throttled (" + Date.now() + ")", done: false });
    modelLog.value.push("[throttle] throttledModel.set()");
}
function clearModelLog() {
    modelLog.value = [];
}
function clearTrackLog() {
    trackLog.value = [];
}
</script>

<template>
    <PageLayout title="Composables">
        <template #subtitle>
            <code>useStoreAction</code>, <code>useStoreModel</code>, <code>useStoreView</code>
        </template>

        <!-- Todo List -->
        <div class="toolbar">
            <h2 data-testid="todo-count">{{ todosView.data.value.length }} todos</h2>
            <button class="btn btn-primary" data-testid="reload" @click="execute()">Reload</button>
            <button
                v-if="todoView.data.value.id"
                class="btn btn-sm"
                data-testid="clear-selection"
                @click="resetCurrent()"
            >
                Clear
            </button>
        </div>

        <div v-if="loading" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="list" data-testid="todo-list">
            <div
                v-for="todo in todosView.data.value"
                :key="todo.id"
                class="list-item"
                :class="{ selected: todoView.data.value.id === todo.id }"
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
                    <button class="btn btn-sm" data-testid="rename-todo" @click="renameTodo(todo)">Rename</button>
                    <button class="btn btn-sm" data-testid="rename-default" @click="renameDefault(todo)">
                        Default
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

            <div class="demo-box">
                <h4>Destructured</h4>
                <p class="desc">
                    <code>const { execute, status, loading, error, reset } = useStoreAction(store, "list")</code>
                </p>
                <div class="kv-grid">
                    <div class="kv">
                        <span class="kv-k">status</span
                        ><span class="kv-v" data-testid="action-status">{{ status }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">loading</span
                        ><span class="kv-v" data-testid="action-loading">{{ loading }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">error</span
                        ><span class="kv-v" data-testid="action-error">{{ error ?? "null" }}</span>
                    </div>
                </div>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="action-execute" @click="execute()">execute()</button>
                    <button class="btn btn-sm" data-testid="action-reset" @click="reset()">reset()</button>
                </div>
            </div>

            <div class="demo-box">
                <h4>Isolated</h4>
                <p class="desc"><code>useStoreAction(store, "list", { isolated: true })</code></p>
                <div class="kv-grid">
                    <div class="kv">
                        <span class="kv-k">status</span
                        ><span class="kv-v" data-testid="isolated-status">{{ isolatedAction.status }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">loading</span
                        ><span class="kv-v" data-testid="isolated-loading">{{ isolatedAction.loading }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">global</span
                        ><span class="kv-v" data-testid="global-status">{{ todoStore.action.list.status.value }}</span>
                    </div>
                </div>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="isolated-execute" @click="isolatedAction.execute()">
                        execute()
                    </button>
                    <button class="btn btn-sm" data-testid="isolated-reset" @click="isolatedAction.reset()">
                        reset()
                    </button>
                </div>
            </div>
        </div>

        <!-- useStoreModel -->
        <div class="section" data-testid="model-section">
            <h2>useStoreModel</h2>

            <div class="demo-box">
                <h4>One Model (current)</h4>
                <p class="desc"><code>const { set, patch, reset } = useStoreModel(store, "current")</code></p>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="model-set" @click="modelSet">set()</button>
                    <button class="btn btn-sm" data-testid="model-patch" @click="modelPatch">patch()</button>
                    <button class="btn btn-sm" data-testid="model-reset" @click="modelReset">reset()</button>
                </div>
                <pre data-testid="model-current-value">{{ JSON.stringify(todoView.data.value, null, 2) }}</pre>
            </div>

            <div class="demo-box">
                <h4>Many Model (list)</h4>
                <p class="desc"><code>const { add, remove } = useStoreModel(store, "list")</code></p>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="model-add" @click="modelAdd">add()</button>
                    <button class="btn btn-sm" data-testid="model-remove" @click="modelRemove">remove()</button>
                </div>
            </div>

            <div class="demo-box">
                <h4>Debounce / Throttle</h4>
                <p class="desc"><code>useStoreModel(store, "current", { debounce: 500 })</code></p>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="model-debounce" @click="debouncedSet">
                        debounce.set()
                    </button>
                    <button class="btn btn-sm" data-testid="model-throttle" @click="throttledSet">
                        throttle.set()
                    </button>
                </div>
            </div>

            <div v-if="modelLog.length" class="log-box" data-testid="model-log">
                <div class="log-head">
                    <span>Log</span>
                    <button class="btn btn-sm" @click="clearModelLog">Clear</button>
                </div>
                <div v-for="(entry, i) in modelLog" :key="i" class="log-line">{{ entry }}</div>
            </div>
        </div>

        <!-- useStoreView -->
        <div class="section" data-testid="view-section">
            <h2>useStoreView</h2>

            <div class="demo-box">
                <h4>Data</h4>
                <p class="desc"><code>const todoView = useStoreView(store, "todo")</code></p>
                <div class="kv-grid">
                    <div class="kv">
                        <span class="kv-k">.data.value</span
                        ><span class="kv-v" data-testid="view-data-value">{{
                            JSON.stringify(todoView.data.value)
                        }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">.data.value.title</span
                        ><span class="kv-v" data-testid="view-data-title">{{ todoView.data.value.title }}</span>
                    </div>
                    <div class="kv">
                        <span class="kv-k">.data.value.done</span
                        ><span class="kv-v" data-testid="view-data-done">{{ todoView.data.value.done }}</span>
                    </div>
                </div>
            </div>

            <div class="demo-box">
                <h4>Pending View</h4>
                <p class="desc"><code>const pendingView = useStoreView(store, "pending")</code></p>
                <pre data-testid="view-pending">{{
                    JSON.stringify(
                        pendingView.data.value.map((t: Todo) => t.title),
                        null,
                        2,
                    )
                }}</pre>
            </div>

            <div class="demo-box">
                <h4>Track</h4>
                <p class="desc"><code>todoView.track(handler)</code></p>
                <div class="btn-row">
                    <button class="btn btn-sm" data-testid="track-start" :disabled="isTracking" @click="startTrack">
                        Start
                    </button>
                    <button class="btn btn-sm" data-testid="track-stop" :disabled="!isTracking" @click="stopTrack">
                        Stop
                    </button>
                </div>
                <div v-if="trackLog.length" class="log-box" data-testid="track-log">
                    <div class="log-head">
                        <span>Log</span>
                        <button class="btn btn-sm" @click="clearTrackLog">Clear</button>
                    </div>
                    <div v-for="(entry, i) in trackLog" :key="i" class="log-line">{{ entry }}</div>
                </div>
            </div>
        </div>

        <template #footer>
            <FeatureInfo>
                <li><code>useStoreAction(store, key)</code> - { execute, status, loading, error, reset }</li>
                <li><code>{ isolated: true }</code> - Isolated status tracking</li>
                <li><code>handler(cb, { payload })</code> - Definition-level default</li>
                <li><code>execute({ payload })</code> - Call-time override</li>
                <li><code>useStoreModel(store, key)</code> - { set, patch, reset }</li>
                <li><code>useStoreModel</code> many - { add, remove }</li>
                <li><code>{ debounce }</code> / <code>{ throttle }</code> - Rate-limited mutations</li>
                <li><code>useStoreView(store, key)</code> - { data, track }</li>
                <li><code>track(handler)</code> - Watch view changes</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>

<style scoped>
.selected {
    border-color: var(--blue);
}

.demo-box {
    margin-top: 10px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
}

.demo-box h4 {
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 4px;
}

.demo-box .desc {
    font-size: 0.72rem;
    color: var(--text-4);
    margin-bottom: 10px;
}

.demo-box .desc code {
    font-family: var(--mono);
    font-size: 0.68rem;
    color: var(--blue);
    background: var(--blue-dim);
    padding: 1px 5px;
    border-radius: 4px;
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

.kv-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 6px;
    margin-bottom: 10px;
}

.kv {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    background: var(--bg-inset);
    border-radius: 8px;
    border: 1px solid var(--border);
}

.kv-k {
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--text-4);
    text-transform: uppercase;
    letter-spacing: 0.02em;
}

.kv-v {
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--text-2);
    word-break: break-all;
}

.btn-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
}

.log-box {
    margin-top: 10px;
    padding: 10px;
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: 8px;
    max-height: 180px;
    overflow-y: auto;
}

.log-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-4);
    text-transform: uppercase;
}

.log-line {
    font-family: var(--mono);
    font-size: 0.72rem;
    padding: 2px 0;
    color: var(--text-3);
}
</style>
