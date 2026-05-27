# Contributing

Thanks for working on VANTA. This guide keeps the codebase consistent and easy to
maintain.

## Development setup

```bash
npm install
npm run dev      # app with HMR
```

Optional: install `nmap` and put it on your `PATH` to develop/test the deep-scan path.
The app must remain fully functional without it (progressive enhancement).

## Workflow

1. Branch from `main`: `feat/<short-name>`, `fix/<short-name>`, or `docs/<short-name>`.
2. Make focused changes. Keep the design's visual fidelity intact.
3. Run `npm run lint`, `npm run build`, and `npm test` before opening a PR.
4. Open a pull request describing **what** changed and **why**.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add mDNS-based device classification
fix: correct subnet derivation on multi-interface hosts
docs: expand threat-rule table in the spec
refactor: split portscan into connect-scan and nmap adapters
test: add fixtures for the threat rule engine
chore: bump electron-builder
```

## Code style

- **TypeScript** everywhere; prefer precise types over `any`.
- **React:** functional components and hooks only.
- **Process boundaries:** never import Node or network APIs into `src/renderer`.
  Anything crossing processes goes through a `src/shared` type and the preload bridge.
- **Single-purpose modules:** if a file in `src/main` grows to do several things,
  split it. Each agent module should be understandable on its own.
- **No fake data:** when a designed field can't be obtained for real, substitute an
  honest real value behind the same UI element (see the spec's honest substitutions).

## Testing

The parsers, device classifier, topology layout, threat rules, and scoring are pure
functions — cover them with fixture-driven unit tests. Use a mock host set for
pipeline integration tests; do not require a live network in CI.

## Security

Read [SECURITY.md](./SECURITY.md). Never add code that scans beyond the local subnet,
phones home, or weakens renderer sandboxing.

---

Maintained by **JD Digital Systems**.
