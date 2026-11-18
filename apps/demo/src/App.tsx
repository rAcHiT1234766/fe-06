import { demoBrands } from '@dashkit/mock-engine/brands';
import { demoUsers } from '@dashkit/mock-engine/users';
import { DashboardBuilder, DashKitProvider, type DashKitTheme } from '@dashkit/sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

function describeUser(userId: string) {
  const { tenantId, role, scopes } = demoUsers[userId]!;
  const regions = scopes.regions === '*' ? 'all regions' : scopes.regions.join(' + ');
  return `${userId[0]!.toUpperCase()}${userId.slice(1)} · ${demoBrands[tenantId]?.brand?.name} · ${role} · ${regions}`;
}

export function App() {
  const [userId, setUserId] = useState('asha');
  const [token, setToken] = useState<string>();
  const [signInError, setSignInError] = useState<string>();
  const [isTampered, setIsTampered] = useState(false);
  const [brandId, setBrandId] = useState('acme');
  const [mode, setMode] = useState<Mode>(demoBrands.acme!.mode ?? 'auto');

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

  const renewToken = useCallback(() => fetchDemoToken(userId), [userId]);
  const theme = useMemo(() => ({ ...demoBrands[brandId], mode }), [brandId, mode]);

  function changeBrand(nextBrandId: string) {
    setBrandId(nextBrandId);
    setMode(demoBrands[nextBrandId]?.mode ?? 'auto');
  }

  return (
    <>
      <header className="demo-header">
        <h1 className="demo-product">Host product</h1>
        <label>
          Signed in as
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
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
            {Object.entries(demoBrands).map(([id, brand]) => (
              <option key={id} value={id}>
                {brand.brand?.name}
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
      </header>
      <main className="demo-main">
        {signInError && <p role="alert">{signInError}</p>}
        {token && (
          // A tampered token gets no getToken, so the dashboard shows the invalid session instead
          // of quietly fetching a fresh token.
          <DashKitProvider
            apiUrl={API_URL}
            token={token}
            {...(isTampered ? {} : { getToken: renewToken })}
            theme={theme}
          >
            <DashboardBuilder dashboardId="overview" />
          </DashKitProvider>
        )}
      </main>
    </>
  );
}
