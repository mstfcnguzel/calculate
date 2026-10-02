import { AppError } from '../../../errors/AppError';
import { InputPolicy } from '../../../input/InputPolicy';
import { normalizeExpression, type NormalizedExpression } from './normalizeExpression';

export const MAX_EXPRESSION_LENGTH = 512;

export class ExpressionInputError extends AppError {}

function checkLength(value: string): AppError | null {
  return value.length > MAX_EXPRESSION_LENGTH
    ? new ExpressionInputError('Use at most 512 characters.', 'EXPRESSION_TOO_LONG')
    : null;
}

function checkCharacters(value: string): AppError | null {
  const position = value.search(/[^0-9+\-−*×/÷^%().√\sA-Za-z]/u);
  return position < 0
    ? null
    : new ExpressionInputError(
        `The character “${Array.from(value.slice(position))[0]}” is not supported. Use numbers and calculator operations.`,
        'UNSUPPORTED_CHARACTER',
        Array.from(value.slice(0, position)).length + 1,
      );
}

function isDeletion(value: string, previous: string): boolean {
  if (value.length >= previous.length) return false;
  let start = 0;
  while (start < value.length && value[start] === previous[start]) start++;
  return value.slice(start) === previous.slice(start + previous.length - value.length);
}

function checkWords(value: string, previous: string): AppError | null {
  // Deletion remains available even when it leaves an incomplete function token.
  if (isDeletion(value, previous)) return null;
  for (const match of value.matchAll(/[A-Za-z]+/g)) {
    const word = match[0];
    const start = match.index;
    if ('sqrt'.startsWith(word)) continue;
    if (/^[eE]$/.test(word) && start > 0 && /[0-9.]/.test(value[start - 1])) continue;
    return new ExpressionInputError(
      'Only sqrt and scientific number notation (for example 1e3) are supported.',
      'UNSUPPORTED_FUNCTION',
      Array.from(value.slice(0, start)).length + 1,
    );
  }
  return null;
}

export class ExpressionPolicy extends InputPolicy {
  constructor() {
    super([checkLength, checkCharacters, checkWords]);
  }

  prepare(value: string, cursor = value.length): NormalizedExpression {
    const edit = normalizeExpression(value, cursor);
    const failure = checkLength(edit.value);
    if (failure) throw failure;
    return edit;
  }
}

export const expressionPolicy = new ExpressionPolicy();
