# WASSCE School website

Student learning portal and private publishing workspace, built with React, TypeScript, Vinext and Cloudflare D1. Companion Android source lives in the parent WASSCE-School repository.

## Implemented

- Dashboard with 1,000 real core mathematics questions and 3,030 solution steps.
- Area/topic/pack search, bookmarks and mistake revision.
- Practice sessions with red incorrect and blue correct answers, plus incremental solution reveal.
- 50-question, 90-minute mock exams with unique families, navigation, saved browser sessions and expiry submission.
- Anonymous browser progress and authenticated account progress; answer correctness is calculated on the server for signed-in submissions. Session/question idempotency prevents duplicate scoring.
- Android test-app download and Android-compatible JSON core/published-pack downloads.
- Private publisher setup, strict JSON pack validation, review preview, database-backed drafts, publish/unpublish, and a single catalog for practice and downloads.

## Identity and publication

The initial deployment is owner-private for review. Hosted browser sign-in uses the platform's ChatGPT identity; no passwords are stored. Student records are scoped by authenticated user ID. Publishing setup is closed unless `SCHOOL_ADMIN_EMAIL` is set to the owner's ChatGPT account email. Set it, deploy, sign in with that account and click Publishing → Enable publishing; the server stores that account's user ID as the administrator, and setup is refused once an administrator exists or for any other account. You may then remove `SCHOOL_ADMIN_EMAIL`. All publishing routes independently check the stored administrator ID. The old `SCHOOL_PRIVATE_ADMIN` flag is no longer read.

This version does not process payments, verify paid subscription entitlements, enforce pack expiry or sync an Android account. The current Android app imports downloaded JSON manually. Membership clearly displays free core access and does not collect payment details. Browser progress from anonymous use is separate from signed-in account progress; it is not automatically merged. Timed mocks are practice simulations, not proctored or tamper-proof exams. Private pages and API data are not cached for other users.

## Content

`lib/core.json` contains the same question data as Android's bundled bank, with original IDs. `lib/questions.ts` supplies shared pack validation and question selection. The uploaded syllabus's country-symbol legend was not reliable; country-marked topics are excluded from mixed practice by default and can be enabled explicitly. Questions require teacher review before a public educational release. Content is original practice material, not official WAEC past papers.

Publishing limits: 750 KB JSON, 1,000 questions per uploaded pack; options A-D and numbered nonempty solution steps required. Built-in IDs cannot be overwritten. Downloaded packs namespace question and family IDs on the website to preserve progress isolation; the Android importer applies the same namespace pattern.

## Development and checks

Requires Node 22.13+ and the installed Sites runtime/starter helpers. Install dependencies using the supported Sites installer. Run:

```
node tests/check.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

The hosted production database is declared as `d1: DB` in `.openai/hosting.json`; schema and immutable generated migrations are under `db/` and `drizzle/`. SQL migrations contain schema only. The core bank is read from source; uploaded packs and learner records are runtime data, never committed to Git. Use the starter's documented local D1 migration workflow before previewing. Publishing through Sites applies production migrations automatically. Do not commit node_modules, runtime caches, database files, local secrets, credentials or build archives.

A site-source snapshot is also kept under `web/` in https://github.com/baimasonga/WASSCE-School. Sites owns its deployment repository and identity. Keep source changes in both checkouts aligned; do not deploy an archive made from different source.

## Multi-subject catalog revision

The platform now uses country → exam year/series → subject → section/topic. The initial catalog has 38 entries across three country profiles. Only Mathematics currently has a populated bank; other subjects show topic outlines awaiting syllabus review and content. See [Country and subject evidence](docs/COUNTRIES_SUBJECTS_TOPICS.md). Format 2 packs carry subject/country/year/series metadata; old format 1 packs retain Mathematics defaults. Android 0.3.0 supports the same catalog and import format. Exam selection never mixes subjects. The Mathematics timing preset is not presented as an official paper format for other subjects.
