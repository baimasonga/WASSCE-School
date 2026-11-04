# Android Chemistry lab (v0.4.0)

Open **Chemistry lab • offline simulator** from the study home screen. The supplied simulation engine, data, apparatus, missions, notebook and timed practical exam ship inside the APK. No download or network permission is required. Rotate the phone to landscape for more bench space; rotation retains the live experiment. The native School button and Android Back button ask before leaving.

An experiment is not saved across closing the lab or process termination. The selected mission and last 30 completed mock-exam summaries use WebView local storage. Lab results are separate from question-practice progress. If a question mock is paused, its clock continues while the lab is open.

Google Fonts, cloud scripts, Supabase configuration and the teacher dashboard are excluded from the offline bundle. **Online classes** opens the hosted lab in the phone's browser (internet and current website access required). Teacher login and class submissions remain website features; app lab results do not sync there automatically.

The WebView uses AndroidX WebViewAssetLoader on its reserved HTTPS origin, with requests restricted to the chemistry-lab asset directory. File/content access and network loads are disabled. No JavaScript-to-native bridge is installed. JavaScript is required for the bundled simulator. The application still requests no internet permission.

Checks: asset integrity validation, JavaScript syntax, URL-policy unit tests, existing question-bank tests, Android lint and debug build. No physical Android device or emulator was available in the build environment; drag gestures, rotation, background timers and offline cold start still require phone testing.
