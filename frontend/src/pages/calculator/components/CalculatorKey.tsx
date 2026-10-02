import type { MouseEvent, ReactNode } from 'react';
import './CalculatorKey.css';

type CalculatorKeyProps = {
  children: ReactNode;
  label: string;
  className: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  preserveCaret?: boolean;
  onClick?: () => void;
};

export function CalculatorKey({
  children,
  label,
  className,
  disabled,
  type = 'button',
  preserveCaret = true,
  onClick,
}: CalculatorKeyProps) {
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <button
      type={type}
      className={className}
      aria-label={label}
      disabled={disabled}
      onMouseDown={preserveCaret ? handleMouseDown : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
