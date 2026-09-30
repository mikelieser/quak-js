# Changelog

All notable changes to `@quak/js`. 0.9.x follows the API while it still changes.

## Unreleased

- OpenAPI snapshot updated, **breaking in the API:** key scopes are `play` < `create` < `manage`, `read` is gone;
  uploading and saving clips needs `create`. The lookups need `play`
- Plays carry `canReplay` and `canSave`; new error codes `ERROR_NO_TESTERS` and `ERROR_NOT_VOTED`

## 0.9.3 - 2026-09-30

- OpenAPI snapshot updated: new limits (text 1,000 characters, talk and talk live 180 s, file, processed url and clips
  180 s with 10 MB uploads), `limits` on the workspace (`GET /v1/workspace` on the raw client)
- OpenAPI snapshot updated: upload tickets (`POST /v1/upload-tickets`, a single-use `qk_upt_…` key for browser uploads,
  usable as `apiKey` for `play.file`, `play.talk` and `POST /v1/clips`), resending invites, the profile name, the error
  codes `ERROR_INVITE_ACCEPTED` and `ERROR_TOO_MANY_REQUESTS`

## 0.9.2 - 2026-09-29

- Internal option `client` for Quak's own clients built on this package: their `<name>/<version>` in `X-Quak-Client`
  instead of `js/<version>`

## 0.9.1 - 2026-09-29

- Package description names quak.party and text-to-speech
- OpenAPI snapshot updated: `POST /v1/workspaces` documents the new limits (20 own workspaces, 100 starting credits)

## 0.9.0 - 2026-09-29

First release of the new client for the Quak API v1 routes (`/v1/...`).

- `new Quak({ apiKey, fetch, headers })`
- Plays in the order text, talk, sound, clip, file, url: `quak.play.text()` … `quak.play.url()`, uploads as multipart
- `quak.stop()`, history with `quak.plays.list()`, `.get()`, `.last()`, `.stop()`
- Lookups for everything a play can name: `quak.speakers.list()`, `quak.voices.list()`,
  `.languages()`, `.locales()`, `.models()`, `quak.sounds.list()`, `.tags()`, `quak.clips.list()`,
  `quak.effects.list()`; management routes stay on the raw client
- README with the parameters of every play kind, generated from the OpenAPI schema (`bun docs`)
- Credit balance from `X-Quak-Credits` in `quak.credits`
- `QuakError` with `status`, `code`, `details`, `field` and `requestId`, network failures as `ERROR_NETWORK`
- `X-Quak-Client: js/<version> (<os>; <arch>)` on every request, `js/<version>` in browsers
- Strict types from the API schema: play params with required fields and enums (effects, ambiences), response enums
  (play type and status), `QuakError.code` as `ErrorCode` with all API error codes
- Typed raw client `quak.api` for every route, `unwrap()` for its results, all types generated from the OpenAPI schema
