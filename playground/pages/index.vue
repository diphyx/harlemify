<template>
    <div class="container">
        <header class="header">
            <h1>Harlemify</h1>
            <p>API State Management for Nuxt 3+</p>
        </header>

        <div class="home-grid">
            <NuxtLink to="/config" class="home-card">
                <h2>Config</h2>
                <p>Singleton store with <code>model.one()</code></p>
                <span class="badge">ActionOneMode</span>
            </NuxtLink>

            <NuxtLink to="/users" class="home-card">
                <h2>Users</h2>
                <p>Collection with <code>merge</code>, <code>commit</code>, <code>unique</code>, <code>by</code></p>
                <span class="badge">ActionManyMode + mutations</span>
            </NuxtLink>

            <NuxtLink to="/posts" class="home-card">
                <h2>Posts</h2>
                <p>Collection with <code>handle()</code> and <code>commit.mode</code> override</p>
                <span class="badge">handle + view.merge</span>
            </NuxtLink>

            <NuxtLink to="/projects" class="home-card">
                <h2>Projects</h2>
                <p>Concurrent, transformer, signal, bind, error handling</p>
                <span class="badge">advanced + concurrent</span>
            </NuxtLink>
        </div>

        <footer class="footer">
            <a href="https://github.com/diphyx/harlemify" target="_blank">@diphyx/harlemify</a>
        </footer>
    </div>
</template>
