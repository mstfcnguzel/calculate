import { AppError } from '../errors/AppError';

type JsonResponse = { ok: boolean; payload: unknown };

export async function postJSON(
  path: string,
  body: unknown,
  signal: AbortSignal,
): Promise<JsonResponse> {
  const response = await sendRequest(path, body, signal);
  const payload = await readJSON(response);
  return { ok: response.ok, payload };
}

async function sendRequest(path: string, body: unknown, signal: AbortSignal): Promise<Response> {
  try {
    return await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new AppError(
      'Could not reach the calculator. Check your connection and try again.',
      'NETWORK_ERROR',
    );
  }
}

async function readJSON(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AppError(
      'The calculator returned an unexpected response. Please try again.',
      'INVALID_RESPONSE',
    );
  }
}
