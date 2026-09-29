# T01 — Project scaffold & tooling

**Tier:** B · **Size:** M · **Depends on:** none
**USER ACTION REQUIRED:** SETUP.md §S1 (Node 22, Git, Java 17 installed). Confirm before starting.

## Goal
An empty but fully wired TypeScript project: a Vite + React SPA in `src/`, a pure library folder `shared/`, a Node
scripts folder `jobs/`, lint/format/typecheck/test scripts, and a "Hello Fight Club" page that builds.

## Context to load (only these)
- `AGENTS.md`
- `docs/ARCHITECTURE.md` → sections "Repo layout" and "Environments"

## Files you may touch
`package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `vitest.config.ts` (or inside vite config),
`eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore`, `.editorconfig`, `.nvmrc`, `.env.example`,
`index.html`, `src/**`, `shared/index.ts`, `shared/smoke.test.ts`, `jobs/hello.ts`, `README.md` (commands section only)

## Steps
1. `npm create vite@latest` equivalent in place (React + TS). Use latest stable versions and record the
   major versions in your completion notes. Add `.nvmrc` with `22`.
2. TS `strict: true`, `noUncheckedIndexedAccess: true`. Path alias `@shared/*` → `shared/*` in tsconfig **and** Vite.
   The `jobs/` tsconfig targets Node 22 (ESM) and runs with `tsx`.
3. Tailwind (latest, official Vite plugin). Put a placeholder dark background in `src/index.css`. The full theme comes in T11.
4. Vitest with `jsdom` for `src/**` and `node` for `shared/**` and `jobs/**` (use a workspace or environmentMatchGlobs).
   Add `shared/smoke.test.ts` (1+1) and one React Testing Library test for `<App/>`.
5. ESLint flat config (typescript-eslint, react-hooks) and Prettier (single quotes, width 100).
6. npm scripts: `dev`, `build`, `preview`, `lint`, `format`, `typecheck` (tsc -b or `tsc --noEmit` for all
   three projects), `test`, `test:watch`, `test:rules` (placeholder: `echo "rules tests arrive in T06"`),
   `emulators` (placeholder), `job` (`tsx --env-file-if-exists=.env.local`), `jobs:hello` (`npm run job -- jobs/hello.ts`).
7. `.gitignore`: node_modules, dist, coverage, `.env*` except `.env.example`, `*service-account*.json`,
   `firebase-debug*.log`, `.firebase/`, `ui-debug.log`, `firestore-debug.log`, `playwright-report/`, `test-results/`.
8. `.env.example` with placeholder keys: `FIREBASE_PROJECT_ID=`, `GOOGLE_APPLICATION_CREDENTIALS=`, `ODDS_API_KEY=`.
9. README: add a "Commands" section (one line per script).

## Acceptance criteria
- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all pass
- [ ] `npm run jobs:hello` prints "hello from jobs" and a value imported from `@shared`
- [ ] `git status` shows no secrets or build output

## Out of scope
Firebase, routing, UI design, PWA.

## Completion notes
_(agent fills in)_
