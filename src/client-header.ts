import { VERSION } from "./version.js";

// The API records which client sent a play from the header `X-Quak-Client: <name>/<version> (<os>; <arch>)`.
// Browsers cannot set the User-Agent, so this library always sends the header. The system comes from the runtime
// (Node, Bun, Deno); browsers send no comment. Never a host name.

const OS: Record<string, string> = { darwin: "macos", win32: "windows", linux: "linux", android: "android" };
const ARCH: Record<string, string> = { arm64: "arm64", aarch64: "arm64", x64: "x86_64", x86_64: "x86_64" };

type RuntimeGlobals = {
  Deno?: { build?: { os?: string; arch?: string } };
  process?: { platform?: string; arch?: string; versions?: { node?: string } };
};

/** `(<os>; <arch>)` of the runtime, or undefined in browsers and unknown runtimes. */
export function systemComment(globals: RuntimeGlobals = globalThis as RuntimeGlobals): string | undefined {
  const deno = globals.Deno?.build;
  const node = globals.process?.versions?.node ? globals.process : undefined;
  const os = deno?.os ?? node?.platform;
  const arch = deno?.arch ?? node?.arch;
  if (!os || !arch) {
    return undefined;
  }
  return `(${OS[os] ?? os}; ${ARCH[arch] ?? arch})`;
}

/**
 * The value of `X-Quak-Client`: `js/<version>`, plus the system where the runtime tells it, like the CLI's
 * `quak-cli/<version> (<os>; <arch>)`. Plays sent through this package are recognisable by it. Quak's own clients built
 * on this package pass their `<name>/<version>` as `client` instead.
 */
export function clientHeader(globals?: RuntimeGlobals, client?: string): string {
  const system = systemComment(globals);
  const name = client?.trim() || `js/${VERSION}`;
  return system ? `${name} ${system}` : name;
}
