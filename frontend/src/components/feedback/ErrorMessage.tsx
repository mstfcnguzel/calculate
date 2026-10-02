import type { AppError } from '../../errors/AppError';
import './ErrorMessage.css';

type ErrorMessageProps = { error: AppError; messageId?: string };

export function ErrorMessage({ error, messageId }: ErrorMessageProps) {
  return (
    <div className="error-state" role="alert">
      <span className="error-icon" aria-hidden="true">
        !
      </span>
      <h2>Let’s try that again.</h2>
      <p id={messageId}>{error.message}</p>
      {error.position !== undefined && (
        <small className="error-position">Character {error.position}</small>
      )}
    </div>
  );
}
