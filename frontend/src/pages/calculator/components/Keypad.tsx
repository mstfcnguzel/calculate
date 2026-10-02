import { CalculatorKey } from './CalculatorKey';
import './Keypad.css';

const functionKeys = [
  { text: '(', label: 'Open parenthesis' },
  { text: ')', label: 'Close parenthesis' },
  { text: '^', label: 'Power', display: 'xʸ' },
  { text: 'sqrt', label: 'Square root', display: '√' },
  { text: '%', label: 'Percentage' },
];
const numberKeys = ['7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+'];
const keyLabels: Record<string, string> = {
  '×': 'Multiply',
  '−': 'Subtract',
  '+': 'Add',
  '÷': 'Divide',
  '.': 'Decimal point',
};

type KeypadProps = {
  pending: boolean;
  onInsert: (text: string) => void;
  onReset: () => void;
  onBackspace: () => void;
  onNegate: () => void;
};

export function Keypad({ pending, onInsert, onReset, onBackspace, onNegate }: KeypadProps) {
  function renderKey(text: string, label = keyLabels[text] ?? text, className = '') {
    return (
      <CalculatorKey
        key={label}
        className={`key ${className}`}
        label={label}
        disabled={pending}
        onClick={() => onInsert(text)}
      >
        {text}
      </CalculatorKey>
    );
  }

  return (
    <>
      <div className="function-keys" aria-label="Advanced operations">
        {functionKeys.map((item) => (
          <CalculatorKey
            key={item.label}
            className="function-key"
            label={item.label}
            disabled={pending}
            onClick={() => onInsert(item.text)}
          >
            {item.display ?? item.text}
          </CalculatorKey>
        ))}
      </div>
      <div className="keypad" role="group" aria-label="Calculator keypad">
        <CalculatorKey
          className="key key-clear"
          label="Clear all"
          preserveCaret={false}
          onClick={onReset}
        >
          AC
        </CalculatorKey>
        <CalculatorKey
          className="key key-utility"
          label="Backspace"
          disabled={pending}
          onClick={onBackspace}
        >
          ⌫
        </CalculatorKey>
        {renderKey('÷', 'Divide', 'key-operator')}
        {numberKeys.map((text) =>
          renderKey(text, keyLabels[text] ?? text, keyLabels[text] ? 'key-operator' : 'key-number'),
        )}
        <CalculatorKey
          className="key key-utility"
          label="Negate expression"
          disabled={pending}
          onClick={onNegate}
        >
          ±
        </CalculatorKey>
        {renderKey('0', '0', 'key-number')}
        {renderKey('.', 'Decimal point', 'key-number')}
        <CalculatorKey
          className="key key-equals"
          type="submit"
          label={pending ? 'Calculating' : 'Calculate'}
          disabled={pending}
          preserveCaret={false}
        >
          {pending ? '…' : '='}
        </CalculatorKey>
      </div>
    </>
  );
}
