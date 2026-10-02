import { useRef, type ChangeEvent, type KeyboardEvent, type Ref, type SyntheticEvent } from 'react';
import type { AppError } from '../../../errors/AppError';
import type { Selection } from '../model/expression';
import { MAX_EXPRESSION_LENGTH } from '../model/expressionPolicy';
import './ExpressionInput.css';

type ExpressionInputProps = {
  value: string;
  error: AppError | null;
  disabled: boolean;
  inputRef: Ref<HTMLTextAreaElement>;
  onChange: (value: string, previousSelection?: Selection) => void;
  onReset: () => void;
};

export function ExpressionInput({
  value,
  error,
  disabled,
  inputRef,
  onChange,
  onReset,
}: ExpressionInputProps) {
  const previousSelection = useRef<Selection | undefined>(undefined);

  function rememberSelection(event: SyntheticEvent<HTMLTextAreaElement>) {
    previousSelection.current = {
      start: event.currentTarget.selectionStart,
      end: event.currentTarget.selectionEnd,
    };
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onChange(event.target.value, previousSelection.current);
    previousSelection.current = undefined;
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    rememberSelection(event);
    if ((event.key === 'Enter' && !event.shiftKey) || event.key === '=') {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onReset();
    }
  }

  return (
    <div className="expression-display">
      <label htmlFor="expression">Your expression</label>
      <textarea
        id="expression"
        ref={inputRef}
        rows={2}
        maxLength={MAX_EXPRESSION_LENGTH}
        value={value}
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="(12.5 + 3) × 2"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'expression-error' : 'expression-hint'}
        onChange={handleChange}
        onBeforeInput={rememberSelection}
        onPaste={rememberSelection}
        onKeyDown={handleKeyDown}
      />
      <div className="display-bottom">
        <span>Type an expression or use the keys below</span>
        <span aria-hidden="true">↵</span>
      </div>
    </div>
  );
}
