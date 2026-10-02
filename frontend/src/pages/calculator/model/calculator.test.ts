import { describe, expect, it } from 'vitest';
import { formatResult, presentResult } from './calculator';

describe('result formatting', () => {
  it.each([
    [0, '0', false],
    [-0, '0', false],
    [12345.5, '12345.5', false],
    [-12345.5, '-12345.5', false],
    [0.1 + 0.2, '0.3', true],
    [1 / 3, '0.333333333333333', true],
    [1e21, '1e+21', false],
    [1e-10, '1e-10', false],
    [1.2345678901234567e-10, '1.23456789012346e-10', true],
    [Number.MAX_VALUE, '1.7976931348623157e+308', false],
    [-Number.MAX_VALUE, '-1.7976931348623157e+308', false],
  ])('makes %s pasteable and flags actual display rounding', (value, copyValue, approximate) => {
    const presentation = presentResult(value as number);
    expect(presentation.copyValue).toBe(copyValue);
    expect(presentation.approximate).toBe(approximate);
    expect(presentation.copyValue).not.toContain(',');
    expect(Number.isFinite(Number(presentation.copyValue))).toBe(true);
  });
  it.each([
    [0, '0'],
    [-0, '0'],
    [12345.5, '12,345.5'],
    [-2.5, '-2.5'],
    [0.1 + 0.2, '0.3'],
    [1e15, '1000000000000000'],
    [1e21, '1e+21'],
    [1e-10, '1e-10'],
    [Number.MAX_VALUE, '1.7976931348623157e+308'],
    [-Number.MAX_VALUE, '-1.7976931348623157e+308'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatResult(value as number)).toBe(expected);
  });
});
