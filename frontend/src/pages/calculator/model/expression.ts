export type Selection = { start: number; end: number };
export type Edit = { value: string; cursor: number };

// Fallback for change events that do not expose the selection before the edit.
export function selectionBeforeChange(previous: string, next: string): Selection {
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let suffix = 0;
  while (
    suffix < previous.length - start &&
    suffix < next.length - start &&
    previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  )
    suffix++;
  return { start, end: previous.length - suffix };
}

export function insertText(value: string, selection: Selection, text: string): Edit {
  return {
    value: value.slice(0, selection.start) + text + value.slice(selection.end),
    cursor: selection.start + text.length,
  };
}

export function deleteBackward(value: string, selection: Selection): Edit {
  const start =
    selection.start === selection.end ? Math.max(0, selection.start - 1) : selection.start;
  return insertText(value, { start, end: selection.end }, '');
}

export function insertSquareRoot(value: string, selection: Selection): Edit {
  const selected = value.slice(selection.start, selection.end);
  const edit = insertText(value, selection, `sqrt(${selected})`);
  return { ...edit, cursor: selected ? edit.cursor : selection.start + 5 };
}

// Negates the complete expression; it does not perform arithmetic in the browser.
export function negateExpression(value: string): Edit {
  const next = value ? `-(${value})` : '-';
  return { value: next, cursor: next.length };
}
