import { sleep } from '@xstd/abortable';
import { describe, expect, it, vi } from 'vitest';
import { AsyncFunction } from './async-function.ts';

describe('AsyncFunction', () => {
  const NEVER_ABORTED = new AbortController().signal;

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
          receive: new AsyncFunction<[number], number>(async (signal: AbortSignal): Promise<number> => {
            await sleep(100, { signal });
            return 2;
          }),
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
              return new AsyncFunction<[number], number>(async (signal: AbortSignal, value: number) => {
                return (await fnc.call(signal, value)) * 2;
              });
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
  });
});
