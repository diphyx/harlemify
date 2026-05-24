<script setup lang="ts">
import { scopeProbeStore } from "../stores/scope-probe";

// First-access happens here, inside this component's setup scope.
// With the fix, the lazy store creates itself in a detached scope
// and survives this component being unmounted.
const value = scopeProbeStore.view.value;
const mutations = scopeProbeStore.view.mutations;
</script>

<template>
    <div class="probe" data-testid="lazy-scope-probe">
        <div>
            <strong>probe value:</strong>
            <span data-testid="probe-value">{{ value }}</span>
        </div>
        <div>
            <strong>probe mutations:</strong>
            <span data-testid="probe-mutations">{{ mutations }}</span>
        </div>
    </div>
</template>

<style scoped>
.probe {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--bg-inset);
    border: 1px dashed var(--border);
    border-radius: 8px;
    font-size: 0.78rem;
}
</style>
