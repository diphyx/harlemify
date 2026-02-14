<script setup lang="ts">
import { configStore, configShape } from "../stores/config";

const languageInput = ref("");

onMounted(() => configStore.action.get());

watch(
    configStore.view.config,
    (val) => {
        if (val) {
            languageInput.value = val.language;
            if (import.meta.client) {
                document.documentElement.setAttribute("data-theme", val.theme);
            }
        }
    },
    { immediate: true },
);

async function toggleTheme() {
    if (!configStore.view.config.value) return;
    const newTheme = configStore.view.config.value.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    await configStore.action.update({ body: { theme: newTheme } });
}

async function updateLanguage() {
    if (!configStore.view.config.value || !languageInput.value.trim()) return;
    await configStore.action.update({ body: { language: languageInput.value.trim() } });
}

async function toggleNotifications() {
    if (!configStore.view.config.value) return;
    await configStore.action.update({ body: { notifications: !configStore.view.config.value.notifications } });
}

async function resetConfig() {
    await configStore.action.replace({
        body: configShape.defaults({ theme: "dark", language: "en", notifications: true }),
    });
}

async function silentReset() {
    await configStore.action.silentReset();
}

async function silentUpdate() {
    await configStore.action.silentUpdate({ payload: { language: "fr" } });
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Config</h1>
            <p>Singleton store using <code>model.one()</code> with <code>ActionOneMode</code></p>
        </div>

        <div v-if="configStore.action.get.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else-if="configStore.view.config.value" class="config-list" data-testid="config-content">
            <div class="config-item" data-testid="config-theme">
                <div>
                    <strong>Theme</strong>
                    <span class="value" data-testid="theme-value">{{ configStore.view.config.value.theme }}</span>
                </div>
                <button class="btn btn-sm" data-testid="toggle-theme" @click="toggleTheme">Toggle</button>
            </div>

            <div class="config-item" data-testid="config-language">
                <div>
                    <strong>Language</strong>
                </div>
                <form class="config-input" @submit.prevent="updateLanguage">
                    <input v-model="languageInput" type="text" data-testid="language-input" />
                    <button type="submit" class="btn btn-sm" data-testid="update-language">Update</button>
                </form>
            </div>

            <div class="config-item" data-testid="config-notifications">
                <div>
                    <strong>Notifications</strong>
                    <span class="value" data-testid="notifications-value">{{
                        configStore.view.config.value.notifications ? "on" : "off"
                    }}</span>
                </div>
                <button class="btn btn-sm" data-testid="toggle-notifications" @click="toggleNotifications">
                    Toggle
                </button>
            </div>

            <div class="config-item" data-testid="config-reset">
                <div>
                    <strong>Reset</strong>
                    <span class="value">restore defaults</span>
                </div>
                <button class="btn btn-sm" data-testid="reset-config" @click="resetConfig">Reset</button>
            </div>

            <div class="config-item" data-testid="config-default-reset">
                <div>
                    <strong>Default Reset</strong>
                    <span class="value">reset to function default</span>
                </div>
                <button class="btn btn-sm" data-testid="default-reset" @click="configStore.action.defaultReset()">
                    Default Reset
                </button>
            </div>

            <div class="config-item" data-testid="config-pure-reset">
                <div>
                    <strong>Pure Reset</strong>
                    <span class="value">reset to null (skip custom default)</span>
                </div>
                <button class="btn btn-sm" data-testid="pure-reset" @click="configStore.action.pureReset()">
                    Pure Reset
                </button>
            </div>

            <div class="config-item" data-testid="config-silent-reset">
                <div>
                    <strong>Silent Reset</strong>
                    <span class="value">pure reset without hooks</span>
                </div>
                <button class="btn btn-sm" data-testid="silent-reset" @click="silentReset">Silent Reset</button>
            </div>

            <div class="config-item" data-testid="config-silent-update">
                <div>
                    <strong>Silent Update</strong>
                    <span class="value">patch language to "fr" (skip post hook)</span>
                </div>
                <button class="btn btn-sm" data-testid="silent-update" @click="silentUpdate">Silent Update</button>
            </div>

            <div class="detail" data-testid="raw-data">
                <h3>Raw Data (view.config)</h3>
                <pre>{{ JSON.stringify(configStore.view.config.value, null, 2) }}</pre>
            </div>

            <div class="detail" data-testid="meta-data">
                <h3>Meta (function default)</h3>
                <pre>{{ JSON.stringify(configStore.view.meta.value, null, 2) }}</pre>
            </div>

            <!-- Action Status -->
            <div class="monitor-status" data-testid="action-status">
                <h3>Action Status</h3>
                <div class="monitor-grid">
                    <div class="monitor-item" data-testid="status-get">
                        <span class="monitor-label">get</span>
                        <span class="monitor-state" :data-status="configStore.action.get.status.value">{{
                            configStore.action.get.status.value
                        }}</span>
                        <span class="monitor-flags">
                            <span v-if="configStore.action.get.loading.value" class="flag" data-flag="pending"
                                >pending</span
                            >
                            <span v-if="configStore.action.get.error.value" class="flag" data-flag="failed">error</span>
                        </span>
                    </div>
                    <div class="monitor-item" data-testid="status-update">
                        <span class="monitor-label">update</span>
                        <span class="monitor-state" :data-status="configStore.action.update.status.value">{{
                            configStore.action.update.status.value
                        }}</span>
                        <span class="monitor-flags">
                            <span v-if="configStore.action.update.loading.value" class="flag" data-flag="pending"
                                >pending</span
                            >
                            <span v-if="configStore.action.update.error.value" class="flag" data-flag="failed"
                                >error</span
                            >
                        </span>
                    </div>
                    <div class="monitor-item" data-testid="status-replace">
                        <span class="monitor-label">replace</span>
                        <span class="monitor-state" :data-status="configStore.action.replace.status.value">{{
                            configStore.action.replace.status.value
                        }}</span>
                        <span class="monitor-flags">
                            <span v-if="configStore.action.replace.loading.value" class="flag" data-flag="pending"
                                >pending</span
                            >
                            <span v-if="configStore.action.replace.error.value" class="flag" data-flag="failed"
                                >error</span
                            >
                        </span>
                    </div>
                </div>
            </div>

            <!-- Feature Info -->
            <div class="feature-info" data-testid="feature-info">
                <h3>Features Demonstrated</h3>
                <ul>
                    <li><code>model.one(shape)</code> - Singleton state management</li>
                    <li><code>ActionOneMode.SET</code> - Replace entire value</li>
                    <li><code>ActionOneMode.PATCH</code> - Partial update (merge)</li>
                    <li><code>api.put()</code> - Full replace via PUT method</li>
                    <li><code>action.get.status</code> - Reactive action status</li>
                    <li><code>action.get.loading</code> - Computed loading boolean</li>
                    <li><code>action.get.error</code> - Reactive error state</li>
                    <li><code>view.theme</code> / <code>view.language</code> - Derived computed views</li>
                    <li><code>shape.defaults(overrides)</code> - Auto-generate defaults with overrides for reset</li>
                    <li><code>pre / post</code> - Model hooks fired on every mutation</li>
                    <li><code>silent: true</code> - Skip both pre and post hooks</li>
                    <li><code>silent: ModelSilent.POST</code> - Skip only post hook</li>
                    <li><code>pure: true</code> - Reset to fallback value instead of custom default</li>
                    <li><code>lazy: true</code> - Defer store initialization until first access</li>
                    <li><code>default: () => (...)</code> - Function default for fresh values on reset</li>
                </ul>
            </div>
        </div>

        <div v-else class="loading" data-testid="no-data">
            No config available
            <button
                class="btn btn-sm"
                data-testid="restore-default"
                @click="configStore.action.defaultReset()"
                style="margin-top: 12px"
            >
                Restore Default
            </button>
        </div>
    </div>
</template>

<style scoped>
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
