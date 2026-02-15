<script setup lang="ts">
import { userStore, userShape, type User } from "../stores/user";

const showForm = ref(false);
const editing = ref<User | null>(null);
const form = ref(userShape.defaults());

onMounted(() => userStore.action.list());

function openCreate() {
    editing.value = null;
    form.value = userShape.defaults();
    showForm.value = true;
}

function openEdit(user: User) {
    editing.value = user;
    form.value = userShape.defaults({ name: user.name, email: user.email });
    showForm.value = true;
}

async function save() {
    if (editing.value) {
        userStore.model.current.set(editing.value);
        await userStore.action.update({
            body: { name: form.value.name, email: form.value.email },
        });
    } else {
        await userStore.action.create({
            body: { ...form.value, id: Date.now() },
        });
    }
    showForm.value = false;
}

async function remove(u: User) {
    if (confirm(`Delete "${u.name}"?`)) {
        userStore.model.current.set(u);
        await userStore.action.delete();
    }
}

async function select(u: User) {
    userStore.model.current.set(u);
    await nextTick();
    await userStore.action.get();
}

function clearSelection() {
    userStore.model.current.reset();
}

async function clearAll() {
    await userStore.action.clear();
}

async function addUniqueUser() {
    const first = userStore.view.users.value[0];
    if (!first) return;
    await userStore.action.addUnique({
        body: { id: first.id, name: first.name + " (dup)", email: first.email },
    });
}

async function patchByEmailDemo() {
    userStore.model.current.set(userStore.view.user.value);
    await userStore.action.patchByEmail({
        body: { email: userStore.view.user.value.email, name: userStore.view.user.value.name + " (by email)" },
    });
}

async function silentAddUser() {
    await userStore.action.silentAdd({
        payload: { id: Date.now(), name: "Silent User", email: "silent@test.com" },
    });
}

function resetListAction() {
    userStore.action.list.reset();
}
</script>

<template>
    <PageLayout title="Users">
        <template #subtitle>
            Collection store using <code>model.many()</code> with <code>ActionManyMode</code>
        </template>

        <div class="toolbar">
            <h2 data-testid="user-count">{{ userStore.view.count.value }} users</h2>
            <button class="btn btn-primary" data-testid="add-user" @click="openCreate">Add User</button>
        </div>

        <div class="toolbar">
            <button class="btn btn-sm" data-testid="clear-all-users" @click="clearAll">Clear All</button>
            <button class="btn btn-sm" data-testid="add-unique-user" @click="addUniqueUser">Add Unique</button>
            <button
                class="btn btn-sm"
                data-testid="patch-by-email"
                :disabled="!userStore.view.user.value.id"
                @click="patchByEmailDemo"
            >
                Patch by Email
            </button>
            <button class="btn btn-sm" data-testid="silent-add-user" @click="silentAddUser">Silent Add</button>
            <button class="btn btn-sm" data-testid="reset-list-action" @click="resetListAction">Reset Action</button>
        </div>

        <div v-if="showForm" class="inline-form" data-testid="user-form">
            <h3>{{ editing ? "Edit User" : "Add User" }}</h3>
            <form @submit.prevent="save">
                <div class="form-row">
                    <input v-model="form.name" placeholder="Name" required data-testid="input-name" >
                    <input v-model="form.email" type="email" placeholder="Email" required data-testid="input-email" >
                    <button type="submit" class="btn btn-sm btn-primary" data-testid="save-user">Save</button>
                    <button type="button" class="btn btn-sm" data-testid="cancel-form" @click="showForm = false">
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <div v-if="userStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="user-grid">
            <div v-for="u in userStore.view.users.value" :key="u.id" class="card" :data-testid="`user-${u.id}`">
                <div class="card-body">
                    <h3 data-testid="user-name">{{ u.name }}</h3>
                    <p class="subtitle" data-testid="user-email">{{ u.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" data-testid="view-user" @click="select(u)">View</button>
                    <button class="btn btn-sm" data-testid="edit-user" @click="openEdit(u)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-user" @click="remove(u)">Delete</button>
                </div>
            </div>
        </div>

        <template #aside>
            <div v-if="userStore.view.user.value.id" class="aside-panel" data-testid="selected-user">
                <div class="aside-panel-title">
                    Selected User
                    <button class="btn btn-sm" data-testid="clear-user" @click="clearSelection">Clear</button>
                </div>
                <pre class="aside-pre">{{ JSON.stringify(userStore.view.user.value, null, 2) }}</pre>
            </div>

            <div class="aside-panel" data-testid="cloned-sorted">
                <div class="aside-panel-title">view.sorted (clone)</div>
                <pre class="aside-pre">{{
                    JSON.stringify(
                        userStore.view.sorted.value.map((u: User) => u.name),
                        null,
                        2,
                    )
                }}</pre>
            </div>

            <div class="aside-panel" data-testid="merged-summary">
                <div class="aside-panel-title">view.summary (merge)</div>
                <pre class="aside-pre">{{ JSON.stringify(userStore.view.summary.value, null, 2) }}</pre>
            </div>

            <ActionStatus
                :actions="{
                    get: userStore.action.get,
                    list: userStore.action.list,
                    create: userStore.action.create,
                    update: userStore.action.update,
                    delete: userStore.action.delete,
                    clear: userStore.action.clear,
                    addUnique: userStore.action.addUnique,
                    patchByEmail: userStore.action.patchByEmail,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
                <li><code>model.many(shape)</code> - Collection state management</li>
                <li><code>ActionManyMode.SET</code> - Replace entire array</li>
                <li><code>ActionManyMode.ADD</code> - Append new items</li>
                <li><code>ActionManyMode.PATCH</code> - Update items by identifier</li>
                <li><code>ActionManyMode.REMOVE</code> - Remove items by identifier</li>
                <li><code>ActionManyMode.RESET</code> - Reset array to empty</li>
                <li><code>model("current", ActionOneMode.SET, user)</code> - Direct model mutation</li>
                <li><code>view.merge(["current", "list"], resolver)</code> - Multi-source merged view</li>
                <li><code>commit("list", ActionManyMode.RESET)</code> - Standalone commit without api/handle</li>
                <li><code>commit(..., { unique: true })</code> - Deduplicate on add</li>
                <li><code>commit(..., { by: "email" })</code> - Custom identifier field for patch</li>
                <li><code>action.list.reset()</code> - Reset action state to idle</li>
                <li><code>shape.defaults()</code> - Auto-generate zero-value form data from shape</li>
                <li><code>pre / post</code> - Model hooks fired on every mutation</li>
                <li><code>silent: true</code> - Skip both hooks (used in clear)</li>
                <li><code>silent: ModelSilent.PRE</code> - Skip only pre hook (used in silentAdd)</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>
