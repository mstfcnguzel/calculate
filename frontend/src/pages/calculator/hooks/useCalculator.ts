import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { evaluate, CalculatorApiError } from '../../../services/calculatorApi';
import {
  insertText,
  deleteBackward,
  insertSquareRoot,
  negateExpression,
  selectionBeforeChange,
  type Edit,
  type Selection,
} from '../model/expression';
import type { CompletedCalculation } from '../model/types';
import { AppError, toAppError } from '../../../errors/AppError';
import { expressionPolicy } from '../model/expressionPolicy';
import type { NormalizedExpression } from '../model/normalizeExpression';

// Owns editing, focus, and the request lifecycle; components only render state.
export function useCalculator() {
  const [expression, setExpression] = useState('');
  const [error, setError] = useState<AppError | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState<CompletedCalculation | null>(null);
  const [normalizationNotice, setNormalizationNotice] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restoreSelection = useRef<Selection | null>(null);

  useEffect(
    () => () => {
      activeRequest.current?.abort();
      activeRequest.current = null;
    },
    [],
  );

  // Restore the caret after React commits a keypad edit or enables the reset input.
  useLayoutEffect(() => {
    if (!pending && restoreSelection.current && inputRef.current) {
      const { start, end } = restoreSelection.current;
      inputRef.current.focus();
      inputRef.current.setSelectionRange(start, end);
      restoreSelection.current = null;
    }
  });

  function clearFeedback() {
    setError(null);
    setCompleted(null);
    setNormalizationNotice('');
  }

  function changeExpression(value: string, previousSelection?: Selection) {
    const failure = expressionPolicy.validate(value, expression);
    if (failure) {
      // Keep the rejected edit's original selection, including a replaced range.
      restoreSelection.current = previousSelection ?? selectionBeforeChange(expression, value);
      setError(failure);
      return false;
    }
    setExpression(value);
    clearFeedback();
    return true;
  }

  function applyEdit(edit: Edit) {
    if (changeExpression(edit.value))
      restoreSelection.current = { start: edit.cursor, end: edit.cursor };
  }

  function selection(): Selection {
    return {
      start: inputRef.current?.selectionStart ?? expression.length,
      end: inputRef.current?.selectionEnd ?? expression.length,
    };
  }

  function insert(text: string) {
    let value = expression;
    let range = selection();
    if (completed) {
      // Continue from the exact backend result for operators; digits start afresh.
      value = ['+', '−', '×', '÷', '^', '%', 'sqrt'].includes(text) ? String(completed.result) : '';
      range = { start: value.length, end: value.length };
      if (text === 'sqrt') range = { start: 0, end: value.length };
    }
    applyEdit(text === 'sqrt' ? insertSquareRoot(value, range) : insertText(value, range, text));
  }

  function backspace() {
    applyEdit(deleteBackward(expression, selection()));
  }

  function negate() {
    applyEdit(negateExpression(completed ? String(completed.result) : expression));
  }

  function useResult() {
    if (!completed) return;
    const value = String(completed.result);
    applyEdit({ value, cursor: value.length });
  }

  function reset() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    restoreSelection.current = { start: 0, end: 0 };
    setPending(false);
    changeExpression('');
  }

  function handleFailure(failure: unknown, submitted: string, controller: AbortController) {
    setError(
      controller.signal.aborted
        ? new AppError('The request timed out. Please try again.', 'REQUEST_TIMEOUT')
        : toAppError(failure),
    );
    if (failure instanceof CalculatorApiError && failure.position) {
      // API positions count Unicode characters; textarea offsets count UTF-16 units.
      const start = Array.from(submitted)
        .slice(0, failure.position - 1)
        .join('').length;
      restoreSelection.current = { start, end: Math.min(start + 1, submitted.length) };
    }
  }

  async function calculate(submitted: string) {
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    try {
      const result = await evaluate(submitted, controller.signal);
      if (activeRequest.current === controller) setCompleted({ expression: submitted, result });
    } catch (failure) {
      if (activeRequest.current === controller) handleFailure(failure, submitted, controller);
    } finally {
      window.clearTimeout(timeout);
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activeRequest.current) return;
    clearFeedback();
    let edit: NormalizedExpression;
    try {
      edit = expressionPolicy.prepare(expression, selection().start);
    } catch (failure) {
      setError(toAppError(failure));
      return;
    }
    setExpression(edit.value);
    setNormalizationNotice(edit.changes.join(' '));
    if (edit.value !== expression)
      restoreSelection.current = { start: edit.cursor, end: edit.cursor };
    if (!edit.value) {
      setError(new AppError('Enter an expression to calculate.', 'EMPTY_EXPRESSION'));
      inputRef.current?.focus();
      return;
    }
    await calculate(edit.value);
  }

  return {
    expression,
    error,
    pending,
    completed,
    normalizationNotice,
    inputRef,
    changeExpression,
    insert,
    backspace,
    negate,
    useResult,
    reset,
    submit,
  };
}
