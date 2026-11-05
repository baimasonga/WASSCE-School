# WASSCE School website

Free WASSCE practice for Sierra Leone, Liberia and The Gambia: the 1,000-question mathematics bank with worked solutions, smart practice with spaced review, timed mock exams, progress insights, the virtual Chemistry lab, and downloads for the Android app.

**Deploying:** see [DEPLOY.md](DEPLOY.md).

## How it's built

- **Front end** (`src/`): React 19, React Router and Tailwind CSS, built with Vite. Works without an account (progress saved in the browser); with an account, progress syncs and earlier browser progress is imported on first sign-in.
- **API** (`worker/`): a Cloudflare Worker using Hono. It verifies Supabase sign-in tokens with Supabase's public keys (`jose`), grades every answer on the server, and stores data in Cloudflare D1 (`migrations/`).
- **Shared logic** (`shared/`): the question bank, subject catalogue, pack validation and the learning logic (spaced review, smart selection, weak topics, streaks, scoring). It mirrors the Android app's `Insights.kt`, so both behave the same.
- **Chemistry lab** (`public/chemistry-lab/`): the existing simulator and teacher dashboard, served unchanged.

## API

| Method & path | Who | What |
|---|---|---|
| `GET /api/catalog` | anyone | Published packs and their questions (the core bank ships with the app). |
| `GET /api/packs/:id.json` | anyone | Android-compatible pack download, including `wassce-mathematics-core`. |
| `GET /api/me` | anyone | The signed-in user and whether they can publish. |
| `GET /api/progress` | signed in | Answers, saved questions and session history. |
| `POST /api/attempts` | signed in | Record answers (server-graded; each session scores a question once). |
| `POST /api/sessions` | signed in | Finish a session: graded on the server, summary stored once. |
| `POST /api/bookmarks` | signed in | Save or unsave a question. |
| `DELETE /api/me/data` | signed in | Delete all of the user's learning data. |
| `/api/admin/packs…` | admins | Upload (validated, saved as draft), publish/unpublish, delete. |

## Security

- **Signed-in requests:** these carry a bearer token. There are no cookies, so no cross-site request forgery.
- **Request size:** bodies are size-limited.
- **Database:** all database queries are parameterised.
- **Admins:** publishing is limited to `ADMIN_EMAILS`.
- **Static pages:** they are sent with a strict Content-Security-Policy and standard security headers (`public/_headers`). The Chemistry lab gets its own, looser policy because it uses inline scripts.

## Checks

```sh
npx tsc -b     # typecheck
npm test       # API tests against an in-memory SQLite stand-in for D1, plus learning-logic tests
```
