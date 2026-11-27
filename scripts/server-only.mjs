// Loaded with `--import` by `npm test` and `npm run db:import-redis`. src/server modules start with `import "server-only"`, which
// throws outside React Server Components; Next.js resolves it to an empty module on the server.
// This does the same for the test runner. (Running under `--conditions=react-server` would also
// do it, but swaps React for its server build, which next-auth can't load.)
import { registerHooks } from "node:module";

const EMPTY = new URL("../node_modules/server-only/empty.js", import.meta.url).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: EMPTY, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
