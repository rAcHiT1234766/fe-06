import { demoBrands } from '@dashkit/mock-engine/brands';
import { demoUsers } from '@dashkit/mock-engine/users';
import {
  DashboardBuilder,
  DashboardPicker,
  DashKitProvider,
  type DashKitTheme,
} from '@dashkit/sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PAGES, useCurrentPage, useShownMode } from './host-state';
import { AppBar, AppNav, brandStyle, HostPage } from './Shell';

const API_URL = import.meta.env.VITE_DASHKIT_API_URL;

type Mode = DashKitTheme['mode'];

// Stands in for the host's own backend, which would mint an embed token for its signed-in user.
async function fetchDemoToken(userId: string): Promise<string> {
  const response = await fetch(`${API_URL}/auth/demo-token`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
  if (!response.ok) throw new Error(`The demo API refused to sign in ${userId}`);
  return ((await response.json()) as { token: string }).token;
}

// Changing one character in the payload invalidates the signature, as any edit by an attacker would.
function tamperWith(token: string) {
  const middle = Math.floor(token.length / 2);
  return token.slice(0, middle) + (token[middle] === 'A' ? 'B' : 'A') + token.slice(middle + 1);
}

const capitalise = (word: string) => `${word[0]!.toUpperCase()}${word.slice(1)}`;

function describeUser(userId: string) {
  const { tenantId, role, scopes } = demoUsers[userId]!;
  const regions = scopes.regions === '*' ? 'all regions' : scopes.regions.join(' + ');
  const measures = Array.isArray(scopes.measures)
    ? ` · ${scopes.measures.length} measures only`
    : '';
  return `${capitalise(userId)} · ${demoBrands[tenantId]?.brand?.name} · ${role} · ${regions}${measures}`;
}

export function App() {
  const [userId, setUserId] = useState('asha');
  const [dashboardId, setDashboardId] = useState('overview');
  const [token, setToken] = useState<string>();
  const [signInError, setSignInError] = useState<string>();
  const [isTampered, setIsTampered] = useState(false);
  const [brandId, setBrandId] = useState('acme');
  const [mode, setMode] = useState<Mode>(demoBrands.acme!.mode ?? 'auto');
  const page = useCurrentPage();
  const shownMode = useShownMode(mode);

  useEffect(() => {
    let isCurrent = true;
    fetchDemoToken(userId).then(
      (newToken) => {
        if (!isCurrent) return;
        setToken(newToken);
        setIsTampered(false);
        setSignInError(undefined);
      },
      () => {
        if (!isCurrent) return;
        setSignInError(
          `Could not reach the demo API at ${API_URL}. Locally, run pnpm dev; a deployed API may take a minute to wake up, then reload.`,
        );
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [userId]);

  // After moving to another page, a screen reader starts from its heading, as after a page load.
  const heading = useRef<HTMLHeadingElement>(null);
  const shownPage = useRef(page);
  useEffect(() => {
    if (shownPage.current === page) return;
    shownPage.current = page;
    heading.current?.focus();
  }, [page]);

  const renewToken = useCallback(() => fetchDemoToken(userId), [userId]);
  const theme = useMemo(() => ({ ...demoBrands[brandId], mode }), [brandId, mode]);
  const brand = demoBrands[brandId];
  const pageLabel = PAGES.find(({ id }) => id === page)!.label;

  function changeBrand(nextBrandId: string) {
    setBrandId(nextBrandId);
    setMode(demoBrands[nextBrandId]?.mode ?? 'auto');
  }

  return (
    <div className="app" style={brandStyle(brand, shownMode)}>
      {/* The presenter's controls. They sit outside the host product and keep their own look. */}
      <section className="demo-panel" aria-label="Demo controls">
        <p className="demo-heading">
          <span className="demo-badge">Demo</span>
          <span className="demo-hint">Not part of the host product</span>
        </p>
        <label>
          Signed in as
          <select
            value={userId}
            onChange={(event) => {
              setUserId(event.target.value);
              // Every tenant has the overview; a dashboard another user created may not exist.
              setDashboardId('overview');
            }}
          >
            {Object.keys(demoUsers).map((id) => (
              <option key={id} value={id}>
                {describeUser(id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Brand
          <select value={brandId} onChange={(event) => changeBrand(event.target.value)}>
            {Object.entries(demoBrands).map(([id, { brand: identity }]) => (
              <option key={id} value={id}>
                {identity?.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Follow system</option>
          </select>
        </label>
        <button
          type="button"
          disabled={!token || isTampered}
          onClick={() => {
            setToken(tamperWith(token!));
            setIsTampered(true);
          }}
        >
          Tamper with token
        </button>
      </section>
      <AppBar
        brand={brand}
        userName={capitalise(userId)}
        role={capitalise(demoUsers[userId]!.role)}
      />
      <AppNav page={page} />
      <main className="app-main">
        <h1 ref={heading} className="app-title" tabIndex={-1}>
          {pageLabel}
        </h1>
        {page !== 'analytics' ? (
          <HostPage label={pageLabel} />
        ) : (
          <>
            {signInError && <p role="alert">{signInError}</p>}
            {token && (
              // A tampered token gets no getToken, so the dashboard shows the invalid session
              // instead of quietly fetching a fresh token.
              <DashKitProvider
                apiUrl={API_URL}
                token={token}
                {...(isTampered ? {} : { getToken: renewToken })}
                theme={theme}
                allowExport
              >
                <DashboardPicker value={dashboardId} onChange={setDashboardId} />
                <DashboardBuilder dashboardId={dashboardId} />
              </DashKitProvider>
            )}
          </>
        )}
      </main>
    </div>
  );
}
