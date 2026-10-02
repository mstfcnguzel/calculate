import { describe, expect, it } from 'vitest';
import { normalizeExpression } from './normalizeExpression';

describe('expression normalization before submission', () => {
  it.each([
    ['2+3))', ['Removed extra closing parentheses.']],
    ['2+3+', ['Removed trailing operators.']],
    ['2*(3+4', ['Added missing closing parentheses at the end.']],
    ['((2+3))', ['Removed redundant parentheses.']],
    [
      '((2+3))+))',
      [
        'Removed extra closing parentheses.',
        'Removed trailing operators.',
        'Removed redundant parentheses.',
      ],
    ],
    ['2*(3+4+', ['Removed trailing operators.', 'Added missing closing parentheses at the end.']],
    ['1 + 2', []],
    [' 1 + 2 ', []],
    ['2+(', ['Removed empty opening parentheses at the end.', 'Removed trailing operators.']],
    ['2+sq', ['Removed an incomplete sqrt name at the end.', 'Removed trailing operators.']],
  ])('describes only the corrections applied to %s', (input, changes) => {
    expect(normalizeExpression(input as string).changes).toEqual(changes);
  });
  it.each([
    ['2*(3+4', '2*(3+4)'],
    ['2*(3+4*5', '2*(3+4*5)'],
    ['(2+(3*4', '(2+(3*4))'],
    ['sqrt(9', 'sqrt(9)'],
    ['√(9', '√(9)'],
    ['2+3))', '2+3'],
    [')1+(2*3))', '1+(2*3)'],
    ['2+3+', '2+3'],
    ['2+3+*− ÷ ^ ', '2+3'],
    ['2+))', '2'],
    ['2*(3+4+', '2*(3+4)'],
    ['((2+3))', '(2+3)'],
    ['((2+3))*4', '(2+3)*4'],
    ['sqrt(((9)))', 'sqrt(9)'],
    ['sqrt( (9) )', 'sqrt( 9 )'],
    ['2+(', '2'],
    ['2+( ( ', '2'],
    ['(2+3+(', '(2+3)'],
    ['2+(sq', '2'],
    ['2+sq((', '2'],
    ['2+s', '2'],
    ['2+sq', '2'],
    ['2+sqr ', '2'],
    ['(', ''],
    ['s', ''],
    ['sq', ''],
    ['sqr', ''],
    ['  1 + 2\n', '1 + 2'],
    ['', ''],
    [' \n ', ''],
  ])('normalizes %s to %s and is idempotent', (input, output) => {
    expect(normalizeExpression(input).value).toBe(output);
    expect(normalizeExpression(output).value).toBe(output);
  });

  it.each([
    '(2+3)*4',
    '15%',
    '100%%',
    '2^-3',
    '-2^2',
    '1e-3',
    '1e+',
    '1e+*',
    'sqrt()',
    'sqrt(-',
    'sqrt',
    '2+sq+3',
    '2+qrt',
    '(2+)',
    '1..2',
    '2**3',
    '-',
    '((2)+(3))',
  ])('preserves meaningful signs, grouping, or errors for the backend: %s', (value) => {
    const expected = value === 'sqrt(-' ? 'sqrt(-)' : value;
    expect(normalizeExpression(value).value).toBe(expected);
  });

  it('maps the cursor through removed parentheses and whitespace', () => {
    expect(normalizeExpression('((2+3))', 4)).toMatchObject({ value: '(2+3)', cursor: 3 });
    expect(normalizeExpression(')1+2', 1)).toMatchObject({ value: '1+2', cursor: 0 });
    expect(normalizeExpression('  1+2  ', 3)).toMatchObject({ value: '1+2', cursor: 1 });
    expect(normalizeExpression('2*(3+4', 3)).toMatchObject({ value: '2*(3+4)', cursor: 3 });
    expect(normalizeExpression('2+(sq', 1)).toMatchObject({ value: '2', cursor: 1 });
    expect(normalizeExpression('2+(sq', 4)).toMatchObject({ value: '2', cursor: 1 });
  });
});
