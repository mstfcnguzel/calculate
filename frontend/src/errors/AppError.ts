export class AppError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly position?: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export function toAppError(failure: unknown): AppError {
  if (failure instanceof AppError) return failure;
  return new AppError(
    failure instanceof Error ? failure.message : 'Something went wrong. Please try again.',
    'UNEXPECTED_ERROR',
  );
}
