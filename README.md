# WASSCE School

Native Android mathematics practice app with 1,000 original multiple-choice questions and 3,030 numbered solution steps. Built with Kotlin and Jetpack Compose.

## First version

- Offline topic and section practice, up to 20 questions per session.
- 50-question, 90-minute mock exams; answers are withheld until submission.
- Correct answers with solutions revealed one step at a time or all together.
- Bookmarks, retry mistakes, and local attempt/correct totals.
- Saved sessions survive app restarts. Timed exams continue counting down while away.
- One question per skill family per session to reduce repetitive variants.
- Optional country-marked topics; 803 unmarked and 197 marked questions.

This is original practice material, not official WAEC past questions. Country-symbol eligibility and question quality require local teacher review before publication. The bank reflects the uploaded syllabus, not a claim that it is the latest edition. Drawings, plots and interactive construction exercises are not included.

## Build

Requires JDK 17, Gradle 8.9, and Android SDK 35. Open the project in Android Studio, install the SDK if prompted, and sync Gradle. The project currently uses an installed Gradle distribution; no binary Gradle wrapper is committed.

```sh
python3 scripts/validate_bank.py
gradle testDebugUnitTest lintDebug assembleDebug
```

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`.

The **Android debug APK** GitHub Actions workflow performs these checks and uploads the APK as `WASSCE-School-debug`. Open the repository's Actions tab, select a successful run, and download its artifact. This is a test build; Play Store release signing is not configured.

## Data and privacy

The bundled JSON contains stable question IDs, four option keys, answer keys, family IDs, scope flags, and ordered solution_steps. Answers are always compared using original option keys. All 1,000 questions are bundled and need no network access. Progress, bookmarks and sessions use private SharedPreferences; there is no server, advertising SDK, login, or internet permission. Uninstalling the app removes progress; Android backup is disabled. The SQLite seed prepared in the content package is not needed by this version.

## Validation status

The content contract is validated by the included Python script. JVM tests exercise session selection. An Android build must pass CI, followed by phone testing, before treating the app as ready. Remaining checks include screen readers, large fonts, process death, exam expiry, and install/upgrade testing. Source code has no declared open-source license yet.

## Version 0.2.0

Checked wrong options now use red text/borders and a pale red background; correct options use blue. Text labels and symbols supplement color. Mock exams reveal feedback only after submission.

Import WASSCE School JSON packs from Downloads, preview before installation, choose a pack to study, and remove downloaded packs from the library. See [Question pack format](docs/QUESTION_PACKS.md) and [sample download](examples/sample-question-pack.json). Imports persist offline and are validated before atomic installation. Subscriptions, payment verification and signed entitlements are not implemented by this importer.
