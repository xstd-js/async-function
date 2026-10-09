import { abortify } from '@xstd/abortable';
import type { MapFunctionArguments } from '@xstd/map-function';
import { type AsyncFunctionLike } from './types/async-function-like.ts';
import { type CallAsyncFunction } from './types/call-async-function.ts';
import { type ShareConcurentCallsOptions } from './types/methods/share-concurent-calls/share-concurent-calls-options.js';
import { type AsyncFunctionThenOnFulfilledFunction } from './types/methods/then/async-function.then.on-fulfilled-function.ts';
import { type AsyncFunctionThenOnRejectedFunction } from './types/methods/then/async-function.then.on-rejected-function.ts';
import { DEFAULT_ASYNC_FUNCTION_THEN_ON_FULFILLED_FUNCTION } from './types/methods/then/default.async-function.then.on-fulfilled-function.private.ts';
import { DEFAULT_ASYNC_FUNCTION_THEN_ON_REJECTED_FUNCTION } from './types/methods/then/default.async-function.then.on-rejected-function.private.ts';
import { type TransformAsyncFunctionFunction } from './types/methods/transform/transform-async-function-function.ts';
import { type AsyncFunctionFromSendAndReceiveOptions } from './types/static-methods/from-send-and-receive/async-function-from-send-and-receive-options.ts';

/**
 * Represents an asynchronous and abortable function with configurable arguments and specific return value.
 *
 * @template GArguments The tuple type of arguments passed to the function.
 * @template GReturn The type of the return value.
 */
export class AsyncFunction<GArguments extends readonly unknown[], GReturn> {
  /**
   * Returns the given input if it is already an `AsyncFunction`, otherwise wraps it into a new `AsyncFunction` instance.
   *
   * @template GArguments The tuple type of arguments passed to the function.
   * @template GReturn The type of the return value.
   * @param {AsyncFunctionLike<GArguments, GReturn>} input An `AsyncFunction` instance or a plain call function to wrap.
   * @returns {AsyncFunction<GArguments, GReturn>} The `AsyncFunction` instance corresponding to `input`.
   *
   * @example
   * ```ts
   * AsyncFunction.of(asyncFunction); // returns asyncFunction
   * AsyncFunction.of(async (signal) => 42); // returns a new AsyncFunction wrapping the function
   * ```
   */
  static of<GArguments extends readonly unknown[], GReturn>(
    input: AsyncFunctionLike<GArguments, GReturn>,
  ): AsyncFunction<GArguments, GReturn> {
    return input instanceof AsyncFunction ? input : new AsyncFunction<GArguments, GReturn>(input);
  }

  /**
   * Creates an async function that concurrently triggers a "send" (push) operation and waits for a "receive" (pull) result,
   * returning the received value once both complete. This is ideal for command-response, RPC, or event-driven patterns
   * where you must initiate an action and await its corresponding outcome.
   *
   * The returned async function is abortable - cancellation via `AbortSignal` will propagate to both the send and receive operations.
   *
   * @template GArguments The tuple type of arguments passed to the send and receive async functions.
   * @template GReturn The type of value returned by the receive operation.
   * @param {AsyncFunctionFromSendAndReceiveOptions<GReturn>} options Configuration object containing the send and receive async functions.
   * @param {AsyncFunction<GArguments, void>} options.send  The "push" async function to trigger (e.g., sending a command or message). Must not return a value.
   * @param {AsyncFunction<GArguments, GReturn>} options.receive The "pull" async function to await (e.g., listening for a response or event). Returns the result.
   * @returns {AsyncFunction<GArguments, GReturn>} An async function that, when called, returns a promise resolving to the value from `receive`.
   *   The promise is rejected if either operation fails or is aborted.
   *
   * @example
   *
   * ```ts
   * const fnc = AsyncFunction.fromSendAndReceive({
   *   send: new AsyncFunction((signal) => sendMessage("hello", { signal })),
   *   receive: new AsyncFunction((signal) => waitForResponse({ signal ))
   * });
   *
   * const result = await fnc.call(signal); // returns response from waitForResponse()
   * ```
   *
   * @example with abortion
   *
   * ```ts
   * const controller = new AbortController();
   * const result = await fnc.call(controller.signal);
   * // cancel mid-operation:
   * controller.abort(); // both send and receive will be aborted.
   * ```
   */
  static fromSendAndReceive<GArguments extends readonly unknown[], GReturn>({
    send,
    receive,
  }: AsyncFunctionFromSendAndReceiveOptions<GArguments, GReturn>): AsyncFunction<
    GArguments,
    GReturn
  > {
    send = AsyncFunction.of(send);
    receive = AsyncFunction.of(receive);

    return new AsyncFunction<GArguments, GReturn>(
      async (signal: AbortSignal, ...args: GArguments): Promise<GReturn> => {
        const controller: AbortController = new AbortController();
        const sharedSignal: AbortSignal = AbortSignal.any([signal, controller.signal]);
        try {
          return (
            await Promise.all([
              receive.#call(sharedSignal, ...args),
              send.#call(sharedSignal, ...args),
            ])
          )[0];
        } finally {
          controller.abort();
        }
      },
    );
  }

