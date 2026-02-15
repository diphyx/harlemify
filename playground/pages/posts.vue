<script setup lang="ts">
import { ModelManyMode } from "../../src/runtime";
import { postStore, postShape, type Post } from "../stores/post";

const showForm = ref(false);
const editing = ref<Post | null>(null);
const form = ref(postShape.defaults());

onMounted(() => postStore.action.list());

function openCreate() {
    editing.value = null;
    form.value = postShape.defaults();
    showForm.value = true;
}

function openEdit(post: Post) {
    editing.value = post;
    postStore.model.current.set(post);
    postStore.model.draft.set(post);
    form.value = postShape.defaults({ title: post.title, body: post.body, userId: post.userId });
    showForm.value = true;
}

watch(
    () => form.value.title,
    (title) => {
        if (editing.value) {
            postStore.model.draft.patch({ title });
        }
    },
);

async function save() {
    if (editing.value) {
        postStore.model.current.set(editing.value);
        await postStore.action.update({
            body: { title: form.value.title, body: form.value.body },
        });
    } else {
        await postStore.action.create({
            body: { ...form.value, id: Date.now() },
        });
    }
    postStore.model.draft.reset();
    showForm.value = false;
}

async function remove(post: Post) {
    if (confirm(`Delete "${post.title}"?`)) {
        postStore.model.current.set(post);
        await postStore.action.delete();
    }
}

async function sortPosts() {
    await postStore.action.sort();
}

async function appendFromServer() {
    await postStore.action.list({
        commit: { mode: ModelManyMode.ADD },
    });
}

function resetSortAction() {
    postStore.action.sort.reset();
}
</script>

<template>
    <PageLayout title="Posts">
        <template #subtitle>
            Collection store with <code>view.merge()</code> and <code>handle()</code> without API
        </template>

        <div class="toolbar">
            <h2 data-testid="post-count">{{ postStore.view.count.value }} posts</h2>
            <button class="btn btn-primary" data-testid="add-post" @click="openCreate">Add Post</button>
        </div>

        <div class="toolbar">
            <button class="btn btn-sm" data-testid="sort-posts" @click="sortPosts">Sort A-Z</button>
            <button class="btn btn-sm" data-testid="append-posts" @click="appendFromServer">Append from Server</button>
            <button class="btn btn-sm" data-testid="reset-sort" @click="resetSortAction">Reset Sort</button>
        </div>

        <div v-if="showForm" class="inline-form" data-testid="post-form">
            <h3>{{ editing ? "Edit Post" : "Add Post" }}</h3>
            <form @submit.prevent="save">
                <div class="form-row">
                    <input v-model="form.title" placeholder="Title" required data-testid="input-title" >
                    <button type="submit" class="btn btn-sm btn-primary" data-testid="save-post">Save</button>
                    <button type="button" class="btn btn-sm" data-testid="cancel-form" @click="showForm = false">
                        Cancel
                    </button>
                </div>
                <textarea
                    v-model="form.body"
                    rows="3"
                    placeholder="Body"
                    required
                    data-testid="input-body"
                    class="form-textarea"
                />
            </form>
        </div>

        <div v-if="postStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="list" data-testid="post-list">
            <div
                v-for="post in postStore.view.posts.value.slice(0, 15)"
                :key="post.id"
                class="list-item"
                :data-testid="`post-${post.id}`"
            >
                <div>
                    <h3 data-testid="post-title">{{ post.title }}</h3>
                    <p data-testid="post-body">{{ post.body.substring(0, 80) }}...</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" data-testid="edit-post" @click="openEdit(post)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-post" @click="remove(post)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <template #aside>
            <div class="aside-panel" data-testid="cloned-sorted">
                <div class="aside-panel-title">view.sorted (clone)</div>
                <pre class="aside-pre">{{
                    JSON.stringify(
                        postStore.view.sorted.value.map((p: Post) => p.title),
                        null,
                        2,
                    )
                }}</pre>
            </div>

            <div class="aside-panel" data-testid="merged-overview">
                <div class="aside-panel-title">view.overview (merge)</div>
                <pre class="aside-pre">{{ JSON.stringify(postStore.view.overview.value, null, 2) }}</pre>
            </div>

            <div class="aside-panel" data-testid="merged-editor">
                <div class="aside-panel-title">view.editor (3-model merge)</div>
                <pre class="aside-pre">{{ JSON.stringify(postStore.view.editor.value, null, 2) }}</pre>
            </div>

            <ActionStatus
                :actions="{
                    list: postStore.action.list,
                    create: postStore.action.create,
                    update: postStore.action.update,
                    delete: postStore.action.delete,
                    sort: postStore.action.sort,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
                <li><code>model.many(shape)</code> - Collection pattern for managing lists</li>
                <li><code>handle(async (&#123; view, commit &#125;) => ...)</code> - Standalone handle without API</li>
                <li><code>view.merge(["current", "list"], resolver)</code> - Multi-source merged view</li>
                <li><code>view.merge(["current", "draft", "list"], resolver)</code> - 3-model merged view</li>
                <li>
                    <code>action(&#123; commit: &#123; mode: ActionManyMode.ADD &#125; &#125;)</code> - Call-time
                    commit.mode override
                </li>
                <li><code>action.sort.reset()</code> - Reset action state</li>
                <li><code>action(&#123; body &#125;)</code> - Call-time payload with body data</li>
                <li><code>shape.defaults()</code> - Auto-generate zero-value form data from shape</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>
