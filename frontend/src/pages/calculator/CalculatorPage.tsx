import { PageLayout } from '../../components/layout/PageLayout';
import { ExpressionInput } from './components/ExpressionInput';
import { Keypad } from './components/Keypad';
import { ResultPanel } from './components/ResultPanel';
import { useCalculator } from './hooks/useCalculator';
import './CalculatorPage.css';

export function CalculatorPage() {
  const calculator = useCalculator();

  return (
    <PageLayout>
      <section className="intro" aria-labelledby="page-title">
        <span className="eyebrow">THE EVERYDAY CALCULATOR</span>
        <h1 id="page-title">
          Make the numbers
          <br />
          <span>make sense.</span>
        </h1>
        <p>A familiar keypad. Room for a little more thought.</p>
      </section>
      <div className="calculator-card">
        <form onSubmit={calculator.submit} noValidate aria-label="Calculator">
          <div className="calculator-heading">
            <h2>Calculator</h2>
            <span className="mode-badge">EXPRESSION MODE</span>
          </div>
          <ExpressionInput
            value={calculator.expression}
            error={calculator.error}
            disabled={calculator.pending}
            inputRef={calculator.inputRef}
            onChange={calculator.changeExpression}
            onReset={calculator.reset}
          />
          {calculator.normalizationNotice && (
            <p className="normalization-notice" role="status">
              Expression updated: {calculator.normalizationNotice}
            </p>
          )}
          <Keypad
            pending={calculator.pending}
            onInsert={calculator.insert}
            onReset={calculator.reset}
            onBackspace={calculator.backspace}
            onNegate={calculator.negate}
          />
          <p className="keyboard-hint" id="expression-hint">
            <kbd>Enter</kbd> calculate <span>·</span> <kbd>Esc</kbd> clear <span>·</span>{' '}
            <kbd>Backspace</kbd> delete
          </p>
          <p className="percentage-hint">
            For 15% of 250, enter <strong>250 × 15%</strong>.
          </p>
        </form>
        <ResultPanel
          error={calculator.error}
          pending={calculator.pending}
          completed={calculator.completed}
          onUseResult={calculator.useResult}
        />
      </div>
      <div className="notes">
        <span>
          <span aria-hidden="true">↳</span> Parentheses, powers, and possibilities.
        </span>
        <span>Built for everyday arithmetic.</span>
      </div>
    </PageLayout>
  );
}
