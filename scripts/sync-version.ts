// Writes the version from package.json into src/version.ts, so the X-Quak-Client header never drifts from the
// published version. Runs as part of `bun run build` and `bun release`; test/version.test.ts checks both match.

const root = new URL("..", import.meta.url);
const { version } = (await Bun.file(new URL("package.json", root)).json()) as { version: string };
const target = new URL("src/version.ts", root);
const content = `// Written by scripts/sync-version.ts from package.json. Do not edit.\nexport const VERSION = "${version}";\n`;

if ((await Bun.file(target).exists()) && (await Bun.file(target).text()) === content) {
  process.exit(0);
}
await Bun.write(target, content);
console.log(`src/version.ts → ${version}`);
