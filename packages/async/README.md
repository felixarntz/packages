# @felixarntz/async

Async helpers for delay, deadline, and retry.

## Setup

```bash
npm i @felixarntz/async
```

## API

### `withDelay`

Waits `delayMs`, then calls `fn`. An abort during the wait rejects with the outer signal's `reason` and does not call `fn`.

```ts
const value = await withDelay({
  delayMs: 200,
  fn: async ({ abortSignal }) => {
    abortSignal.throwIfAborted();
    return "done";
  },
});
```

### `withDeadline`

Calls `fn` immediately with a signal that aborts after `deadlineMs`, and when the outer signal aborts. If that signal wins the race, the helper rejects with its `reason`. A deadline's reason is Node's `TimeoutError` `DOMException`.

```ts
const response = await withDeadline({
  deadlineMs: 1000,
  fn: async ({ abortSignal }) => fetch(url, { signal: abortSignal }),
});
```

### `withRetry`

Calls `fn` with retries. With `retries: 0`, it runs `fn` once; with `retries: n`, it runs `fn` at most `n + 1` times. The first attempt starts immediately. After a failure, the helper waits `retryDelayMs` before the next attempt. A function receives a 1-indexed `retryCount`: `1` is the delay before the second attempt.

An aborted outer signal stops the loop and rejects with that signal's `reason`. Any other failure spends one try. After the last try, the helper rejects with the error `fn` threw.

```ts
const response = await withRetry({
  retries: 2,
  retryDelayMs: 100,
  fn: async ({ abortSignal }) => fetch(url, { signal: abortSignal }),
});
```

## Callback contract

Every helper in this package follows the same callback contract. New helpers must follow it too.

- `fn` receives an object whose only field is `abortSignal`.
- The helper fulfills with the same `T` that `fn` fulfills with.
- `abortSignal` on the helper options is optional. Aborting it stops the helper.
- The `abortSignal` passed to `fn` is always a new instance. It aborts when the outer signal aborts. A helper may also abort it for its own condition, such as a deadline.
- A call that omits the outer signal still creates an `abortSignal` for `fn`.

```ts
type AsyncCallbackFn<T> = (options: { abortSignal: AbortSignal }) => Promise<T>;

type AsyncHelper = <T>(options: {
  fn: AsyncCallbackFn<T>;
  abortSignal?: AbortSignal;
}) => Promise<T>;
```

`createWithDelay`, `createWithDeadline`, and `createWithRetry` return an `AsyncHelper` with their extra fields closed over. `withDelay`, `withDeadline`, and `withRetry` are shortcuts that create that helper and run it.

`compose` nests `AsyncHelper` values. The first helper is the outermost.

```ts
const withRetryAndDeadline = compose([
  createWithDeadline({ deadlineMs: 2000 }),
  createWithRetry({ retries: 3, retryDelayMs: 300 }),
]);

const result = await withRetryAndDeadline({ fn, abortSignal });
```

That deadline wraps the whole retry loop. After 2000ms the deadline aborts, and retry does not start another attempt.
