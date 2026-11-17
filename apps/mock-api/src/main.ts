import { createApi, createRandomSecret } from '@dashkit/mock-engine';
import { createMockApiServer } from './server.ts';

const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (
  process.env.DASHKIT_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:6006'
)
  .split(',')
  .map((origin) => origin.trim());

let tokenSecret = process.env.DASHKIT_TOKEN_SECRET;
if (!tokenSecret) {
  // Safer than a fallback secret written in the code; the SDK fetches a new token after a restart.
  console.warn(
    'DASHKIT_TOKEN_SECRET is not set: using a random secret, so tokens end with this process.',
  );
  tokenSecret = createRandomSecret();
}

createMockApiServer(createApi(tokenSecret), allowedOrigins).listen(port, () => {
  console.log(
    `Demo API on http://localhost:${port} (browser origins: ${allowedOrigins.join(', ')})`,
  );
});
