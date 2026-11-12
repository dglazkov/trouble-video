// The product's page tests, on crux's part chrome, each suite a directory here. Written by nerd new from crux's scaffold
// (crux.toml's server); it is the product's now. Run from the product's root, after `sh crux/chrome/ready.sh`:
//
//   npx --yes tsx@4.20.6 tests/run.mjs page
import { run } from "../crux/chrome/harness.ts";

await run({ root: new URL("..", import.meta.url), tests: new URL(".", import.meta.url) });
