import { postJSON } from './httpClient';
import { AppError } from '../errors/AppError';

export class CalculatorApiError extends AppError {
  constructor(message: string, position?: number, code = 'CALCULATION_FAILED') {
    super(message, code, position);
  }
}

export async function evaluate(expression: string, signal: AbortSignal): Promise<number> {
  const { ok, payload } = await postJSON('/api/v1/evaluate', { expression }, signal);
  if (!ok) throw readApiError(payload);
  return readResult(payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readApiError(payload: unknown): Error {
  if (isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string') {
    return new CalculatorApiError(
      payload.error.message,
      readErrorPosition(payload.error.position),
      typeof payload.error.code === 'string' ? payload.error.code : 'CALCULATION_FAILED',
    );
  }
  return new AppError('The calculation failed. Please try again.', 'CALCULATION_FAILED');
}

function readErrorPosition(position: unknown): number | undefined {
  return typeof position === 'number' && Number.isInteger(position) && position > 0
    ? position
    : undefined;
}

function readResult(payload: unknown): number {
  if (
    !isRecord(payload) ||
    typeof payload.result !== 'number' ||
    !Number.isFinite(payload.result)
  ) {
    throw new AppError(
      'The calculator returned an invalid result. Please try again.',
      'INVALID_RESPONSE',
    );
  }
  return payload.result;
}
