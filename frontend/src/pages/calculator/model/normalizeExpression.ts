import type { Edit } from './expression';

type Character = { text: string; offset: number };
export type NormalizedExpression = Edit & { changes: string[] };

function removeExtraClosings(characters: Character[]): Character[] {
  let depth = 0;
  return characters.filter(({ text }) => {
    if (text === '(') depth++;
    if (text === ')') {
      if (depth === 0) return false;
      depth--;
    }
    return true;
  });
}

function completeParentheses(characters: Character[], end: number): Character[] {
  const depth = characters.reduce(
    (count, { text }) => count + (text === '(' ? 1 : text === ')' ? -1 : 0),
    0,
  );
  return [...characters, ...Array.from({ length: depth }, () => ({ text: ')', offset: end }))];
}

function trimTrailingOperators(characters: Character[]): Character[] {
  const value = characters.map(({ text }) => text).join('');
  const match = value.match(/(?:[+\-−*×/÷^]\s*)+$/u);
  if (!match) return characters;
  const prefix = value.slice(0, match.index).trimEnd();
  // An exponent sign or a unary sign in an empty group is an error, not an extra operator.
  if (!/[0-9.)%]$/.test(prefix)) return characters;
  return characters.slice(0, prefix.length);
}

function trimTrailingOpenings(characters: Character[]): Character[] {
  const value = characters.map(({ text }) => text).join('');
  const match = value.match(/(?:\(\s*)+$/u);
  return match ? characters.slice(0, match.index) : characters;
}

function trimIncompleteFunction(characters: Character[]): Character[] {
  const value = characters.map(({ text }) => text).join('');
  const match = value.match(/([A-Za-z]+)\s*$/u);
  return match && ['s', 'sq', 'sqr'].includes(match[1])
    ? characters.slice(0, match.index)
    : characters;
}

function trimUnfinishedTail(characters: Character[]): {
  characters: Character[];
  changes: string[];
} {
  const changes = new Set<string>();
  while (true) {
    const withoutOpenings = trimTrailingOpenings(characters);
    const withoutFunction = trimIncompleteFunction(withoutOpenings);
    const withoutOperators = trimTrailingOperators(withoutFunction);
    if (withoutOpenings.length < characters.length)
      changes.add('Removed empty opening parentheses at the end.');
    if (withoutFunction.length < withoutOpenings.length)
      changes.add('Removed an incomplete sqrt name at the end.');
    if (withoutOperators.length < withoutFunction.length)
      changes.add('Removed trailing operators.');
    if (withoutOperators.length === characters.length) return { characters, changes: [...changes] };
    // Removing an unfinished suffix can expose another suffix, as in 2+(sq.
    characters = withoutOperators;
  }
}

function parenthesisPairs(characters: Character[]): Map<number, number> {
  const stack: number[] = [];
  const pairs = new Map<number, number>();
  characters.forEach(({ text }, index) => {
    if (text === '(') stack.push(index);
    if (text === ')') pairs.set(stack.pop()!, index);
  });
  return pairs;
}

function simplifyWrappers(characters: Character[]): Character[] {
  // Collapse only a group wrapped in another group; keep precedence and sqrt parentheses.
  while (true) {
    const pairs = parenthesisPairs(characters);
    let remove: [number, number] | undefined;
    for (const [open, close] of pairs) {
      let inner = open + 1;
      while (inner < close && /\s/.test(characters[inner].text)) inner++;
      const innerClose = pairs.get(inner);
      if (innerClose === undefined) continue;
      let end = innerClose + 1;
      while (end < close && /\s/.test(characters[end].text)) end++;
      if (end !== close) continue;
      let previous = open - 1;
      while (previous >= 0 && /\s/.test(characters[previous].text)) previous--;
      const functionGroup = previous >= 0 && /[A-Za-z√]/.test(characters[previous].text);
      remove = functionGroup ? [inner, innerClose] : [open, close];
      break;
    }
    if (!remove) return characters;
    const [open, close] = remove;
    characters = characters.filter((_, index) => index !== open && index !== close);
  }
}

export function normalizeExpression(value: string, cursor = value.length): NormalizedExpression {
  const characters = value.split('').map((text, offset) => ({ text, offset }));
  // Remove unfinished suffixes before completing groups that contain an expression.
  const withoutExtraClosings = removeExtraClosings(characters);
  const tail = trimUnfinishedTail(withoutExtraClosings);
  const completed = completeParentheses(tail.characters, value.length);
  const normalized = simplifyWrappers(completed);
  const changes: string[] = [];
  if (withoutExtraClosings.length < characters.length)
    changes.push('Removed extra closing parentheses.');
  changes.push(...tail.changes);
  if (completed.length > tail.characters.length)
    changes.push('Added missing closing parentheses at the end.');
  if (normalized.length < completed.length) changes.push('Removed redundant parentheses.');
  const text = normalized
    .map(({ text }) => text)
    .join('')
    .trim();
  const leadingSpace = normalized.findIndex(({ text }) => !/\s/.test(text));
  const nextCursor =
    cursor >= value.length
      ? text.length
      : Math.max(
          0,
          normalized.filter(({ offset }) => offset < cursor).length - Math.max(0, leadingSpace),
        );
  return { value: text, cursor: Math.min(nextCursor, text.length), changes };
}
