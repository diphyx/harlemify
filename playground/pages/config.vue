<script setup lang="ts">
import { configStore, configShape } from "../stores/config";

const languageInput = ref("");

onMounted(() => configStore.action.get());

watch(
    configStore.view.config,
    (val) => {
        languageInput.value = val.language;
        if (import.meta.client) {
            document.documentElement.setAttribute("data-theme", val.theme);
        }
    },
    { immediate: true },
);

async function toggleTheme() {
    const newTheme = configStore.view.config.value.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    await configStore.action.update({ body: { theme: newTheme } });
}

async function updateLanguage() {
    if (!languageInput.value.trim()) return;
    await configStore.action.update({ body: { language: languageInput.value.trim() } });
}

async function toggleNotifications() {
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
    <PageLayout title="Config">
        <template #subtitle> Singleton store using <code>model.one()</code> with <code>ActionOneMode</code> </template>

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
                    <input v-model="languageInput" type="text" data-testid="language-input" >
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
                    <span class="value">function default</span>
                </div>
                <button class="btn btn-sm" data-testid="default-reset" @click="configStore.action.defaultReset()">
                    Default Reset
                </button>
            </div>

            <div class="config-item" data-testid="config-silent-reset">
                <div>
                    <strong>Silent Reset</strong>
                    <span class="value">skip hooks</span>
                </div>
                <button class="btn btn-sm" data-testid="silent-reset" @click="silentReset">Silent Reset</button>
            </div>

            <div class="config-item" data-testid="config-silent-update">
                <div>
                    <strong>Silent Update</strong>
                    <span class="value">lang → "fr"</span>
                </div>
                <button class="btn btn-sm" data-testid="silent-update" @click="silentUpdate">Silent Update</button>
            </div>
        </div>

        <div v-else class="loading" data-testid="no-data">
            No config available
            <button
                class="btn btn-sm"
                data-testid="restore-default"
                style="margin-top: 12px"
                @click="configStore.action.defaultReset()"
            >
                Restore Default
            </button>
        </div>

        <template #aside>
            <div class="aside-panel" data-testid="raw-data">
                <div class="aside-panel-title">view.config</div>
                <pre class="aside-pre">{{ JSON.stringify(configStore.view.config.value, null, 2) }}</pre>
            </div>

            <div class="aside-panel" data-testid="meta-data">
                <div class="aside-panel-title">view.meta</div>
                <pre class="aside-pre">{{ JSON.stringify(configStore.view.meta.value, null, 2) }}</pre>
            </div>

            <ActionStatus
                :actions="{
                    get: configStore.action.get,
                    update: configStore.action.update,
                    replace: configStore.action.replace,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
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
                <li><code>lazy: true</code> - Defer store initialization until first access</li>
                <li><code>default: () => (...)</code> - Function default for fresh values on reset</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>
