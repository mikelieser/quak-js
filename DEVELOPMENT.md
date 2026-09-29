# Development

Notes for working on `@quak/js` itself. Using the library: see the [README](README.md).

## Commands

```sh
bun install
bun generate          # fetch the production OpenAPI schema, regenerate the types and the README tables
bun run lint          # tsc --noEmit
bun test
bun run build         # dist/
```

`bun generate [url|file]` takes the schema from a URL (`QUAK_OPENAPI_URL` works too) or a local file and writes the
snapshot `openapi.json` and `src/generated/schema.ts`, then runs `bun docs`, which rewrites the parameter tables in
`README.md` between the `<!-- params:<kind> -->` markers. All of it is committed, builds never need the API. CI fails
when the tables are out of date.

## Release

```sh
bun release patch     # or minor, major, x.y.z
git push origin main v0.9.1
```

`bun release` needs a clean tree and a filled `## Unreleased` section in `CHANGELOG.md`. It bumps `package.json` and
`src/version.ts`, dates the changelog section, runs lint, tests and build, commits `release: v0.9.1` and tags `v0.9.1`.
The tag starts the release workflow, which checks the tag against `package.json` and publishes to npm with Trusted
Publishing (with provenance), then creates the GitHub release.
