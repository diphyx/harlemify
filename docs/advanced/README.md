# Advanced

Features for fine-tuning action behavior and debugging.

## [Concurrency](concurrency.md)

Control what happens when an action is called while already pending. Four strategies: `BLOCK` (throw error), `SKIP` (return existing promise), `CANCEL` (abort previous, start new), `ALLOW` (run both). Set at definition time, call time, or globally.

## [Cancellation](cancellation.md)

Cancel in-flight requests using `AbortSignal`. Pass a signal via the `signal` call-time option, or use `ActionConcurrent.CANCEL` for automatic cancellation of previous calls.

## [Debug Logging](logging.md)

Enable per-store debug logging with Consola. See model mutations, action lifecycle, API requests, commit phases, and concurrency events. Configure via `harlemify.logger` in `nuxt.config.ts`.

## [Isolated Status](isolated-status.md)

Track action status and errors independently across different UI contexts. Use `useIsolatedActionStatus` and `useIsolatedActionError` composables with the `bind` call-time option.
