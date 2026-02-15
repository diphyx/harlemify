<script setup lang="ts">
import { useStoreCompose } from "../../src/runtime";
import { dashboardStore, type User, type Todo } from "../stores/dashboard";

const loadAll = useStoreCompose(dashboardStore, "loadAll");
const resetAll = useStoreCompose(dashboardStore, "resetAll");
const quickAdd = useStoreCompose(dashboardStore, "quickAdd");

const newUserName = ref("");
const newTodoTitle = ref("");

onMounted(() => loadAll.execute());

async function handleQuickAdd() {
    if (!newUserName.value || !newTodoTitle.value) return;
    await quickAdd.execute(newUserName.value, newTodoTitle.value);
    newUserName.value = "";
    newTodoTitle.value = "";
}

function selectUser(user: User) {
    dashboardStore.compose.selectUser(user);
}

function clearSelection() {
    dashboardStore.model.user.reset();
}

async function toggleTodo(todo: Todo) {
    await dashboardStore.action.toggleTodo({ payload: todo });
}

async function completeAll() {
    await dashboardStore.compose.completeAll();
}

async function resetDashboard() {
    await resetAll.execute();
}

async function deleteUser(user: User) {
    dashboardStore.model.user.set(user);
    await dashboardStore.action.deleteUser();
}
</script>

