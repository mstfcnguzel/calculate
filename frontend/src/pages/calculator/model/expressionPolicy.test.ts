import { describe, expect, it } from 'vitest';
import { expressionPolicy } from './expressionPolicy';

describe('expression input policy', () => {
  it.each([
    '',
    '(',
    '2+',
    '12.5 × (3 − 1) ÷ 2',
    's',
    'sq',
    'sqr',
    'sqrt(9)',
    '√(9)',
    '1e',
    '1e-',
    '1e-3',
    '2.5E+1',
    '1+2\n',
    '1..2',
    '2**3',
  ])('allows valid characters and unfinished editing: %s', (value) => {
    expect(expressionPolicy.validate(value)).toBeNull();
  });

  it.each(['a', 'r', 'q', 't', 'sin(9)', 'Sqrt(9)', '1a2', 'hello', 'e', '1 e3'])(
    'rejects unsupported text as a complete edit: %s',
    (value) => {
      expect(expressionPolicy.validate(value)?.code).toBe('UNSUPPORTED_FUNCTION');
    },
  );

  it.each(['1@2', '1,2', '1;2', '2&3', '😀', '2＝3'])(
    'rejects unsupported symbols: %s',
    (value) => {
      expect(expressionPolicy.validate(value)?.code).toBe('UNSUPPORTED_CHARACTER');
    },
  );

  it('allows deleting part of a function so editing cannot get stuck', () => {
    expect(expressionPolicy.validate('qrt(9)', 'sqrt(9)')).toBeNull();
    expect(expressionPolicy.validate('srt(9)', 'sqrt(9)')).toBeNull();
    expect(expressionPolicy.validate('sqrt(9)', 'qrt(9)')).toBeNull();
    expect(expressionPolicy.validate('qrt(9)', '1')).not.toBeNull();
  });

  it('bounds both input and the completed expression', () => {
    expect(expressionPolicy.validate('1'.repeat(512))).toBeNull();
    expect(expressionPolicy.validate('1'.repeat(513))?.code).toBe('EXPRESSION_TOO_LONG');
    expect(() => expressionPolicy.prepare('('.repeat(256) + '1+2')).not.toThrow();
    // Completion can exceed the limit even when the user-entered input does not.
    expect(() => expressionPolicy.prepare('1+('.repeat(128) + '1')).toThrow('512');
  });
});
