# Downloaded question packs (format version 1)

In the Android app, finish or discard an existing session, tap **Import downloaded JSON pack**, select a downloaded file, check its title/question count, and confirm import. Then choose that pack under **Question library**. It supports the same practice, timed exam, solution, bookmark and revision modes as the built-in bank. Mock exams use up to 50 unique families available in the selected pack and retain a 90-minute limit.

The Android system file picker reads one user-selected file. No broad storage permission or internet permission is required. Imported files are copied into private app storage, so moving the original download does not break the library. Removing a pack retains progress; reimporting with the same IDs reconnects that progress. Updates replace the entire pack by pack_id; publishers must preserve question IDs and answer semantics for unchanged questions. Do not recycle old IDs for different questions. Session changes are blocked during a saved practice/exam session.

## Format

See `examples/sample-question-pack.json` for a valid three-question test pack. Download the raw JSON, not GitHub's HTML file view. Arbitrary PDFs, VCE files, ZIP archives, and exports from third-party exam vendors are not supported.

```json
{
  "format_version": 1,
  "pack_id": "publisher-maths-2026",
  "title": "Mathematics revision pack",
  "version": "1.0.0",
  "questions": [{
    "id": "Q001",
    "family_id": "addition",
    "section": "A. Number",
    "topic": "Addition",
    "syllabus_scope": "unmarked",
    "question": "Evaluate 2 + 3.",
    "options": {"A":"4", "B":"5", "C":"6", "D":"7"},
    "correct_option": "B",
    "solution_steps": [{"step":1, "text":"Add the two numbers: 2 + 3 = 5."}]
  }]
}
```

Pack, question and family IDs use 1-64 letters, digits, dots, underscores or hyphens, starting with a letter/digit; builtin is reserved. IDs are namespaced as pack_id/question_id and pack_id/family_id on import, protecting built-in content and other packs from collisions. Options must be exactly A-D, nonempty and distinct. Answer keys must point to an option. Solution steps must number consecutively from 1. The schema limits text lengths; files are at most 5 MB, packs contain 1-5,000 questions, the library contains at most 20 downloaded packs and 20 MB total downloaded JSON. File writes are atomic and validation finishes before installation.

## Subscription integration boundary

This version implements offline imports. It does **not** process payments, authenticate subscribers, verify purchases/signatures, enforce expiry, or prevent file sharing. Possessing an importable file is not proof of subscription. Do not sell this as a secured subscription system yet.

A later subscription service should authenticate the learner, verify store/provider purchases on a server, resolve content entitlements, and issue a signed download manifest. The app should verify issuer signature, pack hash, permitted user/device and offline access period. Private signing keys and payment secrets belong on the server, never in this repository or APK. Establish a renewal/offline-grace policy before enforcing expiry. Distribute only content you own or have licensed.

## Upgrade testing

Use version 0.2.0 (versionCode 2). Install over the earlier app to preserve progress if the signing key matches. GitHub debug keys may differ between fresh runners, so Android may reject an in-place update. Do not uninstall if you need to preserve learning data; stable release signing and a progress export feature are separate follow-up work. Phone tests should cover wrong/red, correct/blue, unsubmitted mock neutrality, pack preview/import, invalid JSON, duplicate IDs, process restart, selected-pack practice, removing/reimporting a pack, and saved sessions.
