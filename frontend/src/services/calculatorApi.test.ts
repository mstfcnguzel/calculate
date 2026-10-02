import { describe, expect, it, vi } from 'vitest';
import { evaluate, CalculatorApiError } from './calculatorApi';

const expression = '1 + 2';

function mockResponse(ok: boolean, payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: vi.fn().mockResolvedValue(payload) });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('calculator API client', () => {
  it('preserves the backend error code alongside its message and position', async () => {
    mockResponse(false, {
      error: { code: 'MISSING_OPERAND', message: 'Add a value after +.', position: 3 },
    });
    await expect(evaluate(expression, new AbortController().signal)).rejects.toMatchObject({
      code: 'MISSING_OPERAND',
      message: 'Add a value after +.',
      position: 3,
    });
  });
  it('preserves a valid syntax error position', async () => {
    mockResponse(false, { error: { message: 'Invalid expression.', position: 4 } });
    await expect(evaluate(expression, new AbortController().signal)).rejects.toMatchObject({
      message: 'Invalid expression.',
      position: 4,
    });
  });
  it.each([0, -1, 1.5, '4', null])('ignores an invalid error position %j', async (position) => {
    mockResponse(false, { error: { message: 'Invalid expression.', position } });
    await expect(evaluate(expression, new AbortController().signal)).rejects.toBeInstanceOf(
      CalculatorApiError,
    );
    await expect(evaluate(expression, new AbortController().signal)).rejects.toMatchObject({
      position: undefined,
    });
  });
  it('sends numeric JSON and propagates the abort signal', async () => {
    const fetchMock = mockResponse(true, { result: 3 });
    const controller = new AbortController();
    expect(await evaluate(expression, controller.signal)).toBe(3);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expression }),
      signal: controller.signal,
    });
  });

  it('accepts a zero result', async () => {
    mockResponse(true, { result: 0 });
    expect(await evaluate(expression, new AbortController().signal)).toBe(0);
  });

  it('displays the backend error message', async () => {
    mockResponse(false, { error: { code: 'DIVISION_BY_ZERO', message: 'Cannot divide by zero.' } });
    await expect(evaluate(expression, new AbortController().signal)).rejects.toThrow(
      'Cannot divide by zero.',
    );
  });

  it.each([null, {}, { error: {} }, { error: { message: 42 } }])(
    'handles an unstructured HTTP error %j',
    async (payload) => {
      mockResponse(false, payload);
      await expect(evaluate(expression, new AbortController().signal)).rejects.toThrow(
        'The calculation failed.',
      );
    },
  );

  it.each([null, {}, { result: '3' }, { result: Infinity }, { result: NaN }])(
    'rejects an invalid successful result %j',
    async (payload) => {
      mockResponse(true, payload);
      await expect(evaluate(expression, new AbortController().signal)).rejects.toThrow(
        'invalid result',
      );
    },
  );

  it('handles non-JSON responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockRejectedValue(new SyntaxError()) }),
    );
    await expect(evaluate(expression, new AbortController().signal)).rejects.toThrow(
      'unexpected response',
    );
  });

  it('handles network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(evaluate(expression, new AbortController().signal)).rejects.toThrow(
      'Could not reach the calculator.',
    );
  });

  it('preserves cancellation for the caller', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new DOMException('Aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));
    await expect(evaluate(expression, controller.signal)).rejects.toBe(abort);
  });
});
