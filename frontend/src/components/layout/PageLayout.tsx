import type { ReactNode } from 'react';
import './PageLayout.css';

type PageLayoutProps = { children: ReactNode };

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="page">
      <header className="header">
        <a className="brand" href="/" aria-label="Everyday Calculator home">
          <span className="brand-icon" aria-hidden="true">
            =
          </span>
          <span>
            everyday<span className="brand-dot">.</span>
          </span>
        </a>
        <span className="header-note">A little clarity in your numbers.</span>
      </header>
      <main>{children}</main>
      <footer className="footer">
        <span>everyday.</span>
        <span>Less guesswork. More clarity.</span>
      </footer>
    </div>
  );
}