<template>
    <PageLayout title="Dashboard">
        <template #subtitle>Compose layer — orchestrate actions, models, and views</template>

        <!-- Summary -->
        <div class="stat-row" data-testid="summary">
            <div
                v-for="(key, label) in { Users: 'users', Todos: 'todos', Pending: 'pending', Done: 'done' } as const"
                :key="key"
                class="stat"
            >
                <span class="stat-value" :data-testid="`summary-${key}`">{{
                    dashboardStore.view.summary.value[key]
                }}</span>
                <span class="stat-label">{{ label }}</span>
            </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
            <button
                class="btn btn-primary"
                data-testid="load-all"
                :disabled="loadAll.active.value"
                @click="loadAll.execute()"
            >
                {{ loadAll.active.value ? "Loading..." : "Load All" }}
            </button>
            <button class="btn" data-testid="complete-all" @click="completeAll">Complete All</button>
            <button class="btn btn-danger" data-testid="reset-all" @click="resetDashboard">Reset</button>
        </div>

        <!-- Quick Add -->
        <div class="section" data-testid="quick-add-section">
            <h2>Quick Add</h2>
            <p class="subtitle"><code>compose.quickAdd(userName, todoTitle)</code></p>
            <form class="quick-add-form" @submit.prevent="handleQuickAdd">
                <input v-model="newUserName" placeholder="User name" data-testid="input-user-name" >
                <input v-model="newTodoTitle" placeholder="Todo title" data-testid="input-todo-title" >
                <button type="submit" class="btn btn-primary" data-testid="quick-add" :disabled="quickAdd.active.value">
                    {{ quickAdd.active.value ? "Adding..." : "Add" }}
                </button>
            </form>
        </div>

        <!-- Users -->
        <div class="section" data-testid="users-section">
            <h2>Users ({{ dashboardStore.view.userCount.value }})</h2>
            <div class="list" data-testid="user-list">
                <div
                    v-for="u in dashboardStore.view.users.value"
                    :key="u.id"
                    class="list-item"
                    :class="{ selected: dashboardStore.view.user.value.id === u.id }"
                    :data-testid="`user-${u.id}`"
                >
                    <div>
                        <h3 data-testid="user-name">{{ u.name }}</h3>
                        <p class="subtitle" data-testid="user-email">{{ u.email }}</p>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-sm" data-testid="select-user" @click="selectUser(u)">Select</button>
                        <button class="btn btn-sm btn-danger" data-testid="delete-user" @click="deleteUser(u)">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Todos -->
        <div class="section" data-testid="todos-section">
            <h2>Todos ({{ dashboardStore.view.todoCount.value }})</h2>
            <div class="list" data-testid="todo-list">
                <div
                    v-for="t in dashboardStore.view.todos.value"
                    :key="t.id"
                    class="list-item"
                    :data-testid="`todo-${t.id}`"
                >
                    <div>
                        <h3 :style="{ textDecoration: t.done ? 'line-through' : 'none' }" data-testid="todo-title">
                            {{ t.title }}
                        </h3>
                        <p class="subtitle">{{ t.done ? "Done" : "Pending" }}</p>
                    </div>
                    <div class="list-actions">
                        <button class="btn btn-sm" data-testid="toggle-todo" @click="toggleTodo(t)">
                            {{ t.done ? "Undo" : "Done" }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <template #aside>
            <div v-if="dashboardStore.view.user.value.id" class="aside-panel" data-testid="selected-user">
                <div class="aside-panel-title">
                    Selected User
                    <button class="btn btn-sm" data-testid="clear-selection" @click="clearSelection">Clear</button>
                </div>
                <pre class="aside-pre">{{ JSON.stringify(dashboardStore.view.user.value, null, 2) }}</pre>
            </div>

            <!-- Compose active states -->
            <div class="aside-panel" data-testid="compose-status">
                <div class="aside-panel-title">Compose Active</div>
                <div class="aside-states">
                    <div class="aside-state">
                        <span>loadAll</span>
                        <span :class="loadAll.active.value ? 'on' : 'off'" data-testid="active-load-all">{{
                            loadAll.active.value
                        }}</span>
                    </div>
                    <div class="aside-state">
                        <span>quickAdd</span>
                        <span :class="quickAdd.active.value ? 'on' : 'off'" data-testid="active-quick-add">{{
                            quickAdd.active.value
                        }}</span>
                    </div>
                    <div class="aside-state">
                        <span>resetAll</span>
                        <span :class="resetAll.active.value ? 'on' : 'off'" data-testid="active-reset-all">{{
                            resetAll.active.value
                        }}</span>
                    </div>
                    <div class="aside-state">
                        <span>completeAll</span>
                        <span
                            :class="dashboardStore.compose.completeAll.active.value ? 'on' : 'off'"
                            data-testid="active-complete-all"
                            >{{ dashboardStore.compose.completeAll.active.value }}</span
                        >
                    </div>
                    <div class="aside-state">
                        <span>selectUser</span>
                        <span
                            :class="dashboardStore.compose.selectUser.active.value ? 'on' : 'off'"
                            data-testid="active-select-user"
                            >{{ dashboardStore.compose.selectUser.active.value }}</span
                        >
                    </div>
                </div>
            </div>
        </template>

        <template #footer>
            <FeatureInfo>
                <li><code>compose(({ model, action }) => ({ ... }))</code> — define composed operations</li>
                <li><code>store.compose.loadAll()</code> — orchestrate multiple actions</li>
                <li><code>store.compose.resetAll()</code> — reset multiple models</li>
                <li><code>store.compose.selectUser(user)</code> — typed arg</li>
                <li><code>store.compose.quickAdd(name, title)</code> — typed args</li>
                <li><code>store.compose.completeAll()</code> — batch mutations</li>
                <li><code>compose.active</code> — reactive boolean</li>
                <li><code>useStoreCompose(store, key)</code> — composable</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>

<style scoped>
.stat-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 20px;
}

.stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 16px 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
    transition: border-color 0.15s ease;
}

.stat:hover {
    border-color: var(--border-hover);
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--blue);
    font-variant-numeric: tabular-nums;
}

.stat-label {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--text-4);
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.quick-add-form {
    display: flex;
    gap: 8px;
    align-items: center;
}

.quick-add-form input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--sans);
    font-size: 0.85rem;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.quick-add-form input:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px var(--blue-dim);
}

.selected {
    border-color: var(--blue);
}

.aside-states {
    padding: 8px 12px 12px;
}

.aside-state {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    font-size: 0.75rem;
    color: var(--text-3);
}

.aside-state .on {
    color: var(--green);
    font-family: var(--mono);
    font-size: 0.72rem;
}

.aside-state .off {
    color: var(--text-4);
    font-family: var(--mono);
    font-size: 0.72rem;
}
</style>
