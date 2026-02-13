<script setup lang="ts">
import { teamStore, teamMemberShape, type TeamMember } from "../stores/team";

const showModal = ref(false);
const newTeamName = ref("");
const newMemberName = ref("");
const newMemberRole = ref("");
const newMembers = ref<TeamMember[]>([]);

onMounted(() => teamStore.action.load());

function openCreate() {
    newTeamName.value = "";
    newMembers.value = [teamMemberShape.defaults()];
    showModal.value = true;
}

function addMember() {
    newMembers.value.push(teamMemberShape.defaults());
}

function removeMember(index: number) {
    newMembers.value.splice(index, 1);
}

async function saveTeam() {
    const name = newTeamName.value.trim();
    if (!name || newMembers.value.length === 0) return;

    const members = newMembers.value.map((m, i) => ({
        ...m,
        id: Date.now() + i,
    }));

    await teamStore.action.addTeam({ payload: { name, members } });
    showModal.value = false;
}

async function removeTeam(name: string) {
    if (confirm(`Remove team "${name}"?`)) {
        await teamStore.action.removeTeam({ payload: name });
    }
}

async function addMemberToTeam(teamName: string) {
    const name = newMemberName.value.trim();
    const role = newMemberRole.value.trim();
    if (!name || !role) return;

    const current = teamStore.view.teams.value[teamName] ?? [];
    const member: TeamMember = { id: Date.now(), name, role };
    await teamStore.action.patchTeam({
        payload: {
            name: teamName,
            members: [...current, member],
        },
    });

    newMemberName.value = "";
    newMemberRole.value = "";
}

function resetAll() {
    teamStore.model.groups.reset();
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Teams</h1>
            <p>Record store using <code>model.many(shape, { kind: "record" })</code></p>
        </div>

        <div class="toolbar">
            <h2 data-testid="team-count">
                {{ teamStore.view.count.value }} teams · {{ teamStore.view.totalMembers.value }} members
            </h2>
            <button class="btn btn-primary" data-testid="add-team" @click="openCreate">Add Team</button>
        </div>

        <div class="toolbar" style="margin-top: 12px">
            <button class="btn btn-sm" data-testid="reset-all" @click="resetAll">Reset All</button>
            <button class="btn btn-sm" data-testid="reload" @click="teamStore.action.load()">Reload</button>
        </div>

        <div v-if="teamStore.action.load.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="team-grid">
            <div v-for="name in teamStore.view.names.value" :key="name" class="card" :data-testid="`team-${name}`">
                <div class="card-body">
                    <h3 data-testid="team-name">{{ name }}</h3>
                    <ul class="member-list">
                        <li v-for="member in teamStore.view.teams.value[name]" :key="member.id">
                            <strong>{{ member.name }}</strong> — {{ member.role }}
                        </li>
                    </ul>
                    <div class="add-member-form">
                        <input v-model="newMemberName" placeholder="Name" class="input-sm" />
                        <input v-model="newMemberRole" placeholder="Role" class="input-sm" />
                        <button class="btn btn-sm" @click="addMemberToTeam(name)">Add</button>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-danger" data-testid="remove-team" @click="removeTeam(name)">
                        Remove Team
                    </button>
                </div>
            </div>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-load">
                    <span class="monitor-label">load</span>
                    <span class="monitor-state" :data-status="teamStore.action.load.status.value">{{
                        teamStore.action.load.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-addTeam">
                    <span class="monitor-label">addTeam</span>
                    <span class="monitor-state" :data-status="teamStore.action.addTeam.status.value">{{
                        teamStore.action.addTeam.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-removeTeam">
                    <span class="monitor-label">removeTeam</span>
                    <span class="monitor-state" :data-status="teamStore.action.removeTeam.status.value">{{
                        teamStore.action.removeTeam.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-patchTeam">
                    <span class="monitor-label">patchTeam</span>
                    <span class="monitor-state" :data-status="teamStore.action.patchTeam.status.value">{{
                        teamStore.action.patchTeam.status.value
                    }}</span>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li>
                    <code>many(shape, { kind: "record" })</code> — Keyed collection
                    <code>Record&lt;string, S[]&gt;</code>
                </li>
                <li><code>model.groups.set(value)</code> — Replace entire record</li>
                <li><code>model.groups.reset()</code> — Clear to <code>{}</code></li>
                <li><code>model.groups.add(key, value)</code> — Add a key entry</li>
                <li><code>model.groups.patch(value)</code> — Merge keys into record</li>
                <li><code>model.groups.remove(key)</code> — Remove a key entry</li>
                <li><code>pre / post</code> — Model hooks fired on every mutation</li>
                <li><code>silent: ModelSilent.POST</code> — Skip post hook (used in removeTeam)</li>
            </ul>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal" data-testid="team-modal">
                <h2>Add Team</h2>
                <form @submit.prevent="saveTeam">
                    <div class="form-group">
                        <label>Team Name</label>
                        <input v-model="newTeamName" required data-testid="input-team-name" />
                    </div>
                    <div v-for="(member, index) in newMembers" :key="index" class="form-group member-row">
                        <input v-model="member.name" placeholder="Name" required />
                        <input v-model="member.role" placeholder="Role" required />
                        <button
                            v-if="newMembers.length > 1"
                            type="button"
                            class="btn btn-sm btn-danger"
                            @click="removeMember(index)"
                        >
                            ×
                        </button>
                    </div>
                    <button type="button" class="btn btn-sm" style="margin-bottom: 16px" @click="addMember">
                        + Add Member
                    </button>
                    <div class="modal-actions">
                        <button type="button" class="btn" data-testid="cancel-modal" @click="showModal = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" data-testid="save-team">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.member-list {
    margin: 8px 0;
    padding-left: 20px;
}

.member-list li {
    margin-bottom: 4px;
}

.member-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.member-row input {
    flex: 1;
}

.add-member-form {
    display: flex;
    gap: 8px;
    margin-top: 12px;
}

.input-sm {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-tertiary);
    color: var(--text-primary);
    font-size: 13px;
    flex: 1;
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
</style>
