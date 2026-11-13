import { sleep } from '@xstd/abortable';
import { describe, expect, it, vi } from 'vitest';
import { AsyncFunction } from './async-function.ts';

interface Deferred<GValue> {
  readonly promise: Promise<GValue>;
  readonly resolve: (value: GValue) => void;
  readonly reject: (error: unknown) => void;
}

function createDeferred<GValue>(): Deferred<GValue> {
  let resolve!: (value: GValue) => void;
  let reject!: (error: unknown) => void;
  const promise: Promise<GValue> = new Promise<GValue>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve, reject };
}

describe('AsyncFunction', () => {
  const NEVER_ABORTED = new AbortController().signal;

  describe('constructor', () => {
    it('should accept a call function', async () => {
      const spy = vi.fn(async (_signal: AbortSignal, value: number): Promise<number> => {
        return value;
      });

      const fnc = new AsyncFunction<[number], number>(spy);

      await expect(fnc.call(NEVER_ABORTED, 3)).resolves.toBe(3);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenNthCalledWith(1, NEVER_ABORTED, 3);
    });

    it('should accept an AsyncFunction instance and reuse its underlying call function', async () => {
      const spy = vi.fn(async (signal: AbortSignal, value: number): Promise<number> => {
        signal.throwIfAborted();
        return value;
      });

      const original = new AsyncFunction<[number], number>(spy);
      const wrapped = new AsyncFunction<[number], number>(original);

      await expect(wrapped.call(NEVER_ABORTED, 3)).resolves.toBe(3);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenNthCalledWith(1, NEVER_ABORTED, 3);
    });

    it('should keep the abortable behaviour when constructed from an AsyncFunction', async () => {
      const original = new AsyncFunction<[number], number>(async (signal: AbortSignal) => {
        signal.throwIfAborted();
        return 3;
      });
      const wrapped = new AsyncFunction<[number], number>(original);

      await expect(wrapped.call(AbortSignal.abort('abort'), 3)).rejects.toThrow('abort');
    });
  });

  describe('static-methods', () => {
    describe('of', () => {
      it('should return the same instance if an AsyncFunction is provided', async () => {
        const fnc = new AsyncFunction(async () => {});
        expect(AsyncFunction.of(fnc)).toBe(fnc);
      });

      it('should return a new AsyncFunction if a function is provided', async () => {
        expect(AsyncFunction.of(async () => {})).toBeInstanceOf(AsyncFunction);
      });
    });

    describe('fromSendAndReceive', () => {
      it('should call send and await on receive', async () => {
        const sendSpy = vi.fn(async (signal: AbortSignal, value: number): Promise<void> => {
          expect(value).toBe(1);
          expect(signal).toBeInstanceOf(AbortSignal);
        });

        const receiveSpy = vi.fn(async (): Promise<number> => {
          return 2;
        });

        const fnc = AsyncFunction.fromSendAndReceive({
          send: new AsyncFunction<[number], void>(sendSpy),
          receive: new AsyncFunction<[number], number>(receiveSpy),
        });

        await expect(fnc.call(NEVER_ABORTED, 1)).resolves.toBe(2);

        expect(sendSpy).toHaveBeenCalledTimes(1);
        expect(receiveSpy).toHaveBeenCalledTimes(1);
      });

      it('should support cancellation', async () => {
        let sendValue!: number;
        let sendSignal!: AbortSignal | undefined;

        const fnc = AsyncFunction.fromSendAndReceive({
          send: new AsyncFunction<[number], void>(
            async (signal: AbortSignal, value: number): Promise<void> => {
              sendValue = value;
              sendSignal = signal;
            },
          ),
          receive: new AsyncFunction<[number], number>(
            async (signal: AbortSignal): Promise<number> => {
              await sleep(100, { signal });
              return 2;
            },
          ),
        });

        const controller = new AbortController();
        const promise = fnc.call(controller.signal, 1);
        await sleep(10);

        expect(sendValue).toBe(1);
        expect(sendSignal).toBeDefined();
        expect(sendSignal!.aborted).toBe(false);

        controller.abort('abort');

        expect(sendSignal!.aborted).toBe(true);

        await expect(promise).rejects.toThrow();
      });
    });
  });

  describe('methods', () => {
    describe('invoke', () => {
      it('should be invoked and return expected result', async () => {
        const spy = vi.fn(async (signal: AbortSignal, value: number) => {
          signal.throwIfAborted();
          return value;
        });

        const controller = new AbortController();
        const signal = controller.signal;
        await expect(new AsyncFunction<[number], number>(spy).call(signal, 3)).resolves.toBe(3);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenNthCalledWith(1, signal, 3);
      });

      it('should be abortable', async () => {
        const spy = vi.fn(async (signal: AbortSignal, value: number) => {
          signal.throwIfAborted();
          return value;
        });

        await expect(
          new AsyncFunction<[number], number>(spy).call(AbortSignal.abort('abort'), 3),
        ).rejects.toThrow('abort');

        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    describe('transform', () => {
      it('should map the result', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .transform((fnc) => {
              return new AsyncFunction<[number], number>(
                async (signal: AbortSignal, value: number) => {
                  return (await fnc.call(signal, value)) * 2;
                },
              );
            })
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(6);
      });
    });

    describe('mapArguments', () => {
      it('should map the arguments', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .mapArguments((value: number): [number] => {
              return [value * 2];
            })
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(6);
      });

      it('should convert string to number', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .mapArguments<[string]>((value: string) => [Number(value)])
            .call(NEVER_ABORTED, '3'),
        ).resolves.toBe(3);
      });
    });

    describe('then', () => {
      it('should change the result', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .then(async (value: number) => {
              return value * 2;
            })
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(6);

        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .then(String)
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe('3');
      });

      it('should re-emit results', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            return value;
          })
            .then(undefined, () => 5)
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(3);
      });

      it('should re-throw errors', async () => {
        await expect(
          new AsyncFunction<[number], number>(async () => {
            throw 'error';
          })
            .then(String)
            .call(NEVER_ABORTED, 3),
        ).rejects.toThrow('error');
      });

      it('should catch errors', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            expect(value).toBe(3);
            throw 'error';
          })
            .then(undefined, async (error: unknown) => {
              expect(error).toBe('error');
              return 4;
            })
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(4);
      });
    });

    describe('catch', () => {
      it('should catch errors', async () => {
        await expect(
          new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
            signal.throwIfAborted();
            expect(value).toBe(3);
            throw 'error';
          })
            .catch(async (error: unknown) => {
              expect(error).toBe('error');
              return 4;
            })
            .call(NEVER_ABORTED, 3),
        ).resolves.toBe(4);
      });
    });

    describe('shareConcurentCalls', () => {
      it('should share concurrent calls with the same key', async () => {
        const deferred: Deferred<number> = createDeferred<number>();
        const callValues: string[] = [];

        const fnc = new AsyncFunction<[string], number>(
          async (_signal: AbortSignal, value: string): Promise<number> => {
            callValues.push(value);
            return deferred.promise;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const firstPromise = fnc.call(NEVER_ABORTED, 'a');
        const secondPromise = fnc.call(NEVER_ABORTED, 'a');

        expect(callValues).toEqual(['a']); // the underlying function is called once

        deferred.resolve(42);

        await expect(firstPromise).resolves.toBe(42);
        await expect(secondPromise).resolves.toBe(42);
      });

      it('should not share concurrent calls with different keys', async () => {
        const firstDeferred: Deferred<number> = createDeferred<number>();
        const secondDeferred: Deferred<number> = createDeferred<number>();
        const callValues: string[] = [];

        const fnc = new AsyncFunction<[string], number>(
          async (_signal: AbortSignal, value: string): Promise<number> => {
            callValues.push(value);
            return value === 'a' ? firstDeferred.promise : secondDeferred.promise;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const firstPromise = fnc.call(NEVER_ABORTED, 'a');
        const secondPromise = fnc.call(NEVER_ABORTED, 'b');

        expect(callValues).toEqual(['a', 'b']);

        firstDeferred.resolve(1);
        secondDeferred.resolve(2);

        await expect(firstPromise).resolves.toBe(1);
        await expect(secondPromise).resolves.toBe(2);
      });

      it('should reject immediately when the signal is already aborted', async () => {
        let callCount = 0;

        const fnc = new AsyncFunction<[string], number>(
          async (_signal: AbortSignal, value: string): Promise<number> => {
            callCount++;
            return value.length;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        await expect(fnc.call(AbortSignal.abort('abort'), 'a')).rejects.toThrow('abort');

        expect(callCount).toBe(0);
      });

      it('should reject all consumers when the shared call fails', async () => {
        let callCount = 0;

        const fnc = new AsyncFunction<[string], number>(async (): Promise<number> => {
          callCount++;
          throw 'error';
        }).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const firstPromise = fnc.call(NEVER_ABORTED, 'a');
        const secondPromise = fnc.call(NEVER_ABORTED, 'a');

        await expect(firstPromise).rejects.toThrow('error');
        await expect(secondPromise).rejects.toThrow('error');

        expect(callCount).toBe(1);
      });

      it('should keep the shared call running when one of multiple consumers aborts', async () => {
        const deferred: Deferred<number> = createDeferred<number>();
        let callSignal!: AbortSignal;

        const fnc = new AsyncFunction<[string], number>(
          async (signal: AbortSignal, _value: string): Promise<number> => {
            callSignal = signal;
            return deferred.promise;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const abortController = new AbortController();
        const abortedPromise = fnc.call(abortController.signal, 'a');
        const joinedPromise = fnc.call(NEVER_ABORTED, 'a');

        abortController.abort('abort');

        await expect(abortedPromise).rejects.toThrow('abort');

        expect(callSignal.aborted).toBe(false); // the shared call is untouched

        deferred.resolve(42);

        await expect(joinedPromise).resolves.toBe(42);
      });

      it('should abort the shared call when the only consumer aborts, and start a new one afterwards', async () => {
        const deferred: Deferred<number> = createDeferred<number>();
        let callCount = 0;
        let callSignal!: AbortSignal;

        const fnc = new AsyncFunction<[string], number>(
          async (signal: AbortSignal, _value: string): Promise<number> => {
            callCount++;
            callSignal = signal;
            return deferred.promise;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const abortController = new AbortController();
        const promise = fnc.call(abortController.signal, 'a');

        abortController.abort('abort');

        await expect(promise).rejects.toThrow('abort');

        expect(callSignal.aborted).toBe(true); // the shared call is aborted

        deferred.resolve(42);

        await expect(fnc.call(NEVER_ABORTED, 'a')).resolves.toBe(42); // new underlying call
        expect(callCount).toBe(2);
      });

      it('should start a new underlying call once all consumers settled', async () => {
        const deferred: Deferred<number> = createDeferred<number>();
        let callCount = 0;

        const fnc = new AsyncFunction<[string], number>(
          async (_signal: AbortSignal, _value: string): Promise<number> => {
            callCount++;
            return deferred.promise;
          },
        ).shareConcurentCalls({ keyGenerator: ([value]) => value });

        const firstPromise = fnc.call(NEVER_ABORTED, 'a');

        deferred.resolve(42);

        await expect(firstPromise).resolves.toBe(42);

        await expect(fnc.call(NEVER_ABORTED, 'a')).resolves.toBe(42); // sharing only applies to in-flight calls

        expect(callCount).toBe(2);
      });
    });
  });
});
