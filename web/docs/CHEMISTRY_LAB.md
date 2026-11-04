# Chemistry simulator integration

The user-provided wassce-lab-site.zip is served at /chemistry-lab/index.html, with its CSS and scripts isolated from the React school application. Open it from the Chemistry subject page or the Chemistry lab resource menu. The lab also embeds in the resource page and has a full-screen option. Both lab pages link back to /?subject=chemistry&view=Topics.

The simulation engine, mission data, practical exam and teacher dashboard are preserved. The supplied publishable Supabase configuration is retained; no service key or new backend permissions were introduced. Google Fonts and the existing Supabase JS CDN require network access. Existing class RPCs and teacher authentication remain on the lab backend, separate from Sites identity and D1 question progress. No live student records or teacher accounts were created to test this integration.

Teacher email confirmation/reset callbacks must include https://wassce-school.medbangz.chatgpt.site/chemistry-lab/teacher.html in the existing Supabase project's redirect allowlist before using those flows. Backend policies and RPCs are not included in the uploaded ZIP and were not independently verified.

Mission topic outlines and mock marking are supplied practice content, not a verified guarantee of complete WAEC syllabus coverage. Android does not embed this web simulator in this revision.
