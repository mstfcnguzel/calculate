import { describe, expect, it } from 'vitest';
import {
  deleteBackward,
  insertSquareRoot,
  insertText,
  negateExpression,
  selectionBeforeChange,
} from './expression';

describe('expression text editing', () => {
  it('locates the original range of a rejected insertion or replacement', () => {
    expect(selectionBeforeChange('12+3', '12@+3')).toEqual({ start: 2, end: 2 });
    expect(selectionBeforeChange('12+3', 'abc+3')).toEqual({ start: 0, end: 2 });
    expect(selectionBeforeChange('', 'a')).toEqual({ start: 0, end: 0 });
  });
  it('inserts at the cursor and replaces a selection', () => {
    expect(insertText('12+3', { start: 2, end: 2 }, '×')).toEqual({ value: '12×+3', cursor: 3 });
    expect(insertText('12+3', { start: 0, end: 2 }, '9')).toEqual({ value: '9+3', cursor: 1 });
  });
  it('deletes selection or the character before the caret', () => {
    expect(deleteBackward('123', { start: 2, end: 2 })).toEqual({ value: '13', cursor: 1 });
    expect(deleteBackward('123', { start: 0, end: 2 })).toEqual({ value: '3', cursor: 0 });
    expect(deleteBackward('123', { start: 0, end: 0 })).toEqual({ value: '123', cursor: 0 });
    expect(deleteBackward('', { start: 0, end: 0 })).toEqual({ value: '', cursor: 0 });
  });
  it('places the cursor inside empty sqrt parentheses or wraps a selection', () => {
    expect(insertSquareRoot('', { start: 0, end: 0 })).toEqual({ value: 'sqrt()', cursor: 5 });
    expect(insertSquareRoot('1+9', { start: 2, end: 3 })).toEqual({
      value: '1+sqrt(9)',
      cursor: 9,
    });
  });
  it('negates an entire expression without evaluating it', () => {
    expect(negateExpression('1+2')).toEqual({ value: '-(1+2)', cursor: 6 });
    expect(negateExpression('')).toEqual({ value: '-', cursor: 1 });
  });
});
