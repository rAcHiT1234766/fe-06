import { registerMap, type MapGeoJson } from '@dashkit/sdk/map';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './demo.css';

// The borders are a static file beside the app rather than part of its code, so only pages that
// show a map pay for them; until they arrive, a map widget shows its figures as a table.
fetch(`${import.meta.env.BASE_URL}maps/world.json`)
  .then((response) => response.json() as Promise<MapGeoJson>)
  .then(
    (map) => registerMap('world', map),
    (error: unknown) => console.error('The world map could not be loaded.', error),
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
