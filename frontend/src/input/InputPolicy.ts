import { AppError } from '../errors/AppError';

export type InputRule = (value: string, previous: string) => AppError | null;

// Rules validate a complete proposed edit, so rejected pastes never join numbers.
export class InputPolicy {
  constructor(private readonly rules: readonly InputRule[]) {}

  validate(value: string, previous = ''): AppError | null {
    for (const rule of this.rules) {
      const failure = rule(value, previous);
      if (failure) return failure;
    }
    return null;
  }
}
