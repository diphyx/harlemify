<script setup lang="ts">
import { userStore, type User } from "../stores/user";

const { user, users, getUser, getUsers, postUsers, patchUsers, deleteUsers, getUsersIsPending } =
    useStoreAlias(userStore);

const showModal = ref(false);
const editing = ref<User | null>(null);
const form = ref({ name: "", email: "" });

onMounted(() => getUsers());

function openCreate() {
    editing.value = null;
    form.value = { name: "", email: "" };
    showModal.value = true;
}

function openEdit(user: User) {
    editing.value = user;
    form.value = {
        name: user.name,
        email: user.email,
    };
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        await patchUsers([
            {
                id: editing.value.id,
                name: form.value.name,
                email: form.value.email,
            },
        ]);
    } else {
        await postUsers([{ id: Date.now(), ...form.value }]);
    }
    showModal.value = false;
}

async function remove(u: User) {
    if (confirm(`Delete "${u.name}"?`)) {
        await deleteUsers([{ id: u.id }]);
    }
}

async function select(u: User) {
    await getUser({ id: u.id });
}

function clearUser() {
    userStore.memory.setUnit(null);
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Users</h1>
            <p>Collection store using <code>useStoreAlias</code> composable</p>
        </div>

        <div class="toolbar">
            <h2>{{ users.length }} users</h2>
            <button class="btn btn-primary" @click="openCreate">Add User</button>
        </div>

        <div v-if="getUsersIsPending" class="loading">Loading...</div>

        <div v-else class="grid">
            <div v-for="u in users" :key="u.id" class="card">
                <div class="card-body">
                    <h3>{{ u.name }}</h3>
                    <p class="subtitle">{{ u.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" @click="select(u)">View</button>
                    <button class="btn btn-sm" @click="openEdit(u)">Edit</button>
                    <button class="btn btn-sm btn-danger" @click="remove(u)">Delete</button>
                </div>
            </div>
        </div>

        <div v-if="user" class="detail">
            <h3>Selected User (user)</h3>
            <pre>{{ JSON.stringify(user, null, 2) }}</pre>
            <button class="btn btn-sm" style="margin-top: 12px" @click="clearUser">Clear</button>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal">
                <h2>{{ editing ? "Edit User" : "Add User" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="form.name" required >
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input v-model="form.email" type="email" required >
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" @click="showModal = false">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
