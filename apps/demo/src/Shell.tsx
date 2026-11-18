import type { ThemeInput } from '@dashkit/sdk';
import type { CSSProperties, ReactNode } from 'react';
import { PAGES, type PageId } from './host-state';

/**
 * The host product styles itself from the same brand it gives the dashboard, so a customer's
 * colours and fonts reach the whole page. Text uses only the pairs the theme's contrast check
 * covers: text on the background and the surface, muted text on the surface, and primaryContrast on
 * primary. Values a brand leaves out keep the defaults in demo.css.
 */
export function brandStyle(brand: ThemeInput | undefined, mode: 'light' | 'dark'): CSSProperties {
  const colors = brand?.[mode];
  const radius = brand?.shape?.radius;
  const properties: Record<string, string | undefined> = {
    '--app-primary': colors?.primary,
    '--app-primary-contrast': colors?.primaryContrast,
    '--app-background': colors?.background,
    '--app-surface': colors?.surface,
    '--app-text': colors?.text,
    '--app-text-muted': colors?.textMuted,
    '--app-border': colors?.border,
    '--app-font': brand?.typography?.fontFamily,
    '--app-heading-font': brand?.typography?.headingFontFamily,
    '--app-radius': radius === undefined ? undefined : `${radius}px`,
    colorScheme: mode,
  };
  return Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined));
}

const icon = (shape: ReactNode) => (
  <svg
    viewBox="0 0 20 20"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {shape}
  </svg>
);

const PAGE_ICONS: Record<PageId, ReactNode> = {
  home: icon(<path d="M3.5 9 10 3.75 16.5 9v7.25h-4.5v-4.5H8v4.5H3.5z" />),
  orders: icon(
    <>
      <path d="M5 2.75h10v14.5l-2.5-1.5-2.5 1.5-2.5-1.5-2.5 1.5z" />
      <path d="M7.75 7h4.5M7.75 10.25h4.5" />
    </>,
  ),
  analytics: icon(<path d="M4.5 16.25v-5M10 16.25V3.75M15.5 16.25V8" strokeWidth="2.25" />),
  settings: icon(
    <>
      <path d="M3 6h14M3 14h14" />
      <circle cx="7.5" cy="6" r="2" fill="currentColor" />
      <circle cx="12.5" cy="14" r="2" fill="currentColor" />
    </>,
  ),
};

export function AppBar({
  brand,
  userName,
  role,
}: {
  brand: ThemeInput | undefined;
  userName: string;
  role: string;
}) {
  return (
    <header className="app-bar">
      <a className="app-brand" href="#home">
        {brand?.brand?.logoUrl && (
          // The brand's name follows as text, so the logo adds nothing for a screen reader.
          <img src={brand.brand.logoUrl} alt="" width="28" height="28" />
        )}
        <span>{brand?.brand?.name}</span>
      </a>
      <p className="app-user">
        <span className="app-avatar" aria-hidden="true">
          {userName[0]}
        </span>
        <span>{userName}</span>
        <span className="app-role">{role}</span>
      </p>
    </header>
  );
}

export function AppNav({ page }: { page: PageId }) {
  return (
    <nav className="app-nav" aria-label="Main">
      <ul>
        {PAGES.map(({ id, label }) => (
          <li key={id}>
            <a href={`#${id}`} aria-current={id === page ? 'page' : undefined}>
              {PAGE_ICONS[id]}
              <span>{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** One of the host product's own pages. The demo has nothing to show on them, so it says so. */
export function HostPage({ label }: { label: string }) {
  return (
    <div className="app-card">
      <p>
        {label} is one of the host product&apos;s own pages. DashKit is embedded under Analytics.
      </p>
      <a className="app-button" href="#analytics">
        Open Analytics
      </a>
    </div>
  );
}
