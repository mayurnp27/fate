# Architecture

A Node HTTP server serves the static `site/` folder and `/api/*` on one origin. Browser CSV uploads are normalized by Papa Parse, features are extracted with a deterministic mock provider, and Zod validates records before simulation. The server calls the pure TypeScript engine and returns a complete result.

The financial engine has no database, network, framework, or application-authentication imports. The `persistence.ts` engine module only normalizes legacy result shapes; it does not connect to a hosted service. Optional API snapshot storage uses the Node SQLite standard module, in a local ignored data directory. The original multi-tenant database migration is not part of this standalone storage model.

The static slider demo runs separately in `site/fate.js`. The original motion code is in `site/os.js`; both are dependency-free browser scripts. `site/workbench.js` connects the record-level engine to the browser through HTTP, handles CSV uploads, displays readiness, and exports JSON without injecting imported text as HTML.

To change assumptions, edit `src/engine/offers.ts` and `evidence.ts`, then run the regression tests. To replace transcript extraction, implement `TranscriptFeatureProvider` and update its factory. No provider credentials ship in this repository.
