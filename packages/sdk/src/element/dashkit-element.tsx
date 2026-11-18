import { createRoot, type Root } from 'react-dom/client';
import type {
  ActiveFilter,
  DashboardConfig,
  DashKitError,
  DashKitOptions,
  ThemeInput,
} from '../core/types';
import { DashboardBuilder } from '../react/DashboardBuilder';
import { DashKitProvider } from '../react/DashKitProvider';
import { DashboardReadyContext } from '../react/ready-context';
import hostStyles from './host.css?inline';

type ColorScheme = NonNullable<ThemeInput['mode']>;

const readColorScheme = (value: string | null): ColorScheme | undefined =>
  value === 'light' || value === 'dark' || value === 'auto' ? value : undefined;

/**
 * The element's tag name. It is typed as a plain string so that this code never depends on the
 * tag-name map, which only the types of the element entry extend.
 */
export const TAG_NAME: string = 'dashkit-dashboard';

// Properties a page may set before this script has loaded and defined the element.
const UPGRADED_PROPERTIES = ['theme', 'config', 'getToken'] as const;

/** The attributes `<dashkit-dashboard>` reads. Objects and functions are set as properties. */
export interface DashKitElementAttributes {
  /** Base URL of the data API. */
  'api-url'?: string | undefined;
  /** The saved dashboard to show, unless the `config` property supplies one. */
  'dashboard-id'?: string | undefined;
  /** An embed token minted by your backend, for pages that do not set `getToken`. */
  token?: string | undefined;
  /** `edit` opens the builder when the token's role is `editor`. */
  mode?: 'view' | 'edit' | undefined;
  /** Overrides the `mode` of the `theme` property. */
  'color-scheme'?: 'light' | 'dark' | 'auto' | undefined;
}

/**
 * The events `<dashkit-dashboard>` dispatches. All of them bubble and cross its shadow root, so a
 * listener on the element or on `document` hears them.
 */
export interface DashKitElementEventMap extends HTMLElementEventMap {
  /** The dashboard first shows its content or its error. Again after `refresh()`. */
  'dashkit:ready': CustomEvent<undefined>;
  /** The active cross-filters changed, by a click or through `setFilters`. */
  'dashkit:filterchange': CustomEvent<ActiveFilter[]>;
  /** An editor saved the dashboard; the detail is the config as stored. */
  'dashkit:save': CustomEvent<DashboardConfig>;
  /** A request failed for good, or the dashboard could not be read. */
  'dashkit:error': CustomEvent<DashKitError>;
}

type Listener<K extends keyof DashKitElementEventMap> = (
  this: DashKitElement,
  event: DashKitElementEventMap[K],
) => unknown;

/**
 * `<dashkit-dashboard>`: a dashboard in one tag, for pages without React. Strings go in
 * attributes (`api-url`, `dashboard-id`, `token`, `mode`, `color-scheme`); objects and functions
 * go in properties (`theme`, `config`, `getToken`). It reports through the `dashkit:ready`,
 * `dashkit:filterchange`, `dashkit:save` and `dashkit:error` events, which bubble out of its
 * shadow root.
 */
export class DashKitElement extends HTMLElement {
  static observedAttributes = ['api-url', 'dashboard-id', 'token', 'mode', 'color-scheme'];

  #root: Root | undefined;
  #theme: ThemeInput | undefined;
  #config: DashboardConfig | undefined;
  #getToken: DashKitOptions['getToken'];
  #themeWithScheme:
    { theme: ThemeInput | undefined; scheme: ColorScheme; merged: ThemeInput } | undefined;
  // The filters the host passed in, and the filters as they are now, which a refresh keeps.
  #hostFilters: ActiveFilter[] | undefined;
  #currentFilters: ActiveFilter[] = [];
  // Counts the dashboards this element has rendered; each one announces once that it is ready.
  #generation = 0;
  #announcedGeneration = -1;

  /** The theme, as `DashKitProvider` takes it. The `color-scheme` attribute overrides its `mode`. */
  get theme(): ThemeInput | undefined {
    return this.#theme;
  }

  set theme(theme: ThemeInput | undefined) {
    this.#theme = theme;
    this.#render();
  }

  get config(): DashboardConfig | undefined {
    return this.#config;
  }

  /** A dashboard to show directly, in place of `dashboard-id`. */
  set config(config: DashboardConfig | undefined) {
    this.#config = config;
    this.#render();
  }

  get getToken(): DashKitOptions['getToken'] {
    return this.#getToken;
  }

  /** Called on start and once after a 401 response to get a fresh token. */
  set getToken(getToken: DashKitOptions['getToken']) {
    this.#getToken = getToken;
    this.#render();
  }

  /**
   * Listens for an event. For the `dashkit:*` events, `event.detail` has each event's own type; see
   * {@link DashKitElementEventMap}.
   */
  override addEventListener<K extends keyof DashKitElementEventMap>(
    type: K,
    listener: Listener<K>,
    options?: boolean | AddEventListenerOptions,
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  override addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) {
    super.addEventListener(type, listener, options);
  }

