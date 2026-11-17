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

export const RemoveIcon = () => icon(<path d="M4 4l8 8M12 4l-8 8" />);

export const DuplicateIcon = () =>
  icon(
    <>
      <rect x="5.5" y="5.5" width="7.5" height="7.5" rx="1" />
      <path d="M3 10V4a1 1 0 0 1 1-1h6" />
    </>,
  );
