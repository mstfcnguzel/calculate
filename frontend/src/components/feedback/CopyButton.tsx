import { useState } from 'react';
import './CopyButton.css';

type CopyButtonProps = { text: string };

export function CopyButton({ text }: CopyButtonProps) {
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function copy() {
    setCopying(true);
    setFeedback('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setFeedback('Copied');
    } catch {
      setFeedback('Could not copy. Select the result and copy it manually.');
    } finally {
      setCopying(false);
    }
  }

  return (
    <div className="copy-control">
      <button className="copy-result" type="button" onClick={copy} disabled={copying}>
        Copy result
      </button>
      <span className="copy-feedback" role="status">
        {feedback}
      </span>
    </div>
  );
}
