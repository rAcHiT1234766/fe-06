import { useId, type ReactNode } from 'react';
import { toCssVars } from '../core/theme/create-theme';
import { useDashKit } from './context';
import { styles } from './styles';

// The variables live in a zero-specificity rule instead of an inline style, so a host can still
// override any of them with ordinary CSS.
export function ThemeRoot({ children }: { children: ReactNode }) {
  const { theme } = useDashKit();
  const themeId = useId();
  const declarations = Object.entries(toCssVars(theme))
    .map(([name, value]) => `${name}: ${value};`)
    .join(' ');
  return (
    <div className="dk-root" data-dk-theme={themeId}>
      <style>{`${styles}\n:where(.dk-root[data-dk-theme="${themeId}"]) { ${declarations} }`}</style>
      {children}
    </div>
  );
}
