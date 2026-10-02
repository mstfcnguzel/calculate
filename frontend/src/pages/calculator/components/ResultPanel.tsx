import { presentResult } from '../model/calculator';
import type { CompletedCalculation } from '../model/types';
import type { AppError } from '../../../errors/AppError';
import { ErrorMessage } from '../../../components/feedback/ErrorMessage';
import { CopyButton } from '../../../components/feedback/CopyButton';
import './ResultPanel.css';

type ResultPanelProps = {
  error: AppError | null;
  pending: boolean;
  completed: CompletedCalculation | null;
  onUseResult: () => void;
};

export function ResultPanel({ error, pending, completed, onUseResult }: ResultPanelProps) {
  function renderContent() {
    if (error) return <ErrorMessage error={error} messageId="expression-error" />;
    if (completed) return <CompletedResult calculation={completed} onUseResult={onUseResult} />;
    return <EmptyResult pending={pending} />;
  }

  return (
    <section
      className={`result-panel ${completed ? 'has-result' : ''}`}
      aria-label="Calculation result"
      aria-live="polite"
      aria-atomic="true"
      aria-busy={pending}
    >
      <span className="result-label">YOUR RESULT</span>
      {renderContent()}
      <div className="result-footer">
        <span aria-hidden="true">✦</span> Small calculations. Clear answers.
      </div>
    </section>
  );
}

type CompletedResultProps = {
  calculation: CompletedCalculation;
  onUseResult: () => void;
};

function CompletedResult({ calculation, onUseResult }: CompletedResultProps) {
  const presentation = presentResult(calculation.result);
  return (
    <>
      <p className="result-expression">{calculation.expression} =</p>
      <output
        className="result-value"
        aria-label="Result"
        aria-describedby={presentation.approximate ? 'result-precision' : undefined}
      >
        {presentation.approximate && (
          <span className="approximate-sign" aria-hidden="true">
            ≈{' '}
          </span>
        )}
        {presentation.formatted}
      </output>
      {presentation.approximate && (
        <p className="precision-hint" id="result-precision">
          Rounded for display. “Use this result” keeps the full precision.
        </p>
      )}
      <p className="result-caption">One less thing to work out.</p>
      <button className="use-result" type="button" onClick={onUseResult}>
        Use this result <span aria-hidden="true">↗</span>
      </button>
      <CopyButton key={presentation.copyValue} text={presentation.copyValue} />
    </>
  );
}

function EmptyResult({ pending }: { pending: boolean }) {
  return (
    <>
      <div className="empty-symbol" aria-hidden="true">
        =
      </div>
      <h2>{pending ? 'Working it out…' : 'Your answer starts here.'}</h2>
      <p>
        {pending
          ? 'Waiting for your calculation.'
          : 'Write it out, or tap the keys. We’ll take care of the order of operations.'}
      </p>
    </>
  );
}
