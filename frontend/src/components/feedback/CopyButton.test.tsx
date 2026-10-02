import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CopyButton } from './CopyButton';

describe('copy feedback', () => {
  it('writes the supplied text and confirms success after the promise resolves', async () => {
    let resolve!: () => void;
    const writeText = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyButton text="12345.5" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy result' }));
    expect(writeText).toHaveBeenCalledWith('12345.5');
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    await act(async () => resolve());
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('shows a usable fallback if clipboard permission is denied and can retry', async () => {
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('Denied', 'NotAllowedError'))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<CopyButton text="0.3" />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/Could not copy/)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeEnabled();
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('handles browsers without the clipboard API', async () => {
    vi.stubGlobal('navigator', {});
    render(<CopyButton text="3" />);
    fireEvent.click(screen.getByRole('button'));
    expect(await screen.findByText(/copy it manually/)).toBeInTheDocument();
  });
});
