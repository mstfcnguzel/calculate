import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { evaluate, CalculatorApiError } from './services/calculatorApi';

vi.mock('./services/calculatorApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/calculatorApi')>();
  return { ...actual, evaluate: vi.fn() };
});
const mockEvaluate = vi.mocked(evaluate);
beforeEach(() => {
  mockEvaluate.mockReset();
});
const expressionInput = () => screen.getByRole('textbox', { name: 'Your expression' });
const key = (name: string) => screen.getByRole('button', { name });

async function enter(expression = '(12.5 + 3) * 2') {
  const user = userEvent.setup();
  await user.type(expressionInput(), expression);
  return user;
}

describe('expression calculator', () => {
  it('explains corrections and clears the notice on editing or an unchanged submission', async () => {
    mockEvaluate.mockResolvedValue(14);
    render(<App />);
    const user = await enter('2*(3+4+');
    await user.keyboard('{Enter}');
    expect(screen.getByText(/Expression updated/)).toHaveTextContent(
      'Removed trailing operators. Added missing closing parentheses at the end.',
    );
    await screen.findByLabelText('Result');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    expect(screen.queryByText(/Expression updated/)).not.toBeInTheDocument();
    await user.type(expressionInput(), '+');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    expect(screen.getByText(/Expression updated/)).toBeInTheDocument();
    await user.click(key('Clear all'));
    expect(screen.queryByText(/Expression updated/)).not.toBeInTheDocument();
  });

  it('copies a grouped result in a format that can be pasted into the editor', async () => {
    mockEvaluate.mockResolvedValue(12345.5);
    render(<App />);
    const user = await enter('12345.5');
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(key('Calculate'));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('12,345.5');
    await user.click(key('Copy result'));
    expect(writeText).toHaveBeenCalledWith('12345.5');
    expect(await screen.findByText('Copied')).toBeInTheDocument();
    await user.clear(expressionInput());
    await user.paste();
    expect(expressionInput()).toHaveValue('12345.5');
  });

  it('marks rounded displays, copies their shown value, and reuses full precision', async () => {
    mockEvaluate.mockResolvedValue(0.30000000000000004);
    render(<App />);
    const user = await enter('0.1+0.2');
    const writeText = vi.spyOn(navigator.clipboard, 'writeText');
    await user.click(key('Calculate'));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('≈ 0.3');
    expect(screen.getByText(/Rounded for display/)).toBeInTheDocument();
    await user.click(key('Copy result'));
    expect(writeText).toHaveBeenCalledWith('0.3');
    await user.click(screen.getByRole('button', { name: /Use this result/ }));
    expect(expressionInput()).toHaveValue('0.30000000000000004');
  });

  it.each([Number.MAX_VALUE, -Number.MAX_VALUE])(
    'displays and copies the finite boundary result %s',
    async (result) => {
      mockEvaluate.mockResolvedValue(result);
      render(<App />);
      const user = await enter(String(result));
      const writeText = vi.spyOn(navigator.clipboard, 'writeText');
      await user.click(key('Calculate'));
      expect(await screen.findByLabelText('Result')).toHaveTextContent(String(result));
      expect(screen.getByLabelText('Result')).not.toHaveTextContent('Infinity');
      expect(screen.getByLabelText('Result')).not.toHaveTextContent('≈');
      await user.click(key('Copy result'));
      expect(writeText).toHaveBeenCalledWith(String(result));
    },
  );

  it('removes rounding and copy feedback when a new exact result is shown', async () => {
    mockEvaluate.mockResolvedValueOnce(1 / 3).mockResolvedValueOnce(3);
    render(<App />);
    const user = await enter('1/3');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(key('Copy result'));
    await screen.findByText('Copied');
    // Submit again without editing; the result component receives a new value.
    await user.click(key('Calculate'));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('3');
    expect(screen.queryByText(/Rounded for display/)).not.toBeInTheDocument();
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Result')).not.toHaveTextContent('≈');
  });
  it('keeps unfinished input while typing, then updates the editor and API together', async () => {
    mockEvaluate.mockResolvedValue(14);
    render(<App />);
    const user = await enter('2*(3+4+');
    expect(expressionInput()).toHaveValue('2*(3+4+');
    await user.keyboard('{Enter}');
    expect(expressionInput()).toHaveValue('2*(3+4)');
    expect(mockEvaluate).toHaveBeenCalledWith('2*(3+4)', expect.any(AbortSignal));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('14');
  });

  it('rejects unsupported keyboard characters without changing the expression', async () => {
    render(<App />);
    const user = await enter('12');
    await user.keyboard('a@');
    expect(expressionInput()).toHaveValue('12');
    expect(screen.getByRole('alert')).toHaveTextContent('not supported');
    await user.keyboard('+3');
    expect(expressionInput()).toHaveValue('12+3');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['2+(', '2+s', '2+sq', '2+sqr', '2+(sq'])(
    'removes unfinished trailing input on submission: %s',
    async (expression) => {
      mockEvaluate.mockResolvedValue(2);
      render(<App />);
      const user = await enter(expression);
      expect(expressionInput()).toHaveValue(expression);
      await user.keyboard('{Enter}');
      expect(expressionInput()).toHaveValue('2');
      expect(mockEvaluate).toHaveBeenCalledWith('2', expect.any(AbortSignal));
      expect(await screen.findByLabelText('Result')).toHaveTextContent('2');
      expect(screen.getByText(/Expression updated/)).toBeInTheDocument();
    },
  );

  it.each(['(', 'sqr'])(
    'does not send an expression emptied by cleanup: %s',
    async (expression) => {
      render(<App />);
      const user = await enter(expression);
      await user.keyboard('{Enter}');
      expect(expressionInput()).toHaveValue('');
      expect(screen.getByRole('alert')).toHaveTextContent('Enter an expression');
      expect(mockEvaluate).not.toHaveBeenCalled();
    },
  );

  it('rejects an entire invalid paste and restores the replaced selection', async () => {
    render(<App />);
    const user = await enter('12+3');
    const input = expressionInput() as HTMLTextAreaElement;
    input.setSelectionRange(0, 2);
    await user.paste('1a2');
    expect(input).toHaveValue('12+3');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(2);
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('accepts scientific notation and a typed square root function', async () => {
    mockEvaluate.mockResolvedValue(3.001);
    render(<App />);
    const user = await enter('1e-3+sqrt(9');
    await user.keyboard('{Enter}');
    expect(mockEvaluate).toHaveBeenCalledWith('1e-3+sqrt(9)', expect.any(AbortSignal));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('3.001');
  });

  it('shows specific backend error details against the normalized expression', async () => {
    mockEvaluate.mockRejectedValue(
      new CalculatorApiError('Parentheses must contain a value.', 3, 'EMPTY_PARENTHESES'),
    );
    render(<App />);
    const user = await enter(')1+()');
    await user.click(key('Calculate'));
    expect(expressionInput()).toHaveValue('1+()');
    expect(await screen.findByRole('alert')).toHaveTextContent('Parentheses must contain a value.');
    expect(screen.getByRole('alert')).toHaveTextContent('Character 3');
    expect((expressionInput() as HTMLTextAreaElement).selectionStart).toBe(2);
  });

  it('reports when completion would exceed the expression size limit', async () => {
    render(<App />);
    fireEvent.change(expressionInput(), { target: { value: '1+('.repeat(128) + '1' } });
    await userEvent.click(key('Calculate'));
    expect(screen.getByRole('alert')).toHaveTextContent('512');
    expect(mockEvaluate).not.toHaveBeenCalled();
  });
  it('shows an editable expression and a complete keypad', () => {
    render(<App />);
    expect(expressionInput()).toHaveValue('');
    for (const label of [
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Decimal point',
      'Add',
      'Subtract',
      'Multiply',
      'Divide',
      'Power',
      'Square root',
      'Percentage',
      'Open parenthesis',
      'Close parenthesis',
      'Backspace',
      'Clear all',
      'Calculate',
    ]) {
      expect(key(label)).toBeInTheDocument();
    }
  });

  it('sends the typed expression to the backend on Enter', async () => {
    mockEvaluate.mockResolvedValue(31);
    render(<App />);
    const user = await enter();
    await user.keyboard('{Enter}');
    expect(mockEvaluate).toHaveBeenCalledWith('(12.5 + 3) * 2', expect.any(AbortSignal));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('31');
  });

  it('builds a decimal expression from keypad buttons', async () => {
    mockEvaluate.mockResolvedValue(15.5);
    render(<App />);
    const user = userEvent.setup();
    for (const name of ['1', '2', 'Decimal point', '5', 'Add', '3']) await user.click(key(name));
    expect(expressionInput()).toHaveValue('12.5+3');
    await user.click(key('Calculate'));
    expect(mockEvaluate).toHaveBeenCalledWith('12.5+3', expect.any(AbortSignal));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('15.5');
  });

  it('inserts at the caret and replaces a selection', async () => {
    render(<App />);
    const user = await enter('12+3');
    const input = expressionInput() as HTMLTextAreaElement;
    input.setSelectionRange(2, 2);
    await user.click(key('Multiply'));
    expect(input).toHaveValue('12×+3');
    expect(input.selectionStart).toBe(3);
    input.setSelectionRange(0, 2);
    await user.click(key('9'));
    expect(input).toHaveValue('9×+3');
    expect(input.selectionStart).toBe(1);
    expect(input).toHaveFocus();
  });

  it('backspace deletes the preceding character or selected text', async () => {
    render(<App />);
    const user = await enter('123');
    await user.click(key('Backspace'));
    expect(expressionInput()).toHaveValue('12');
    (expressionInput() as HTMLTextAreaElement).setSelectionRange(0, 2);
    await user.click(key('Backspace'));
    expect(expressionInput()).toHaveValue('');
  });

  it('square root inserts parentheses with the cursor inside', async () => {
    render(<App />);
    const user = userEvent.setup();
    await user.click(key('Square root'));
    const input = expressionInput() as HTMLTextAreaElement;
    expect(input).toHaveValue('sqrt()');
    expect(input.selectionStart).toBe(5);
    await user.click(key('9'));
    expect(input).toHaveValue('sqrt(9)');
    input.setSelectionRange(0, input.value.length);
    await user.click(key('Square root'));
    expect(input).toHaveValue('sqrt(sqrt(9))');
  });

  it('supports parentheses, powers, percentages, and negation', async () => {
    render(<App />);
    const user = userEvent.setup();
    for (const name of [
      'Open parenthesis',
      '2',
      'Add',
      '3',
      'Close parenthesis',
      'Power',
      '2',
      'Percentage',
    ])
      await user.click(key(name));
    expect(expressionInput()).toHaveValue('(2+3)^2%');
    await user.click(key('Negate expression'));
    expect(expressionInput()).toHaveValue('-((2+3)^2%)');
  });

  it('rejects blank input before making a request', async () => {
    render(<App />);
    await userEvent.click(key('Calculate'));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an expression');
    expect(expressionInput()).toHaveFocus();
    expect(mockEvaluate).not.toHaveBeenCalled();
  });

  it('shows backend syntax errors and highlights the error position', async () => {
    mockEvaluate.mockRejectedValue(new CalculatorApiError('Expected a number.', 3));
    render(<App />);
    const user = await enter('1+*2');
    await user.click(key('Calculate'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Expected a number.');
    const input = expressionInput() as HTMLTextAreaElement;
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(3);
    await user.click(key('3'));
    expect(input).toHaveValue('1+32');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows network/domain errors and can retry', async () => {
    mockEvaluate
      .mockRejectedValueOnce(new Error('Cannot divide by zero.'))
      .mockResolvedValueOnce(5);
    render(<App />);
    const user = await enter('10/0');
    await user.click(key('Calculate'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.');
    await user.clear(expressionInput());
    await user.type(expressionInput(), '10/2');
    await user.click(key('Calculate'));
    expect(await screen.findByLabelText('Result')).toHaveTextContent('5');
  });

  it('clears the old answer when typing and supports Escape', async () => {
    mockEvaluate.mockResolvedValue(31);
    render(<App />);
    const user = await enter();
    await user.keyboard('=');
    await screen.findByLabelText('Result');
    await user.type(expressionInput(), '+1');
    expect(screen.queryByLabelText('Result')).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(expressionInput()).toHaveValue('');
  });

  it('starts fresh for digits after a result and continues from the exact result for operators', async () => {
    mockEvaluate.mockResolvedValue(0.30000000000000004);
    render(<App />);
    const user = await enter('0.1+0.2');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(key('Add'));
    expect(expressionInput()).toHaveValue('0.30000000000000004+');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(key('7'));
    expect(expressionInput()).toHaveValue('7');
  });

  it('can use the result in the editor, wrap it in sqrt, or negate it', async () => {
    mockEvaluate.mockResolvedValue(9);
    render(<App />);
    const user = await enter('4+5');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(screen.getByRole('button', { name: /Use this result/ }));
    expect(expressionInput()).toHaveValue('9');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(key('Square root'));
    expect(expressionInput()).toHaveValue('sqrt(9)');
    await user.click(key('Calculate'));
    await screen.findByLabelText('Result');
    await user.click(key('Negate expression'));
    expect(expressionInput()).toHaveValue('-(9)');
  });

  it('limits keypad insertion as well as keyboard input', async () => {
    render(<App />);
    fireEvent.change(expressionInput(), { target: { value: '1'.repeat(512) } });
    await userEvent.click(key('1'));
    expect(screen.getByRole('alert')).toHaveTextContent('Use at most 512');
    expect((expressionInput() as HTMLTextAreaElement).value).toHaveLength(512);
  });

  it('prevents duplicate submissions and disables editing while pending', async () => {
    let resolve!: (value: number) => void;
    mockEvaluate.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<App />);
    const user = await enter('1+2');
    await user.click(key('Calculate'));
    expect(expressionInput()).toBeDisabled();
    expect(key('7')).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Calculator' }));
    expect(mockEvaluate).toHaveBeenCalledTimes(1);
    await act(async () => resolve(3));
    expect(screen.getByLabelText('Result')).toHaveTextContent('3');
  });

  it('AC cancels pending work and ignores a late response', async () => {
    let resolve!: (value: number) => void;
    mockEvaluate.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    render(<App />);
    const user = await enter('1+2');
    await user.click(key('Calculate'));
    const signal = mockEvaluate.mock.calls[0][1];
    await user.click(key('Clear all'));
    expect(signal.aborted).toBe(true);
    expect(expressionInput()).toHaveValue('');
    expect(expressionInput()).toHaveFocus();
    await act(async () => resolve(3));
    expect(screen.queryByLabelText('Result')).not.toBeInTheDocument();
  });

  it('ignores a late cancelled error and aborts on unmount', async () => {
    let reject!: (error: Error) => void;
    mockEvaluate.mockReturnValue(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const view = render(<App />);
    const user = await enter('1+2');
    await user.click(key('Calculate'));
    const signal = mockEvaluate.mock.calls[0][1];
    view.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => reject(new Error('Late failure')));
  });

  it('times out slow requests and recovers', async () => {
    vi.useFakeTimers();
    mockEvaluate.mockImplementation(
      (_, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    render(<App />);
    fireEvent.change(expressionInput(), { target: { value: '1+2' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Calculator' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('timed out');
    expect(key('Calculate')).toBeEnabled();
  });

  it('handles unexpected error values', async () => {
    mockEvaluate.mockRejectedValue('unknown');
    render(<App />);
    const user = await enter();
    await user.click(key('Calculate'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong.');
  });

  it('Shift+Enter inserts a newline rather than submitting', async () => {
    render(<App />);
    const user = await enter('1+2');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    expect(expressionInput()).toHaveValue('1+2\n');
    expect(mockEvaluate).not.toHaveBeenCalled();
  });
});