  /**
   * The underlying call function invoked when this async function is called.
   */
  readonly #call: CallAsyncFunction<GArguments, GReturn>;

  /**
   * Creates an instance of the `AsyncFunction` class.
   *
   * @param {AsyncFunctionLike<GArguments, GReturn>} call A call function, or an existing `AsyncFunction`, to be invoked, which defines the action to perform on invocation. If an `AsyncFunction` is provided, its underlying call function is reused instead of being wrapped.
   */
  constructor(call: AsyncFunctionLike<GArguments, GReturn>) {
    this.#call = call instanceof AsyncFunction ? call.#call : call;
  }

  /**
   * Executes the specified async function with the provided arguments and options.
   *
   * @param {AbortSignal} signal A signal to abort the action execution.
   * @param {...GArguments} args The arguments to be provided to the async function.
   * @return {Promise<GReturn>} A promise that resolves with the result of the async function.
   */
  call(signal: AbortSignal, ...args: GArguments): Promise<GReturn> {
    return Promise.try(this.#call, signal, ...args);
  }

  /* TRANSFORM */

  /**
   * Applies a transformation function to the current instance and returns the result.
   *
   * @param {TransformAsyncFunctionFunction<this, GReturn>} transformFnc A function that takes the current instance and returns a transformed value.
   * @return {GReturn} The result of applying the transformation function to the current instance.
   */
  transform<GReturn>(transformFnc: TransformAsyncFunctionFunction<this, GReturn>): GReturn {
    return transformFnc(this);
  }

  /* ARGUMENTS BASED */

  /**
   * Maps and transforms the arguments of the current async function using the provided mapping function.
   *
   * @template GNewArguments The tuple type of the new arguments to be provided to the async function.
   * @param {MapFunctionArguments<GNewArguments, GArguments>} mapFnc A function that receives the arguments for the new async function and transforms them into arguments for the current async function.
   * @return {AsyncFunction<GNewArguments, GReturn>} A new async function instance that uses the specified mapping function to map its arguments.
   */
  mapArguments<GNewArguments extends readonly unknown[]>(
    mapFnc: MapFunctionArguments<GNewArguments, GArguments>,
  ): AsyncFunction<GNewArguments, GReturn> {
    return new AsyncFunction<GNewArguments, GReturn>(
      (signal: AbortSignal, ...args: GNewArguments): PromiseLike<GReturn> | GReturn => {
        return this.#call(signal, ...mapFnc(...args));
      },
    );
  }

  /* RETURN BASED */

  /**
   * Creates a new async function with the same behaviour as this one (neither a fulfilment nor a rejection handler provided).
   *
   * @returns {AsyncFunction<GArguments, GReturn>} A new async function equivalent to this one.
   */
  then(onFulfilled?: undefined, onRejectedFunction?: undefined): AsyncFunction<GArguments, GReturn>;
  /**
   * Transforms the resolved value of this async function, and optionally handles its errors.
   *
   * @template GNewReturn The new type of the return value.
   * @param {AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn>} onFulfilled A function invoked with the resolved value and the call's `AbortSignal`, returning the new value (or a promise of it).
   * @param {AsyncFunctionThenOnRejectedFunction<GNewReturn>} onRejectedFunction An optional function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it). Defaults to re-throwing the error.
   * @returns {AsyncFunction<GArguments, GNewReturn>} A new async function resolving with the transformed value.
   */
  then<GNewReturn>(
    onFulfilled: AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn>,
    onRejectedFunction?: AsyncFunctionThenOnRejectedFunction<GNewReturn> | undefined,
  ): AsyncFunction<GArguments, GNewReturn>;
  /**
   * Handles the errors thrown by this async function without transforming its resolved value.
   *
   * @template GNewReturn The new type of the return value in case of error.
   * @param {undefined} onFulfilled Must be left `undefined`.
   * @param {AsyncFunctionThenOnRejectedFunction<GNewReturn>} onRejectedFunction A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it).
   * @returns {AsyncFunction<GArguments, GReturn | GNewReturn>} A new async function resolving with the original value, or the fallback value when an error occurs.
   */
  then<GNewReturn>(
    onFulfilled: undefined,
    onRejectedFunction: AsyncFunctionThenOnRejectedFunction<GNewReturn>,
  ): AsyncFunction<GArguments, GReturn | GNewReturn>;

  /**
   * Chains handlers on the outcome of this async function, like `Promise.then`, but returns a new `AsyncFunction` instead of a `Promise`.
   *
   * The handlers are applied on each call of the returned async function. The `AbortSignal` received by the call is forwarded to `onFulfilled` and `onRejectedFunction`. If no handler is provided, the value or error is passed through unchanged.
   *
   * @template GNewReturn The new type of the return value.
   * @param {AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn> | undefined} onFulfilled A function invoked with the resolved value and the call's `AbortSignal`, returning the new value (or a promise of it).
   * @param {AsyncFunctionThenOnRejectedFunction<GNewReturn> | undefined} onRejectedFunction A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it).
   * @returns {AsyncFunction<GArguments, GNewReturn>} A new async function resolving with the transformed value.
   *
   * @example
   * ```ts
   * const fnc = new AsyncFunction(async (signal, url: string) => fetch(url, { signal }));
   * const status = fnc.then((response) => response.status);
   *
   * const result = await status.call(signal, 'https://example.com'); // e.g. 200
   * ```
   */
  then<GNewReturn>(
    onFulfilled:
      | AsyncFunctionThenOnFulfilledFunction<GReturn, GNewReturn>
      | undefined = DEFAULT_ASYNC_FUNCTION_THEN_ON_FULFILLED_FUNCTION,
    onRejectedFunction:
      | AsyncFunctionThenOnRejectedFunction<GNewReturn>
      | undefined = DEFAULT_ASYNC_FUNCTION_THEN_ON_REJECTED_FUNCTION,
  ): AsyncFunction<GArguments, GNewReturn> {
    return new AsyncFunction<GArguments, GNewReturn>(
      (signal: AbortSignal, ...args: GArguments): Promise<GNewReturn> => {
        return this.call(signal, ...args).then(
          (value: GReturn): PromiseLike<GNewReturn> | GNewReturn => {
            return onFulfilled(value, signal);
          },
          (error: unknown): PromiseLike<GNewReturn> | GNewReturn => {
            return onRejectedFunction(error, signal);
          },
        );
      },
    );
  }

  /**
   * Creates a new async function with the same behaviour as this one (no rejection handler provided).
   *
   * @returns {AsyncFunction<GArguments, GReturn>} A new async function equivalent to this one.
   */
  catch(onRejectedFunction?: undefined): AsyncFunction<GArguments, GReturn>;
  /**
   * Handles the errors thrown by this async function, like `Promise.catch`, but returns a new `AsyncFunction` instead of a `Promise`.
   *
   * @template GNewReturn The new type of the return value in case of error.
   * @param {AsyncFunctionThenOnRejectedFunction<GNewReturn>} onRejectedFunction A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it).
   * @returns {AsyncFunction<GArguments, GReturn | GNewReturn>} A new async function resolving with the original value, or the fallback value when an error occurs.
   */
  catch<GNewReturn>(
    onRejectedFunction: AsyncFunctionThenOnRejectedFunction<GNewReturn>,
  ): AsyncFunction<GArguments, GReturn | GNewReturn>;
  /**
   * Handles the errors thrown by this async function, like `Promise.catch`, but returns a new `AsyncFunction` instead of a `Promise`.
   *
   * The rejection handler is applied on each call of the returned async function. The `AbortSignal` received by the call is forwarded to `onRejectedFunction`. The resolved values are passed through unchanged.
   *
   * @template GNewReturn The new type of the return value in case of error.
   * @param {AsyncFunctionThenOnRejectedFunction<GNewReturn> | undefined} onRejectedFunction A function invoked with the thrown error and the call's `AbortSignal`, returning a fallback value (or a promise of it). If `undefined`, errors are passed through unchanged.
   * @returns {AsyncFunction<GArguments, GReturn | GNewReturn>} A new async function resolving with the original value, or the fallback value when an error occurs.
   *
   * @example
   * ```ts
   * const fnc = new AsyncFunction(async (signal) => fetch('https://example.com', { signal }));
   * const safe = fnc.catch((error) => null);
   *
   * const result = await safe.call(signal); // Response, or null if the request failed
   * ```
   */
  catch<GNewReturn>(
    onRejectedFunction: AsyncFunctionThenOnRejectedFunction<GNewReturn> | undefined,
  ): AsyncFunction<GArguments, GReturn | GNewReturn> {
    return this.then<GNewReturn>(
      undefined,
      onRejectedFunction as AsyncFunctionThenOnRejectedFunction<GNewReturn>,
    );
  }

  /* CONCURRENT */

  /**
   * Returns a new async function that deduplicates concurrent calls sharing the same key: while a call is in-flight, subsequent calls with the same key await the same underlying promise instead of triggering a new call.
   *
   * The first call starts the underlying call with its own `AbortController`. Each caller may abort its own wait without affecting the shared call. When the last consumer settles, the shared controller is aborted, the entry is removed, and a subsequent call starts a new one.
   *
   * @experimental
   * @param {ShareConcurentCallsOptions<GArguments>} options Configuration object.
   * @param {ShareConcurentCallsKeyGenerator<GArguments>} options.keyGenerator A function that generates a cache key from the call's arguments. Calls producing the same key share their result.
   * @returns {AsyncFunction<GArguments, GReturn>} A new async function sharing concurrent calls with identical keys.
   *
   * @example
   * ```ts
   * const loadUser = new AsyncFunction(async (signal, id: string) => fetchUser(id, { signal }))
   *   .shareConcurentCalls({ keyGenerator: ([id]) => id });
   *
   * // 'fetchUser' is called once, both calls await the same result:
   * const [a, b] = await Promise.all([loadUser.call(signal, 'a'), loadUser.call(signal, 'a')]);
   * ```
   */
  shareConcurentCalls({
    keyGenerator,
  }: ShareConcurentCallsOptions<GArguments>): AsyncFunction<GArguments, GReturn> {
    interface Entry {
      readonly controller: AbortController;
      readonly promise: Promise<GReturn>;
      consumers: number;
    }

    const map: Map<string, Entry> = new Map<string, Entry>();

    return new AsyncFunction<GArguments, GReturn>(
      async (signal: AbortSignal, ...args: GArguments): Promise<GReturn> => {
        signal.throwIfAborted();

        const key: string = keyGenerator(args);

        let entry: Entry | undefined = map.get(key);

        if (entry === undefined) {
          const controller: AbortController = new AbortController();
          entry = {
            controller,
            promise: this.call(controller.signal, ...args),
            consumers: 1,
          };
          map.set(key, entry);
        } else {
          entry.consumers++;
        }

        try {
          return await abortify(entry.promise, { signal });
        } finally {
          entry.consumers--;

          if (entry.consumers === 0) {
            entry.controller.abort();
            map.delete(key);
          }
        }
      },
    );
  }
}
