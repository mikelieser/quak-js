// Cuts a release: bumps the version, dates the "Unreleased" section of CHANGELOG.md, checks, commits and tags.
// Pushing the tag starts .github/workflows/release.yml, which publishes to npm.
//
//   bun release patch          # 0.9.0 → 0.9.1
//   bun release minor          # 0.9.1 → 0.10.0
//   bun release major          # 0.10.0 → 1.0.0
//   bun release 1.0.0          # an exact version
//
// then: git push origin main v<version>

import { $ } from "bun";

const bump = process.argv[2];
if (!bump) {
  console.error("usage: bun release <patch|minor|major|x.y.z>");
  process.exit(1);
}

const root = new URL("..", import.meta.url).pathname;
$.cwd(root);

if ((await $`git status --porcelain`.text()).trim()) {
  console.error("the working tree is not clean, commit or stash first");
  process.exit(1);
}

const pkgFile = Bun.file(`${root}package.json`);
const pkgText = await pkgFile.text();
const current = (JSON.parse(pkgText) as { version: string }).version;
const next = nextVersion(current, bump);

const changelogFile = Bun.file(`${root}CHANGELOG.md`);
const changelog = await changelogFile.text();
const unreleased = changelog.match(/^## Unreleased\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
if (!unreleased || !unreleased[1]!.trim()) {
  console.error('CHANGELOG.md needs a "## Unreleased" section with the changes of this release');
  process.exit(1);
}
const date = new Date().toISOString().slice(0, 10);

await Bun.write(pkgFile, pkgText.replace(`"version": "${current}"`, `"version": "${next}"`));
await Bun.write(changelogFile, changelog.replace("## Unreleased\n", `## Unreleased\n\n## ${next} - ${date}\n`));
await $`bun scripts/sync-version.ts`;
await $`bun run lint`;
await $`bun test`;
await $`bun run build`;

await $`git add package.json CHANGELOG.md src/version.ts`;
await $`git commit -m ${`release: v${next}`}`;
await $`git tag -a ${`v${next}`} -m ${`v${next}`}`;

console.log(`\nv${next} committed and tagged. Publish with:\n\n  git push origin main v${next}\n`);

function nextVersion(version: string, bump: string): string {
  if (/^\d+\.\d+\.\d+$/.test(bump)) {
    return bump;
  }
  const [major, minor, patch] = version.split(".").map(Number) as [number, number, number];
  switch (bump) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    default:
      console.error(`unknown bump "${bump}", use patch, minor, major or x.y.z`);
      process.exit(1);
  }
}
