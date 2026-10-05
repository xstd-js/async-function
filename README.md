[![npm (scoped)](https://img.shields.io/npm/v/@xstd/async-function.svg)](https://www.npmjs.com/package/@xstd/async-function)
![npm](https://img.shields.io/npm/dm/@xstd/async-function.svg)
![NPM](https://img.shields.io/npm/l/@xstd/async-function.svg)
![npm type definitions](https://img.shields.io/npm/types/@xstd/async-function.svg)
![coverage](https://img.shields.io/badge/coverage-100%25-green)
![AI generation](https://img.shields.io/badge/AI_generation-low-yellow)

<picture>
  <source height="64" media="(prefers-color-scheme: dark)" srcset="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-dark.png?raw=true">
  <source height="64" media="(prefers-color-scheme: light)" srcset="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-light.png?raw=true">
  <img height="64" alt="Shows a black logo in light color mode and a white one in dark color mode." src="https://github.com/xstd-js/website/blob/main/assets/logo/png/logo-large-light.png?raw=true">
</picture>

## @xstd/async-function

Universal API around async functions

## 📦 Installation

```shell
yarn add @xstd/async-function
# or
npm install @xstd/async-function --save
```

## 🚀 Usage

```ts
import { AsyncFunction } from '@xstd/async-function';

const fetchJson = new AsyncFunction(async (signal, url: string) => {
  const response = await fetch(url, { signal });
  return response.json();
});

// transform the resolved value, like Promise.then, but it stays callable:
const fetchUser = fetchJson
  .then((data) => (data as { user: unknown }).user)
  .catch((error) => {
    console.error(error);
    return null;
  });

// deduplicate concurrent calls for the same key:
const getUser = fetchUser.shareConcurentCalls({ keyGenerator: ([id]) => id as string });

const controller = new AbortController();
const user = await getUser.call(controller.signal, '42');

setTimeout(() => controller.abort(), 3000); // aborts the pending call
```

## 📜 Documentation

### `AsyncFunction`

Represents an asynchronous and abortable function with configurable arguments and specific return value.

- **Type parameters**
  - `GArguments extends readonly unknown[]` — The tuple type of arguments passed to the function.
  - `GReturn` — The type of the return value.

Every call requires a leading `AbortSignal` argument, making the function abortable and composable.

```ts
import { AsyncFunction } from '@xstd/async-function';

const fetchJson = new AsyncFunction(async (signal, url: string) => {
  const response = await fetch(url, { signal });
  return response.json();
});

const data = await fetchJson.call(new AbortController().signal, 'https://example.com/data.json');
```

#### Constructor

```ts
new AsyncFunction<GArguments, GReturn>(call: AsyncFunctionLike<GArguments, GReturn>)
```

Creates an instance of the `AsyncFunction` class.

- **Parameters**
  - `call: AsyncFunctionLike<GArguments, GReturn>` — A call function, or an existing `AsyncFunction`, which defines the action to perform on invocation. It receives the call's `AbortSignal` as first argument, followed by the call's arguments, and returns the result (or a promise of it). If an `AsyncFunction` is provided, its underlying call function is reused instead of being wrapped.

```ts
// from a call function:
const fnc = new AsyncFunction(async (signal, url: string) => fetch(url, { signal }));

// from an existing AsyncFunction (reuses its underlying call function):
const copy = new AsyncFunction(fnc);
```

#### Static methods

##### `AsyncFunction.of`

```ts
AsyncFunction.of<GArguments, GReturn>(input: AsyncFunctionLike<GArguments, GReturn>): AsyncFunction<GArguments, GReturn>
```

Returns the given input if it is already an `AsyncFunction`, otherwise wraps it into a new `AsyncFunction` instance.

- **Parameters**
  - `input: AsyncFunctionLike<GArguments, GReturn>` — An `AsyncFunction` instance or a plain call function to wrap.
- **Returns** The `AsyncFunction` instance corresponding to `input`.

```ts
AsyncFunction.of(asyncFunction); // returns asyncFunction
AsyncFunction.of(async (signal) => 42); // returns a new AsyncFunction wrapping the function
```

##### `AsyncFunction.fromSendAndReceive`

```ts
AsyncFunction.fromSendAndReceive<GArguments, GReturn>(
  options: AsyncFunctionFromSendAndReceiveOptions<GArguments, GReturn>,
): AsyncFunction<GArguments, GReturn>
```

Creates an async function that concurrently triggers a "send" (push) operation and waits for a "receive" (pull) result, returning the received value once both complete. This is ideal for command-response, RPC, or event-driven patterns where you must initiate an action and await its corresponding outcome.

The returned async function is abortable — cancellation via `AbortSignal` will propagate to both the send and receive operations.

- **Parameters** `options` — Configuration object containing the send and receive async functions.
  - `send: AsyncFunctionLike<GArguments, void>` — The "push" async function to trigger (e.g., sending a command or message). Must not return a value.
  - `receive: AsyncFunctionLike<GArguments, GReturn>` — The "pull" async function to await (e.g., listening for a response or event). Returns the result.
- **Returns** An async function that, when called, returns a promise resolving to the value from `receive`. The promise is rejected if either operation fails or is aborted.

```ts
const fnc = AsyncFunction.fromSendAndReceive({
  send: new AsyncFunction((signal) => sendMessage('hello', { signal })),
  receive: new AsyncFunction((signal) => waitForResponse({ signal })),
});

const result = await fnc.call(signal); // returns response from waitForResponse()
```

```ts
const controller = new AbortController();
const result = await fnc.call(controller.signal);
// cancel mid-operation:
controller.abort(); // both send and receive will be aborted.
```

#### Instance methods

##### `call`

```ts
call(signal: AbortSignal, ...args: GArguments): Promise<GReturn>
```

Executes the async function with the provided arguments and options.

- **Parameters**
  - `signal: AbortSignal` — A signal to abort the action execution.
  - `...args: GArguments` — The arguments to be provided to the async function.
- **Returns** A promise that resolves with the result of the async function.

##### `transform`

```ts
transform<GReturn>(transformFnc: TransformAsyncFunctionFunction<this, GReturn>): GReturn
```

Applies a transformation function to the current instance and returns the result.

- **Parameters**
  - `transformFnc` — A function that takes the current instance and returns a transformed value.
- **Returns** The result of applying the transformation function to the current instance.

##### `mapArguments`

```ts
mapArguments<GNewArguments extends readonly unknown[]>(
  mapFnc: MapFunctionArguments<GArguments, GNewArguments>,
): AsyncFunction<GNewArguments, GReturn>
```

Maps and transforms the arguments of the current async function using the provided mapping function.

- **Type parameters**
  - `GNewArguments` — The tuple type of the new arguments to be provided to the async function.
- **Parameters**
  - `mapFnc` — A function that receives the arguments for the new async function and transforms them into arguments for the current async function.
- **Returns** A new async function instance that uses the specified mapping function to map its arguments.

```ts
const fnc = new AsyncFunction(async (signal, a: number, b: number) => a + b);
const doubled = fnc.mapArguments(
  (...args: [number]) => [args[0], args[0]] satisfies [number, number],
);
const result = await doubled.call(signal, 21); // 42
```

##### `then`

```ts
then(onFulfilled?: undefined, onRejectedFunction?: undefined): AsyncFunction<GArguments, GReturn>
then<GNewReturn>(
  onFulfilled: AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn>,
  onRejectedFunction?: AsyncFunctionThenOnRejectedFunction<GNewReturn> | undefined,
): AsyncFunction<GArguments, GNewReturn>
then<GNewReturn>(
  onFulfilled: undefined,
  onRejectedFunction: AsyncFunctionThenOnRejectedFunction<GNewReturn>,
): AsyncFunction<GArguments, GReturn | GNewReturn>
```

Chains handlers on the outcome of this async function, like `Promise.then`, but returns a new `AsyncFunction` instead of a `Promise`.

The handlers are applied on each call of the returned async function. The `AbortSignal` received by the call is forwarded to `onFulfilled` and `onRejectedFunction`. If no handler is provided, the value or error is passed through unchanged.

- **Type parameters**
  - `GNewReturn` — The new type of the return value.
- **Parameters**
  - `onFulfilled` — A function invoked with the resolved value and the call's `AbortSignal`, returning the new value (or a promise of it).
  - `onRejectedFunction` — A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it). Defaults to re-throwing the error.
- **Returns** A new async function resolving with the transformed value.

```ts
const fnc = new AsyncFunction(async (signal, url: string) => fetch(url, { signal }));
const status = fnc.then((response) => response.status);

const result = await status.call(signal, 'https://example.com'); // e.g. 200
```

##### `catch`

```ts
catch(onRejectedFunction?: undefined): AsyncFunction<GArguments, GReturn>
catch<GNewReturn>(
  onRejectedFunction: AsyncFunctionThenOnRejectedFunction<GNewReturn>,
): AsyncFunction<GArguments, GReturn | GNewReturn>
```

Handles the errors thrown by this async function, like `Promise.catch`, but returns a new `AsyncFunction` instead of a `Promise`.

The rejection handler is applied on each call of the returned async function. The `AbortSignal` received by the call is forwarded to `onRejectedFunction`. The resolved values are passed through unchanged.

- **Type parameters**
  - `GNewReturn` — The new type of the return value in case of error.
- **Parameters**
  - `onRejectedFunction` — A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it). If `undefined`, errors are passed through unchanged.
- **Returns** A new async function resolving with the original value, or the fallback value when an error occurs.

```ts
const fnc = new AsyncFunction(async (signal) => fetch('https://example.com', { signal }));
const safe = fnc.catch((error) => null);

const result = await safe.call(signal); // Response, or null if the request failed
```

##### `shareConcurentCalls` (experimental)

```ts
shareConcurentCalls(options: ShareConcurentCallsOptions<GArguments>): AsyncFunction<GArguments, GReturn>
```

Returns a new async function that deduplicates concurrent calls sharing the same key: while a call is in-flight, subsequent calls with the same key await the same underlying promise instead of triggering a new call.

The first call starts the underlying call with its own `AbortController`. Each caller may abort its own wait without affecting the shared call. When the last consumer settles, the shared controller is aborted, the entry is removed, and a subsequent call starts a new one.

- **Parameters** `options` — Configuration object.
  - `keyGenerator: (args: GArguments) => string` — A function that generates a cache key from the call's arguments. Calls producing the same key share their result.
- **Returns** A new async function sharing concurrent calls with identical keys.

```ts
const loadUser = new AsyncFunction(async (signal, id: string) =>
  fetchUser(id, { signal }),
).shareConcurentCalls({ keyGenerator: ([id]) => id });

// 'fetchUser' is called once, both calls await the same result:
const [a, b] = await Promise.all([loadUser.call(signal, 'a'), loadUser.call(signal, 'a')]);
```

#### Types

| Type                                     | Description                                                                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `CallAsyncFunction<GArguments, GReturn>` | `(signal: AbortSignal, ...args: GArguments) => PromiseLike<GReturn> \| GReturn` — the shape of the underlying call function.                 |
| `AsyncFunctionLike<GArguments, GReturn>` | `AsyncFunction<GArguments, GReturn> \| CallAsyncFunction<GArguments, GReturn>` — accepted by the constructor, `of` and `fromSendAndReceive`. |