  /** Removes a listener added with `addEventListener`. */
  override removeEventListener<K extends keyof DashKitElementEventMap>(
    type: K,
    listener: Listener<K>,
    options?: boolean | EventListenerOptions,
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
  override removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ) {
    super.removeEventListener(type, listener, options);
  }

  /** Replaces the active cross-filters, as a click on a chart would. */
  setFilters(filters: ActiveFilter[]) {
    // A copy, so a host that changes its array and passes it again is still heard.
    this.#hostFilters = [...filters];
    this.#currentFilters = this.#hostFilters;
    this.#render();
  }

  /** Removes every active cross-filter. */
  clearFilters() {
    this.setFilters([]);
  }

  /** Forgets every cached result and loads the dashboard and its data again, keeping the filters. */
  refresh() {
    this.#startAgain();
    this.#render();
  }

  // The next render builds a new dashboard, with a new cache, that announces again that it is ready.
  #startAgain() {
    this.#generation++;
    this.#hostFilters = this.#currentFilters;
  }

  connectedCallback() {
    for (const name of UPGRADED_PROPERTIES) this.#upgradeProperty(name);
    if (!this.#root) {
      const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = hostStyles;
      const mountPoint = document.createElement('div');
      shadow.replaceChildren(style, mountPoint);
      this.#root = createRoot(mountPoint);
    }
    this.#render();
  }

  disconnectedCallback() {
    // Moving the element disconnects and reconnects it in one go; only a removal tears it down,
    // releasing its charts, observers and listeners.
    queueMicrotask(() => {
      if (this.isConnected || !this.#root) return;
      this.#root.unmount();
      this.#root = undefined;
      this.#startAgain();
    });
  }

  attributeChangedCallback() {
    this.#render();
  }

  // A property set on the element before it was defined is an own property that hides the
  // accessor, so it is taken off and set again through the accessor.
  #upgradeProperty(name: (typeof UPGRADED_PROPERTIES)[number]) {
    if (!Object.hasOwn(this, name)) return;
    const value: unknown = Reflect.get(this, name);
    Reflect.deleteProperty(this, name);
    Reflect.set(this, name, value);
  }

  #emit(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  // Created once, so the dashboard's effects do not restart on every render.
  readonly #onFilterChange = (filters: ActiveFilter[]) => {
    this.#currentFilters = filters;
    this.#emit('dashkit:filterchange', filters);
  };

  readonly #onSave = (config: DashboardConfig) => this.#emit('dashkit:save', config);

  readonly #onError = ({ code, message }: DashKitError) =>
    this.#emit('dashkit:error', { code, message });

  readonly #onReady = () => {
    if (this.#announcedGeneration === this.#generation) return;
    this.#announcedGeneration = this.#generation;
    this.#emit('dashkit:ready');
  };

  // The merged theme keeps its identity while its parts do, so charts are not re-themed on every
  // attribute change.
  #currentTheme(): ThemeInput | undefined {
    const scheme = readColorScheme(this.getAttribute('color-scheme'));
    if (!scheme) return this.#theme;
    const cached = this.#themeWithScheme;
    if (cached && cached.theme === this.#theme && cached.scheme === scheme) return cached.merged;
    const merged = { ...this.#theme, mode: scheme };
    this.#themeWithScheme = { theme: this.#theme, scheme, merged };
    return merged;
  }

  #render() {
    const root = this.#root;
    if (!root) return;
    const apiUrl = this.getAttribute('api-url');
    const dashboardId = this.getAttribute('dashboard-id');
    const source = this.#config ? { config: this.#config } : dashboardId ? { dashboardId } : null;
    const token = this.getAttribute('token');
    // Nothing is shown until the page says where the data and the dashboard are and how to get a
    // token. Pages often set getToken in a script after this one, which must not lose the race.
    if (!apiUrl || !source || (!token && !this.#getToken)) {
      root.render(null);
      return;
    }
    const theme = this.#currentTheme();
    root.render(
      <DashKitProvider
        key={this.#generation}
        apiUrl={apiUrl}
        {...(token ? { token } : {})}
        {...(this.#getToken ? { getToken: this.#getToken } : {})}
        {...(theme ? { theme } : {})}
        {...(this.#hostFilters ? { filters: this.#hostFilters } : {})}
        onFilterChange={this.#onFilterChange}
        onError={this.#onError}
      >
        <DashboardReadyContext.Provider value={this.#onReady}>
          <DashboardBuilder
            {...source}
            mode={this.getAttribute('mode') === 'edit' ? 'edit' : 'view'}
            onSave={this.#onSave}
          />
        </DashboardReadyContext.Provider>
      </DashKitProvider>,
    );
  }
}
