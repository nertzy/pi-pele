# Contributing

Thanks for helping improve pi-pele.

## Development

You need Node.js 24 or later and npm 11.15 or later; `package.json` enforces both through `engines` and `devEngines`. Linting also needs [actionlint](https://github.com/rhysd/actionlint) 1.7.12 on your `PATH` (on macOS, `brew install actionlint`).

```sh
npm ci
npm run check
```

`npm run check` runs linting, the tests, TypeScript checking, and a dry-run pack that verifies the package's file list. Run `npm run lint:fix` to apply the Biome and Markdown autofixes.

To try your checkout in Pi, run `pi -e ./extension.ts` from the repository.

Add or update tests for behavior changes. Pull requests should explain the problem, the chosen behavior, and any user-visible documentation changes.

## Reporting bugs and proposing changes

Use [GitHub issues](https://github.com/nertzy/pi-pele/issues) for reproducible bugs and focused proposals. For a diagram that renders wrongly, include its Mermaid source and say whether Pele's own output shows the problem too. For vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
