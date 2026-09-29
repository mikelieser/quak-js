import { describe, expect, test } from "bun:test";
import pkg from "../package.json" with { type: "json" };
import { clientHeader, VERSION } from "../src/index.js";
import { systemComment } from "../src/client-header.js";

describe("version", () => {
  test("src/version.ts matches package.json (bun scripts/sync-version.ts)", () => {
    expect(VERSION).toBe(pkg.version);
  });
});

describe("client header", () => {
  test("Node and Bun: name, version and system", () => {
    const node = { process: { platform: "darwin", arch: "arm64", versions: { node: "24.0.0" } } };
    expect(clientHeader(node)).toBe(`js/${VERSION} (macos; arm64)`);
    const linux = { process: { platform: "linux", arch: "x64", versions: { node: "22.0.0" } } };
    expect(clientHeader(linux)).toBe(`js/${VERSION} (linux; x86_64)`);
    const windows = { process: { platform: "win32", arch: "x64", versions: { node: "22.0.0" } } };
    expect(systemComment(windows)).toBe("(windows; x86_64)");
  });

  test("Deno", () => {
    expect(clientHeader({ Deno: { build: { os: "linux", arch: "aarch64" } } })).toBe(`js/${VERSION} (linux; arm64)`);
  });

  test("browsers: no system", () => {
    expect(clientHeader({})).toBe(`js/${VERSION}`);
    // a bundler's process shim without versions.node is no runtime
    expect(clientHeader({ process: { platform: "browser" } })).toBe(`js/${VERSION}`);
  });
});
