// `?inline` imports are a Vite feature. Referencing its types here lets any project that checks this
// source understand them, including ones that do not list Vite themselves.
/// <reference types="vite/client" />
import base from './styles/base.css?inline';
import dashboard from './styles/dashboard.css?inline';
import widget from './styles/widget.css?inline';

// Styles travel as a string so the same text can be placed next to the dashboard on a host page
// and inside the Web Component's shadow root.
export const styles = [base, dashboard, widget].join('\n');
