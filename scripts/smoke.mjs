// Plain JavaScript check of the built package as a user gets it: CI packs it, installs the tarball into an empty
// project and runs this file there with Node 20, 22, 24 and Deno. Locally (after `bun run build`) the import resolves
// to dist/ through the package's own exports.
//   node scripts/smoke.mjs
//   deno run scripts/smoke.mjs

import { Quak, QuakError, VERSION } from "@quak/js";

const seen = [];
const fetch = async (request) => {
  seen.push(request);
  if (new URL(request.url).pathname === "/v1/speakers") {
    return new Response(JSON.stringify({ error: { code: "ERROR_INVALID_API_KEY", message: "invalid key" } }), {
      status: 401,
      headers: { "Content-Type": "application/json", "X-Request-Id": "smoke" },
    });
  }
  return new Response(JSON.stringify({ data: { id: "p1" } }), {
    status: 200,
    headers: { "Content-Type": "application/json", "X-Quak-Credits": "7" },
  });
};

function check(condition, message) {
  if (!condition) {
    throw new Error(`smoke: ${message}`);
  }
}

const quak = new Quak({ apiKey: "qk_key_smoke", baseUrl: "https://api.test", fetch });

const text = await quak.play.text({ text: "Hi" });
check(text.data.id === "p1", "play.text returns the body");
check(quak.credits === 7, "credits from X-Quak-Credits");
check(seen[0].headers.get("x-quak-client").startsWith(`js/${VERSION}`), "X-Quak-Client");

await quak.play.file({ file: new Uint8Array([1, 2, 3]), filename: "a.mp3", to: ["kitchen"] });
const form = await seen[1].formData();
check(form.get("to") === "kitchen", "multipart field");
check(form.get("file").size === 3, "multipart file");

const error = await quak.speakers.list().catch((error) => error);
check(error instanceof QuakError && error.status === 401 && error.requestId === "smoke", "QuakError");

console.log(`smoke ok: ${seen[0].headers.get("x-quak-client")}`);
