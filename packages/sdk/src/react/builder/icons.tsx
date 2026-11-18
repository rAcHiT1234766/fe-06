import type { ReactNode } from 'react';

// Icons inherit the text colour, so they follow the theme. Buttons carry the accessible names.
const icon = (shape: ReactNode) => (
  <svg
    viewBox="0 0 16 16"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    {shape}
  </svg>
);

export const CrossIcon = () => icon(<path d="M4 4l8 8M12 4l-8 8" />);

export const UndoIcon = () =>
  icon(
    <>
      <path d="M5.5 3.5 2.5 6.5l3 3" />
      <path d="M2.5 6.5H10a3.5 3.5 0 0 1 0 7H7" />
    </>,
  );

export const RedoIcon = () =>
  icon(
    <>
      <path d="M10.5 3.5l3 3-3 3" />
      <path d="M13.5 6.5H6a3.5 3.5 0 0 0 0 7h3" />
    </>,
  );

export const CheckIcon = () => icon(<path d="M3 8.5l3.25 3.25L13 5" />);

export const ChangedIcon = () => icon(<circle cx="8" cy="8" r="3.5" fill="currentColor" />);

export const DuplicateIcon = () =>
  icon(
    <>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1" />
      <path d="M3 10V4a1 1 0 0 1 1-1h6" />
    </>,
  );

export const SettingsIcon = () =>
  icon(
    <>
      <path d="M2.5 4.5h11M2.5 11.5h11" />
      <circle cx="6" cy="4.5" r="1.75" fill="currentColor" />
      <circle cx="10" cy="11.5" r="1.75" fill="currentColor" />
    </>,
  );

export const DownloadIcon = () =>
  icon(
    <>
      <path d="M8 2.5v7.5M4.75 6.75 8 10l3.25-3.25" />
      <path d="M3 13.5h10" />
    </>,
  );
