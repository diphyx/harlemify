# Advanced

Features for fine-tuning store behavior and debugging.

| Feature                               | Description                                                               |
| ------------------------------------- | ------------------------------------------------------------------------- |
| [Concurrency](concurrency.md)         | Control what happens when an action is called while already pending       |
| [Cancellation](cancellation.md)       | Cancel in-flight requests using `AbortSignal`                             |
| [Isolated Status](isolated-status.md) | Track action status and errors independently across different UI contexts |
| [Lazy Store](lazy-store.md)           | Defer store initialization until first access with `lazy: true`           |
| [Logging](logging.md)                 | Enable per-store debug logging via Consola                                |
