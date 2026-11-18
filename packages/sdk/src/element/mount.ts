import type { ActiveFilter, DashKitOptions } from '../core/types';
import { TAG_NAME, type DashKitElement } from './dashkit-element';

/** What `DashKit.mount()` returns: the mounted dashboard and the means to change or remove it. */
export interface DashKitHandle {
  /** The `<dashkit-dashboard>` element that was added to the container. */
  readonly element: DashKitElement;
  /** Changes some options and keeps the rest. */
  update(options: Partial<DashKitOptions>): void;
  /** Replaces the active cross-filters, as a click on a chart would. */
  setFilters(filters: ActiveFilter[]): void;
  clearFilters(): void;
  /** Forgets every cached result and loads the dashboard and its data again. */
  refresh(): void;
  /** Removes the dashboard and releases its charts, observers and listeners. */
  unmount(): void;
}

const ATTRIBUTES = {
  apiUrl: 'api-url',
  dashboardId: 'dashboard-id',
  token: 'token',
  mode: 'mode',
} as const;

function apply(element: DashKitElement, options: DashKitOptions) {
  for (const [option, attribute] of Object.entries(ATTRIBUTES)) {
    const value = options[option as keyof typeof ATTRIBUTES];
    // Setting an attribute to the value it already has would still render the dashboard again.
    if (value === undefined) element.removeAttribute(attribute);
    else if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
  }
  if (element.theme !== options.theme) element.theme = options.theme;
  if (element.config !== options.config) element.config = options.config;
  if (element.getToken !== options.getToken) element.getToken = options.getToken;
}

/**
 * Shows a dashboard inside `container`, for pages that prefer a function call to markup. It adds a
 * `<dashkit-dashboard>` element, so the dashboard is isolated from the page in the same way.
 */
export function mount(container: Element, options: DashKitOptions): DashKitHandle {
  let current = options;
  const element = container.ownerDocument.createElement(TAG_NAME) as DashKitElement;

  // The listeners read the latest options, so update() can also change the callbacks.
  element.addEventListener('dashkit:filterchange', (event) =>
    current.onFilterChange?.(event.detail),
  );
  element.addEventListener('dashkit:save', (event) => current.onSave?.(event.detail));
  element.addEventListener('dashkit:error', (event) => current.onError?.(event.detail));

  apply(element, current);
  container.append(element);

  return {
    element,
    update(changes) {
      current = { ...current, ...changes };
      apply(element, current);
    },
    setFilters: (filters) => element.setFilters(filters),
    clearFilters: () => element.clearFilters(),
    refresh: () => element.refresh(),
    unmount: () => element.remove(),
  };
}
